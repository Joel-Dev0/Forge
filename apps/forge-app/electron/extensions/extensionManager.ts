import { app, session, ipcMain } from "electron";
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
  action?: any;
}

function getExtensionsStorageDir(): string {
  const dir = path.join(app.getPath("userData"), "installed_extensions");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Downloads a Chrome extension CRX file from Google Chrome Web Store,
 * extracts the ZIP payload, unpacks it to disk, and loads it into Electron sessions.
 */
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

    // Locate the standard ZIP archive header (0x50 0x4B 0x03 0x04) inside the CRX package
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

    // Prepare target unpacked folder
    if (fs.existsSync(targetDir)) {
      try {
        fs.rmSync(targetDir, { recursive: true, force: true });
      } catch {}
    }
    fs.mkdirSync(targetDir, { recursive: true });

    // Extract ZIP archive
    try {
      // Windows 10/11 includes tar.exe which handles .zip archives natively
      await execAsync(`tar -xf "${tempZipPath}" -C "${targetDir}"`);
    } catch {
      // Fallback to PowerShell Expand-Archive
      await execAsync(
        `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${tempZipPath}' -DestinationPath '${targetDir}' -Force"`
      );
    } finally {
      try {
        if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
      } catch {}
    }

    // Verify manifest.json exists
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

    // Resolve extension icon as base64 data URL
    let iconDataUrl: string | undefined = undefined;
    const icons = manifest.icons || manifest.action?.default_icon || manifest.browser_action?.default_icon;
    if (icons) {
      let iconRelativePath = "";
      if (typeof icons === "string") {
        iconRelativePath = icons;
      } else if (typeof icons === "object") {
        iconRelativePath = icons["128"] || icons["64"] || icons["48"] || icons["32"] || icons["16"] || Object.values(icons)[0] as string;
      }

      if (iconRelativePath) {
        const fullIconPath = path.join(targetDir, iconRelativePath);
        if (fs.existsSync(fullIconPath)) {
          const ext = path.extname(fullIconPath).slice(1) || "png";
          const b64 = fs.readFileSync(fullIconPath).toString("base64");
          iconDataUrl = `data:image/${ext};base64,${b64}`;
        }
      }
    }

    // Load into Electron Default Session & Forge Persist Session
    try {
      await session.defaultSession.loadExtension(targetDir, { allowFileAccess: true });
    } catch (err: any) {
      console.warn(`[ExtensionManager] Notice loading into defaultSession:`, err?.message);
    }

    try {
      const forgeSession = session.fromPartition("persist:forge");
      await forgeSession.loadExtension(targetDir, { allowFileAccess: true });
    } catch (err: any) {
      console.warn(`[ExtensionManager] Notice loading into persist:forge:`, err?.message);
    }

    const extInfo: InstalledExtensionInfo = {
      id: cleanedId,
      name: manifest.name || "Chrome Extension",
      version: manifest.version || "1.0.0",
      description: manifest.description || `Installed directly from Chrome Web Store (${cleanedId})`,
      author: manifest.author || "Chrome Web Store Developer",
      icon: iconDataUrl,
      path: targetDir,
      manifestPermissions: manifest.permissions || [],
      action: manifest.action || manifest.browser_action,
    };

    console.log(`[ExtensionManager] Successfully installed ${extInfo.name} (${cleanedId}) into Forge.`);
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

/**
 * Uninstalls and removes an extension from sessions and filesystem.
 */
export async function uninstallExtension(extId: string): Promise<boolean> {
  const cleanedId = extId.trim().toLowerCase();
  try {
    try {
      session.defaultSession.removeExtension(cleanedId);
    } catch {}
    try {
      const forgeSession = session.fromPartition("persist:forge");
      forgeSession.removeExtension(cleanedId);
    } catch {}

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

/**
 * Scans installed_extensions directory on startup and reloads them into sessions.
 */
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

      // Load into Electron sessions
      try {
        await session.defaultSession.loadExtension(extDir, { allowFileAccess: true });
      } catch {}
      try {
        const forgeSession = session.fromPartition("persist:forge");
        await forgeSession.loadExtension(extDir, { allowFileAccess: true });
      } catch {}

      let iconDataUrl: string | undefined = undefined;
      const icons = manifest.icons || manifest.action?.default_icon || manifest.browser_action?.default_icon;
      if (icons) {
        let iconRelativePath = "";
        if (typeof icons === "string") {
          iconRelativePath = icons;
        } else if (typeof icons === "object") {
          iconRelativePath = icons["128"] || icons["64"] || icons["48"] || icons["32"] || icons["16"] || Object.values(icons)[0] as string;
        }

        if (iconRelativePath) {
          const fullIconPath = path.join(extDir, iconRelativePath);
          if (fs.existsSync(fullIconPath)) {
            const ext = path.extname(fullIconPath).slice(1) || "png";
            const b64 = fs.readFileSync(fullIconPath).toString("base64");
            iconDataUrl = `data:image/${ext};base64,${b64}`;
          }
        }
      }

      results.push({
        id: extId,
        name: manifest.name || "Chrome Extension",
        version: manifest.version || "1.0.0",
        description: manifest.description || "",
        author: manifest.author || "Chrome Web Store Developer",
        icon: iconDataUrl,
        path: extDir,
        manifestPermissions: manifest.permissions || [],
        action: manifest.action || manifest.browser_action,
      });
    } catch (e) {
      console.warn(`[ExtensionManager] Error loading saved extension at ${extDir}:`, e);
    }
  }

  return results;
}

/**
 * Initializes Extension Manager IPC handlers.
 */
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

  // Automatically reload installed extensions once app is ready
  listAndReloadInstalledExtensions().catch((err) => {
    console.warn("[ExtensionManager] Initial reload notice:", err);
  });
}
