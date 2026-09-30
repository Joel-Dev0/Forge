import { app, session, ipcMain, BrowserWindow, webContents } from "electron";
import path from "node:path";
import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface InstalledExtensionInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  path: string;
  manifestPermissions: string[];
  manifestVersion?: number;
  action?: any;
}

interface ExtensionRecord {
  info: InstalledExtensionInfo;
  manifest: any;
}

// In-memory registry of all loaded extensions (id → record)
const loadedExtensions = new Map<string, ExtensionRecord>();

// Track open popup windows per extension id
const popupWindows = new Map<string, BrowserWindow>();

// All known named partitions that extensions should be loaded into
const NAMED_PARTITIONS = [
  "persist:forge",
  "persist:session_personal",
  "persist:session_work",
  "persist:session_admin",
  "persist:session_finance",
];

// Runtime registry of all dynamically-created partition names (populated by session-created hook)
const runtimePartitions = new Set<string>(NAMED_PARTITIONS);

function getExtensionsStorageDir(): string {
  const dir = path.join(app.getPath("userData"), "installed_extensions");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ---------------------------------------------------------------------------
// Fix #2: Load extension into ALL known session partitions
// ---------------------------------------------------------------------------
async function loadExtensionIntoAllSessions(extDir: string): Promise<void> {
  // Always include default session
  try {
    await session.defaultSession.loadExtension(extDir, { allowFileAccess: true });
  } catch (err: any) {
    // MV3 extensions fail here — log but don't abort
    if (!err?.message?.includes("manifest_version 3")) {
      console.warn(`[ExtensionManager] defaultSession load notice:`, err?.message);
    }
  }

  // Load into every named partition
  for (const partName of runtimePartitions) {
    try {
      const ses = session.fromPartition(partName);
      await ses.loadExtension(extDir, { allowFileAccess: true });
    } catch (err: any) {
      if (!err?.message?.includes("manifest_version 3")) {
        console.warn(`[ExtensionManager] ${partName} load notice:`, err?.message);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fix #2: Remove extension from ALL known session partitions
// ---------------------------------------------------------------------------
function removeExtensionFromAllSessions(extId: string): void {
  try { session.defaultSession.removeExtension(extId); } catch {}
  for (const partName of runtimePartitions) {
    try {
      const ses = session.fromPartition(partName);
      ses.removeExtension(extId);
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Fix #3: Content Script Injection Engine
// Matches URL patterns from manifest content_scripts and injects JS/CSS
// into webview WebContents after each page load.
// ---------------------------------------------------------------------------
function matchesContentScriptPattern(url: string, pattern: string): boolean {
  try {
    if (pattern === "<all_urls>") return true;
    // Convert Chrome match pattern to regex:
    // https://*.example.com/*  →  /^https:\/\/[^/]*\.example\.com\/.*/
    let rx = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape regex special chars except * ?
      .replace(/\\\*/g, ".*")               // * → .*
      .replace(/\\\?/g, ".");              // ? → .
    // Handle scheme wildcards: chrome match "http://*" or "*://*"
    rx = rx.replace(/^\*:\/\//, "https?://");
    return new RegExp(`^${rx}$`).test(url);
  } catch {
    return false;
  }
}

function injectContentScriptsIntoWebContents(contents: Electron.WebContents): void {
  if (loadedExtensions.size === 0) return;

  const url = contents.getURL();
  if (!url || url === "about:blank" || url.startsWith("devtools:") || url.startsWith("chrome-extension:")) return;

  for (const { manifest, info } of loadedExtensions.values()) {
    const contentScripts: any[] = manifest.content_scripts || [];
    for (const cs of contentScripts) {
      const matches: string[] = cs.matches || [];
      const excludeMatches: string[] = cs.exclude_matches || [];

      const shouldInject =
        matches.some((p: string) => matchesContentScriptPattern(url, p)) &&
        !excludeMatches.some((p: string) => matchesContentScriptPattern(url, p));

      if (!shouldInject) continue;

      // Inject CSS files
      for (const cssFile of cs.css || []) {
        try {
          const cssPath = path.join(info.path, cssFile);
          if (fs.existsSync(cssPath)) {
            const css = fs.readFileSync(cssPath, "utf-8");
            contents.insertCSS(css).catch(() => {});
          }
        } catch {}
      }

      // Inject JS files
      for (const jsFile of cs.js || []) {
        try {
          const jsPath = path.join(info.path, jsFile);
          if (fs.existsSync(jsPath)) {
            const code = fs.readFileSync(jsPath, "utf-8");
            const runAt = cs.run_at || "document_idle";
            // Wrap in IIFE with chrome runtime stub so basic extensions don't throw
            const wrapped = `
(function() {
  if (!window.chrome) window.chrome = {};
  if (!window.chrome.runtime) window.chrome.runtime = {
    id: "${info.id}",
    getURL: function(p) { return "chrome-extension://${info.id}/" + p; },
    sendMessage: function() {},
    onMessage: { addListener: function() {}, removeListener: function() {} },
    lastError: null
  };
  if (!window.chrome.storage) window.chrome.storage = {
    local: { get: function(k,cb) { if(cb)cb({}); return Promise.resolve({}); }, set: function(k,cb) { if(cb)cb(); return Promise.resolve(); }, remove: function(k,cb) { if(cb)cb(); return Promise.resolve(); } },
    sync: { get: function(k,cb) { if(cb)cb({}); return Promise.resolve({}); }, set: function(k,cb) { if(cb)cb(); return Promise.resolve(); }, remove: function(k,cb) { if(cb)cb(); return Promise.resolve(); } },
    onChanged: { addListener: function() {}, removeListener: function() {} }
  };
  try {
    ${code}
  } catch(e) { /* content script error isolated */ }
})();`;
            if (runAt === "document_start") {
              // Inject immediately (page may still be loading)
              contents.executeJavaScript(wrapped, true).catch(() => {});
            } else {
              // document_idle / document_end — inject after DOM ready
              contents.executeJavaScript(wrapped).catch(() => {});
            }
          }
        } catch {}
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fix #4: Extension Popup Renderer
// Opens extension popup HTML in a small floating BrowserWindow
// ---------------------------------------------------------------------------
function openExtensionPopup(extId: string, popupFile: string, extPath: string): void {
  // Close any existing popup for this extension
  const existing = popupWindows.get(extId);
  if (existing && !existing.isDestroyed()) {
    existing.close();
    popupWindows.delete(extId);
    return;
  }

  const popupPath = path.join(extPath, popupFile);
  if (!fs.existsSync(popupPath)) return;

  const focusedWin = BrowserWindow.getFocusedWindow();
  const winBounds = focusedWin?.getBounds() || { x: 0, y: 0, width: 1400, height: 900 };

  const popup = new BrowserWindow({
    width: 380,
    height: 540,
    x: winBounds.x + winBounds.width - 400,
    y: winBounds.y + 80,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#1e1e2e",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  popup.once("ready-to-show", () => {
    popup.show();
    popup.focus();
  });

  popup.on("closed", () => {
    popupWindows.delete(extId);
  });

  // Close popup if it loses focus (behaves like a real browser extension popup)
  popup.on("blur", () => {
    if (!popup.isDestroyed()) popup.close();
  });

  popup.loadFile(popupPath);
  popupWindows.set(extId, popup);
}

// ---------------------------------------------------------------------------
// Shared helper: resolve icon as base64 data URL
// ---------------------------------------------------------------------------
function resolveIconDataUrl(manifest: any, extDir: string): string | undefined {
  const icons = manifest.icons || manifest.action?.default_icon || manifest.browser_action?.default_icon;
  if (!icons) return undefined;

  let iconRelativePath = "";
  if (typeof icons === "string") {
    iconRelativePath = icons;
  } else if (typeof icons === "object") {
    iconRelativePath = icons["128"] || icons["64"] || icons["48"] || icons["32"] || icons["16"] || (Object.values(icons)[0] as string);
  }
  if (!iconRelativePath) return undefined;

  const fullIconPath = path.join(extDir, iconRelativePath);
  if (!fs.existsSync(fullIconPath)) return undefined;

  const ext = path.extname(fullIconPath).slice(1) || "png";
  const b64 = fs.readFileSync(fullIconPath).toString("base64");
  return `data:image/${ext};base64,${b64}`;
}

// ---------------------------------------------------------------------------
// Core install function
// ---------------------------------------------------------------------------
export async function installExtensionFromChromeWebStore(
  extId: string,
  webStoreUrl?: string
): Promise<{ success: boolean; message: string; extension?: InstalledExtensionInfo }> {
  const cleanedId = extId.trim().toLowerCase();
  if (!/^[a-z]{32}$/.test(cleanedId)) {
    return { success: false, message: `Invalid Chrome extension ID: "${extId}"` };
  }

  const baseDir = getExtensionsStorageDir();
  const targetDir = path.join(baseDir, cleanedId);
  const tempZipPath = path.join(baseDir, `${cleanedId}.zip`);

  try {
    const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&os=win&arch=x86-64&os_arch=x86-64&nacl_arch=x86-64&prod=chromecrx&prodchannel=&prodversion=130.0.0.0&lang=en-US&acceptformat=crx3,crx2&x=id%3D${cleanedId}%26installsource%3Dondemand%26uc`;

    console.log(`[ExtensionManager] Downloading CRX for ${cleanedId}...`);
    const res = await fetch(crxUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Referer": "https://chromewebstore.google.com/",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return {
        success: false,
        message: `Failed to download extension package from Chrome Web Store (HTTP ${res.status}).`,
      };
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    if (buffer.length < 32) {
      return { success: false, message: "Downloaded file is empty or corrupted." };
    }

    // Locate the ZIP header (0x50 0x4B 0x03 0x04) inside the CRX container
    let zipStartOffset = -1;
    for (let i = 0; i < Math.min(buffer.length - 4, 100000); i++) {
      if (
        buffer[i] === 0x50 &&
        buffer[i + 1] === 0x4b &&
        buffer[i + 2] === 0x03 &&
        buffer[i + 3] === 0x04
      ) {
        zipStartOffset = i;
        break;
      }
    }

    if (zipStartOffset === -1) {
      return { success: false, message: "Could not locate valid ZIP payload in extension package." };
    }

    const zipBuffer = buffer.subarray(zipStartOffset);
    fs.writeFileSync(tempZipPath, zipBuffer);

    if (fs.existsSync(targetDir)) {
      try { fs.rmSync(targetDir, { recursive: true, force: true }); } catch {}
    }
    fs.mkdirSync(targetDir, { recursive: true });

    try {
      await execAsync(`tar -xf "${tempZipPath}" -C "${targetDir}"`);
    } catch {
      await execAsync(
        `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tempZipPath}' -DestinationPath '${targetDir}' -Force"`
      );
    } finally {
      try { if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath); } catch {}
    }

    const manifestPath = path.join(targetDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      return { success: false, message: "Extraction failed: manifest.json not found." };
    }

    let manifest: any = {};
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {
      return { success: false, message: "Failed to parse extension manifest.json." };
    }

    const manifestVersion: number = manifest.manifest_version || 2;

    // Fix #1: Clear MV3 warning to user instead of silent failure
    if (manifestVersion >= 3) {
      console.warn(`[ExtensionManager] "${manifest.name}" uses Manifest V3. Content scripts will be injected manually via Forge's content script engine. Service workers and declarativeNetRequest are not supported.`);
    }

    const iconDataUrl = resolveIconDataUrl(manifest, targetDir);

    // Fix #2: Load into ALL session partitions
    await loadExtensionIntoAllSessions(targetDir);

    const extInfo: InstalledExtensionInfo = {
      id: cleanedId,
      name: manifest.name || "Chrome Extension",
      version: manifest.version || "1.0.0",
      description: manifest.description || `Installed directly from Chrome Web Store (${cleanedId})`,
      author: manifest.author || "Chrome Web Store Developer",
      icon: iconDataUrl,
      path: targetDir,
      manifestPermissions: manifest.permissions || [],
      manifestVersion,
      action: manifest.action || manifest.browser_action,
    };

    // Register in the in-memory registry for content script injection
    loadedExtensions.set(cleanedId, { info: extInfo, manifest });

    console.log(`[ExtensionManager] Installed "${extInfo.name}" (MV${manifestVersion}) into all sessions.`);
    return {
      success: true,
      message: `Successfully installed "${extInfo.name}"!`,
      extension: extInfo,
    };
  } catch (err: any) {
    console.error("[ExtensionManager] Installation error:", err);
    return { success: false, message: `Installation failed: ${err?.message || "Unknown error"}` };
  }
}

// ---------------------------------------------------------------------------
// Uninstall — Fix #2: Remove from all sessions
// ---------------------------------------------------------------------------
export async function uninstallExtension(extId: string): Promise<boolean> {
  const cleanedId = extId.trim().toLowerCase();
  try {
    removeExtensionFromAllSessions(cleanedId);
    loadedExtensions.delete(cleanedId);

    // Close popup if open
    const popup = popupWindows.get(cleanedId);
    if (popup && !popup.isDestroyed()) popup.close();
    popupWindows.delete(cleanedId);

    const targetDir = path.join(getExtensionsStorageDir(), cleanedId);
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    return true;
  } catch (err) {
    console.warn(`[ExtensionManager] Error uninstalling ${extId}:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Startup reload — Fix #2: Load into ALL sessions on startup
// ---------------------------------------------------------------------------
export async function listAndReloadInstalledExtensions(): Promise<InstalledExtensionInfo[]> {
  const baseDir = getExtensionsStorageDir();
  const results: InstalledExtensionInfo[] = [];

  if (!fs.existsSync(baseDir)) return results;

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const extDir = path.join(baseDir, entry.name);
    const manifestPath = path.join(extDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const extId = entry.name.toLowerCase();
      const manifestVersion: number = manifest.manifest_version || 2;

      // Fix #2: Load into all sessions
      await loadExtensionIntoAllSessions(extDir);

      const iconDataUrl = resolveIconDataUrl(manifest, extDir);

      const extInfo: InstalledExtensionInfo = {
        id: extId,
        name: manifest.name || "Chrome Extension",
        version: manifest.version || "1.0.0",
        description: manifest.description || "",
        author: manifest.author || "Chrome Web Store Developer",
        icon: iconDataUrl,
        path: extDir,
        manifestPermissions: manifest.permissions || [],
        manifestVersion,
        action: manifest.action || manifest.browser_action,
      };

      // Register for content script injection
      loadedExtensions.set(extId, { info: extInfo, manifest });

      results.push(extInfo);
    } catch (e) {
      console.warn(`[ExtensionManager] Error loading extension at ${extDir}:`, e);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Fix #2 + Fix #3: Hook into new session partitions and webview WebContents
// Called from main.ts after app is ready
// ---------------------------------------------------------------------------
export function attachExtensionHooksToWebContents(contents: Electron.WebContents): void {
  if (contents.getType() !== "webview") return;

  // Fix #3: Inject content scripts after each navigation
  const inject = () => {
    try {
      injectContentScriptsIntoWebContents(contents);
    } catch {}
  };

  contents.on("did-finish-load", inject);
  contents.on("dom-ready", inject);
}

// Fix #2: When a new session is created dynamically, load all extensions into it
export function onNewSessionPartition(partitionName: string, ses: Electron.Session): void {
  // Skip private/tor sessions — extensions should not run in those
  if (partitionName.startsWith("private_") || partitionName.startsWith("tor_")) return;
  if (!partitionName.startsWith("persist:")) return;

  runtimePartitions.add(partitionName);

  // Load all currently installed extensions into the new session
  for (const { info } of loadedExtensions.values()) {
    ses.loadExtension(info.path, { allowFileAccess: true }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Initialize all IPC handlers
// ---------------------------------------------------------------------------
export function initExtensionManager(): void {
  ipcMain.handle("extensions:install-from-cws", async (_event, payload: { extId: string; url?: string }) => {
    return installExtensionFromChromeWebStore(payload.extId, payload.url);
  });

  ipcMain.handle("extensions:uninstall", async (_event, payload: { extId: string }) => {
    return uninstallExtension(payload.extId);
  });

  ipcMain.handle("extensions:list-installed", async () => {
    return listAndReloadInstalledExtensions();
  });

  // Fix #4: IPC to open extension popup window
  ipcMain.handle("extensions:open-popup", (_event, payload: { extId: string }) => {
    const record = loadedExtensions.get(payload.extId?.toLowerCase());
    if (!record) return { success: false, message: "Extension not found" };

    const popupFile =
      record.manifest.action?.default_popup ||
      record.manifest.browser_action?.default_popup;

    if (!popupFile) return { success: false, message: "This extension has no popup UI" };

    try {
      openExtensionPopup(record.info.id, popupFile, record.info.path);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || "Failed to open popup" };
    }
  });

  // Fix #4: IPC to check if extension has a popup
  ipcMain.handle("extensions:get-popup-info", (_event, payload: { extId: string }) => {
    const record = loadedExtensions.get(payload.extId?.toLowerCase());
    if (!record) return null;
    const popupFile =
      record.manifest.action?.default_popup ||
      record.manifest.browser_action?.default_popup;
    return { hasPopup: Boolean(popupFile), popupFile: popupFile || null };
  });

  // Startup: load all previously installed extensions
  listAndReloadInstalledExtensions().catch((err) => {
    console.warn("[ExtensionManager] Initial reload notice:", err);
  });
}
