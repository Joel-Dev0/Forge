import { app, session, ipcMain, BrowserWindow, webContents } from "electron";
import path from "node:path";
import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { diagnoseExtension, getDiagnosticReport, getAllDiagnosticReports, getDiagnosticSummary, clearDiagnosticReport } from "./extensionDiagnostics.js";
import { ExtensionSessionBridge } from "./extensionSessionBridge.js";
import { ExtensionTabBridge } from "./extensionTabBridge.js";
import { ExtensionMessageBridge } from "./extensionMessageBridge.js";
import { ExtensionActionBridge } from "./extensionActionBridge.js";
import { ExtensionServiceWorkerManager } from "./extensionServiceWorkerManager.js";

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
// Load & Remove extensions across all eligible session partitions
// Delegates to ExtensionSessionBridge which tracks active sessions
// ---------------------------------------------------------------------------
async function loadExtensionIntoAllSessions(extDir: string, extId?: string): Promise<Map<string, { success: boolean; error?: string }>> {
  const sessionBridge = ExtensionSessionBridge.getInstance();
  return sessionBridge.loadExtensionIntoAll(extDir, extId || path.basename(extDir));
}

function removeExtensionFromAllSessions(extId: string): void {
  const sessionBridge = ExtensionSessionBridge.getInstance();
  sessionBridge.removeExtensionFromAll(extId);
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

function injectContentScriptsIntoWebContents(contents: Electron.WebContents, stage: "did-finish-load" | "dom-ready" = "dom-ready"): void {
  if (loadedExtensions.size === 0) return;

  const url = contents.getURL();
  if (!url || url === "about:blank" || url.startsWith("devtools:") || url.startsWith("chrome-extension:")) return;

  const ses = contents.session;
  // Level 1 Native Engine Check:
  // If the extension was loaded natively into this session partition via ses.loadExtension(),
  // Electron 44 (Chromium 152) natively runs its content scripts in the isolated world.
  // We skip duplicate injection in that case so we do not double-run or collide with real window.chrome.
  const nativeExts = typeof ses?.getAllExtensions === "function" ? ses.getAllExtensions() : [];
  const nativeExtIds = new Set(nativeExts.map((e: any) => e.id.toLowerCase()));

  for (const { manifest, info } of loadedExtensions.values()) {
    // If natively handled by Chromium in this session, skip manual injection
    if (nativeExtIds.has(info.id.toLowerCase())) {
      continue;
    }

    // Level 3 Guard: Safe non-invasive fallback for contexts where native injection was bypassed
    const contentScripts: any[] = manifest.content_scripts || [];
    for (const cs of contentScripts) {
      const matches: string[] = cs.matches || [];
      const excludeMatches: string[] = cs.exclude_matches || [];

      const shouldInject =
        matches.some((p: string) => matchesContentScriptPattern(url, p)) &&
        !excludeMatches.some((p: string) => matchesContentScriptPattern(url, p));

      if (!shouldInject) continue;

      const runAt = cs.run_at || "document_idle";
      if (stage === "dom-ready" && runAt === "document_idle") continue;
      if (stage === "did-finish-load" && runAt !== "document_idle") continue;

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

      // Inject JS files with non-destructive Level 3 runtime guards
      for (const jsFile of cs.js || []) {
        try {
          const jsPath = path.join(info.path, jsFile);
          if (fs.existsSync(jsPath)) {
            const code = fs.readFileSync(jsPath, "utf-8");
            const wrapped = `
(function() {
  // Non-destructive fallback guard: Never overwrite genuine window.chrome if present
  window.chrome = window.chrome || {};
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      id: "${info.id}",
      getURL: function(p) { return "chrome-extension://${info.id}/" + (p || ""); },
      sendMessage: function(msg, cb) {
        try {
          // Target own origin only — never broadcast to cross-origin listeners
          window.postMessage({ __forge_ext_msg: true, extId: "${info.id}", message: msg }, window.location.origin || '*');
        } catch(e) {}
        if (typeof cb === "function") cb({ success: true });
        return Promise.resolve({ success: true });
      },
      onMessage: {
        addListener: function(fn) {
          window.addEventListener("message", function(e) {
            if (e.data && e.data.__forge_ext_resp && e.data.extId === "${info.id}") {
              fn(e.data.payload, { id: "${info.id}" }, function() {});
            }
          });
        },
        removeListener: function() {}
      },
      lastError: null
    };
  }
  if (!window.chrome.storage) {
    window.chrome.storage = {
      local: {
        get: function(k, cb) { if(cb) cb({}); return Promise.resolve({}); },
        set: function(k, cb) { if(cb) cb(); return Promise.resolve(); },
        remove: function(k, cb) { if(cb) cb(); return Promise.resolve(); }
      },
      sync: {
        get: function(k, cb) { if(cb) cb({}); return Promise.resolve({}); },
        set: function(k, cb) { if(cb) cb(); return Promise.resolve(); },
        remove: function(k, cb) { if(cb) cb(); return Promise.resolve(); }
      },
      onChanged: { addListener: function() {}, removeListener: function() {} }
    };
  }
  try {
    if (typeof window.trustedTypes !== "undefined" && window.trustedTypes && window.trustedTypes.defaultPolicy) {
      var _tt = window.trustedTypes;
      var _orig = _tt.createPolicy ? _tt.createPolicy.bind(_tt) : null;
      if (_orig) {
        _tt.createPolicy = function(n, r) {
          try { return _orig(n, r); } catch(err) {
            if (n === "default" && _tt.defaultPolicy) return _tt.defaultPolicy;
            throw err;
          };
        };
      }
    }
  } catch(e) {}
  try {
` + code + `
  } catch(e) {
    if (e && e.message && e.message.indexOf("Policy with name") !== -1 && e.message.indexOf("already exists") !== -1) {
      return;
    }
    console.warn("[Forge Ext Fallback] Error in content script for " + ${JSON.stringify(info.id)} + ":", e);
  }
})();`;
            contents.executeJavaScript(wrapped).catch(() => {});
          }
        } catch {}
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fix #4 + Phase 6: Extension Popup Renderer with Anchored Coordinates & Wake
// ---------------------------------------------------------------------------
function openExtensionPopup(
  extId: string,
  popupFile: string,
  extPath: string,
  anchorBounds?: { x: number; y: number; width: number; height: number }
): void {
  const cleanId = extId.toLowerCase();

  // Close any existing popup for this extension
  const existing = popupWindows.get(cleanId);
  if (existing && !existing.isDestroyed()) {
    existing.close();
    popupWindows.delete(cleanId);
    return;
  }

  const popupPath = path.join(extPath, popupFile);
  if (!fs.existsSync(popupPath)) return;

  // Phase 7: Wake the extension's service worker if it was idle/sleeping
  ExtensionServiceWorkerManager.getInstance().wakeWorker(cleanId).catch(() => {});

  const focusedWin = BrowserWindow.getFocusedWindow();
  const winBounds = focusedWin?.getBounds() || { x: 0, y: 0, width: 1400, height: 900 };

  const calculatedBounds = anchorBounds
    ? ExtensionActionBridge.getInstance().calculateAnchoredBounds(anchorBounds)
    : {
        width: 380,
        height: 540,
        x: winBounds.x + winBounds.width - 400,
        y: winBounds.y + 80,
      };

  // Determine the active tab's session partition so extension storage, cookies, and network state align
  const activeTab = ExtensionTabBridge.getInstance().getActiveTab();
  const partition = activeTab?.partition || "persist:forge";
  let popupSession = session.defaultSession;
  try {
    popupSession = session.fromPartition(partition);
  } catch {}

  const preloadCandidate1 = path.join(__dirname, "extensionPopupPreload.cjs");
  const preloadCandidate2 = path.join(__dirname, "extensions", "extensionPopupPreload.cjs");
  const preloadPath = fs.existsSync(preloadCandidate1) ? preloadCandidate1 : preloadCandidate2;

  const popup = new BrowserWindow({
    ...calculatedBounds,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#1e1e2e",
    webPreferences: {
      preload: fs.existsSync(preloadPath) ? preloadPath : undefined,
      nodeIntegration: false,
      contextIsolation: false,
      sandbox: false,
      session: popupSession,
    },
    show: false,
  });

  popup.once("ready-to-show", () => {
    popup.show();
    popup.focus();
  });

  popup.on("closed", () => {
    popupWindows.delete(cleanId);
  });

  // Close popup if it loses focus (standard browser extension popup behavior)
  popup.on("blur", () => {
    if (!popup.isDestroyed()) popup.close();
  });

  // Try loading via chrome-extension protocol first to preserve extension security context
  const cleanPopupFile = popupFile.replace(/^[/\\]+/, "");
  const chromeExtUrl = `chrome-extension://${cleanId}/${cleanPopupFile}`;

  popup.loadURL(chromeExtUrl).catch((err) => {
    console.log(`[ExtensionManager] Notice loading popup via chrome-extension:// (${err?.message}), falling back to file://`);
    if (!popup.isDestroyed()) {
      popup.loadFile(popupPath).catch((fileErr) => {
        console.warn(`[ExtensionManager] Failed to load extension popup:`, fileErr);
      });
    }
  });

  popupWindows.set(cleanId, popup);
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
    const iconDataUrl = resolveIconDataUrl(manifest, targetDir);

    // Multi-session loading & Diagnostics via ExtensionSessionBridge
    const loadResults = await loadExtensionIntoAllSessions(targetDir, cleanedId);
    const diagnosticReport = diagnoseExtension(targetDir, manifest, cleanedId, loadResults);

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

    // Phase 6: Register action in ExtensionActionBridge
    ExtensionActionBridge.getInstance().registerAction(cleanedId, manifest.action || manifest.browser_action);

    console.log(`[ExtensionManager] Installed "${extInfo.name}" (MV${manifestVersion}) — compatibility: ${diagnosticReport.compatibilityScore}% (${diagnosticReport.compatibilityTier})`);
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

    // Phase 6: Unregister action from ExtensionActionBridge
    ExtensionActionBridge.getInstance().unregisterAction(cleanedId);

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

      // Load into all eligible sessions & run diagnostics
      const loadResults = await loadExtensionIntoAllSessions(extDir, extId);
      diagnoseExtension(extDir, manifest, extId, loadResults);

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

      // Phase 6: Register action in ExtensionActionBridge
      ExtensionActionBridge.getInstance().registerAction(extId, manifest.action || manifest.browser_action);

      results.push(extInfo);
    } catch (e) {
      console.warn(`[ExtensionManager] Error loading extension at ${extDir}:`, e);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Fix #2 + Fix #3 + Phase 3: Hook into new session partitions and webview WebContents
// Called from main.ts after app is ready
// ---------------------------------------------------------------------------
export function attachExtensionHooksToWebContents(contents: Electron.WebContents): void {
  if (contents.getType() !== "webview") return;

  // Phase 3: Track tab in ExtensionTabBridge
  ExtensionTabBridge.getInstance().attachWebContents(contents);

  // Fix #3 + Phase 4: Non-destructive content scripts injection for fallback contexts
  const inject = (stage: "did-finish-load" | "dom-ready") => {
    try {
      injectContentScriptsIntoWebContents(contents, stage);
    } catch {}
  };

  contents.on("did-finish-load", () => inject("did-finish-load"));
  contents.on("dom-ready", () => inject("dom-ready"));
}

// Fix #2: When a new session is created dynamically, load all extensions into it
export function onNewSessionPartition(partitionName: string, ses: Electron.Session): void {
  // Skip private/tor sessions — extensions should not run in those
  if (partitionName.startsWith("private_") || partitionName.startsWith("tor_")) return;
  if (!partitionName.startsWith("persist:")) return;

  runtimePartitions.add(partitionName);

  // Register with session bridge for dynamic tracking
  const sessionBridge = ExtensionSessionBridge.getInstance();
  const installedExtDirs = new Map<string, string>();
  for (const { info } of loadedExtensions.values()) {
    installedExtDirs.set(info.id, info.path);
  }
  sessionBridge.onNewSessionCreated(partitionName, ses, installedExtDirs).catch(() => {});

  // Phase 7: Monitor service workers on the new partition
  ExtensionServiceWorkerManager.getInstance().monitorSession(ses, partitionName);

  // Load all currently installed extensions into the new session
  for (const { info } of loadedExtensions.values()) {
    ses.loadExtension(info.path, { allowFileAccess: true }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Initialize all IPC handlers
// ---------------------------------------------------------------------------
export function initExtensionManager(): void {
  // Phase 3, 5, 6, 7: Register all Extension subsystem bridges
  ExtensionTabBridge.getInstance().registerIPC();
  ExtensionMessageBridge.getInstance().registerIPC();
  ExtensionActionBridge.getInstance().registerIPC();
  ExtensionServiceWorkerManager.getInstance().registerIPC();

  // Phase 7: Monitor service workers on default session
  ExtensionServiceWorkerManager.getInstance().monitorSession(session.defaultSession, "default");

  // Register default session partitions with the session bridge
  const sessionBridge = ExtensionSessionBridge.getInstance();
  for (const partName of NAMED_PARTITIONS) {
    try {
      const ses = session.fromPartition(partName);
      sessionBridge.registerSession(partName, ses);
      ExtensionServiceWorkerManager.getInstance().monitorSession(ses, partName);
    } catch {}
  }

  ipcMain.handle("extensions:install-from-cws", async (_event, payload: { extId: string; url?: string }) => {
    return installExtensionFromChromeWebStore(payload.extId, payload.url);
  });

  ipcMain.handle("extensions:uninstall", async (_event, payload: { extId: string }) => {
    const result = await uninstallExtension(payload.extId);
    // Clean up diagnostic data for uninstalled extension
    clearDiagnosticReport(payload.extId?.trim().toLowerCase());
    return result;
  });

  ipcMain.handle("extensions:list-installed", async () => {
    return listAndReloadInstalledExtensions();
  });

  // Fix #4 + Phase 6: IPC to open extension popup window with optional anchor bounds
  ipcMain.handle("extensions:open-popup", async (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { success: false, message: "Invalid payload" };
    }
    const p = payload as Record<string, unknown>;
    const rawExtId = p["extId"];
    if (typeof rawExtId !== "string" || !/^[a-z][a-z0-9]{31}$/i.test(rawExtId)) {
      return { success: false, message: "Invalid extension ID" };
    }
    const cleanId = rawExtId.toLowerCase();
    const record = loadedExtensions.get(cleanId);
    if (!record) return { success: false, message: "Extension not found" };

    const popupFile =
      record.manifest.action?.default_popup ||
      record.manifest.browser_action?.default_popup;

    if (!popupFile) {
      // Phase 6: Extension without popup triggers action.onClicked
      try {
        const activeTab = ExtensionTabBridge.getInstance().getActiveTab();
        await ExtensionServiceWorkerManager.getInstance().wakeWorker(cleanId);
        await ExtensionMessageBridge.getInstance().sendMessageToExtension(cleanId, {
          __forge_action_click: true,
          tab: activeTab,
        });
        return { success: true, clicked: true };
      } catch {
        return { success: false, message: "This extension has no popup UI" };
      }
    }

    try {
      openExtensionPopup(record.info.id, popupFile, record.info.path, p["anchorBounds"] as any);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.message || "Failed to open popup" };
    }
  });

  // Dynamic popup window auto-resize handler
  ipcMain.on("extensions:popup:resize", (_event, payload: unknown) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
    const p = payload as Record<string, unknown>;

    const extId = p["extensionId"];
    if (typeof extId !== "string" || !/^[a-z][a-z0-9]{31}$/i.test(extId)) return;

    // Clamp dimensions server-side (defence-in-depth — preload also clamps)
    const rawW = p["width"];
    const rawH = p["height"];
    if (typeof rawW !== "number" || typeof rawH !== "number") return;
    if (!Number.isFinite(rawW) || !Number.isFinite(rawH)) return;

    const targetW = Math.round(Math.min(Math.max(rawW, 200), 800));
    const targetH = Math.round(Math.min(Math.max(rawH, 150), 600));

    const win = popupWindows.get(extId.toLowerCase());
    if (win && !win.isDestroyed()) {
      const [currentW, currentH] = win.getSize();
      if (Math.abs(currentW - targetW) > 8 || Math.abs(currentH - targetH) > 8) {
        win.setSize(targetW, targetH);
      }
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

  // ── Phase 1 Diagnostics IPC ──
  ipcMain.handle("extensions:diagnostics", async (_event, payload?: { extId?: string }) => {
    if (payload?.extId) {
      return getDiagnosticReport(payload.extId.toLowerCase()) || null;
    }
    return getAllDiagnosticReports();
  });

  ipcMain.handle("extensions:diagnostics-summary", async () => {
    return getDiagnosticSummary();
  });

  ipcMain.handle("extensions:session-bridge-summary", async () => {
    return sessionBridge.getSummary();
  });

  // Startup: load all previously installed extensions
  listAndReloadInstalledExtensions().catch((err) => {
    console.warn("[ExtensionManager] Initial reload notice:", err);
  });
}
