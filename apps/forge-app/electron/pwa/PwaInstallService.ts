import { app, BrowserWindow, net, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import type { InstalledPwaRecord, PwaManifest } from "@forge/pwa-core";
import { PwaNavigationObserver } from "./PwaNavigationObserver.ts";

export interface InstallResult {
  success: boolean;
  appId?: string;
  error?: string;
}

export class PwaInstallService {
  private static instance: PwaInstallService;
  private appsDir: string;
  private registryFile: string;
  private registry = new Map<string, InstalledPwaRecord>();

  private constructor() {
    this.appsDir = path.join(app.getPath("userData"), "pwa-apps");
    this.registryFile = path.join(this.appsDir, "registry.json");
    this.ensureDirectory();
    this.loadRegistry();
  }

  public static getInstance(): PwaInstallService {
    if (!PwaInstallService.instance) {
      PwaInstallService.instance = new PwaInstallService();
    }
    return PwaInstallService.instance;
  }

  public getInstalledApps(): InstalledPwaRecord[] {
    return Array.from(this.registry.values());
  }

  public getInstalledApp(appId: string): InstalledPwaRecord | undefined {
    return this.registry.get(appId);
  }

  public async installPwa(tabId: string): Promise<InstallResult> {
    // 1. Mandatory Gate Re-verification in Main Process
    const observer = PwaNavigationObserver.getInstance();
    const eligibility = observer.getTabEligibility(tabId);

    if (!eligibility || !eligibility.eligible || eligibility.status !== "eligible") {
      return {
        success: false,
        error: "Installation rejected: PWA has not passed all mandatory security checks.",
      };
    }

    const manifest = eligibility.manifest;
    if (!manifest) {
      return {
        success: false,
        error: "Missing manifest payload during installation confirmation.",
      };
    }

    try {
      // 2. Derive stable appId from origin + scope
      const appId = this.generateAppId(manifest.scope || manifest.startUrl);
      const appFolder = path.join(this.appsDir, appId);
      if (!fs.existsSync(appFolder)) {
        fs.mkdirSync(appFolder, { recursive: true });
      }

      // 3. Cache high-resolution icon
      let localIconPath = path.join(appFolder, "icon.png");
      if (eligibility.bestIconUrl) {
        try {
          await this.downloadFile(eligibility.bestIconUrl, localIconPath);
        } catch {
          localIconPath = "";
        }
      }

      // 4. Save metadata record
      const record: InstalledPwaRecord = {
        id: appId,
        name: manifest.name || manifest.shortName || "PWA App",
        shortName: manifest.shortName || manifest.name || "App",
        startUrl: manifest.startUrl,
        scope: manifest.scope,
        display: manifest.display,
        iconPath: localIconPath,
        iconUrl: eligibility.bestIconUrl || "",
        installedAt: Date.now(),
      };

      this.registry.set(appId, record);
      this.saveRegistry();

      // 5. Create OS shortcuts (Windows Desktop & Start Menu)
      if (process.platform === "win32") {
        this.createWindowsShortcuts(record);
      }

      return {
        success: true,
        appId,
      };
    } catch (err: any) {
      console.error("[PwaInstallService] Install error:", err);
      return {
        success: false,
        error: err?.message || "Internal failure during PWA installation",
      };
    }
  }

  public launchApp(appId: string): boolean {
    const record = this.registry.get(appId);
    if (!record) return false;

    record.lastLaunchedAt = Date.now();
    this.saveRegistry();

    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      title: record.name,
      icon: record.iconPath && fs.existsSync(record.iconPath) ? record.iconPath : undefined,
      autoHideMenuBar: true,
      backgroundColor: "#0d0f17",
      webPreferences: {
        partition: `persist:pwa_${record.id}`,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    win.loadURL(record.startUrl);
    return true;
  }

  public uninstallApp(appId: string): boolean {
    const record = this.registry.get(appId);
    if (!record) return false;

    // Remove shortcuts
    if (process.platform === "win32") {
      try {
        const desktopLnk = path.join(app.getPath("desktop"), `${record.name}.lnk`);
        if (fs.existsSync(desktopLnk)) fs.unlinkSync(desktopLnk);

        const startMenuLnk = path.join(
          app.getPath("appData"),
          "Microsoft",
          "Windows",
          "Start Menu",
          "Programs",
          "Forge Apps",
          `${record.name}.lnk`
        );
        if (fs.existsSync(startMenuLnk)) fs.unlinkSync(startMenuLnk);
      } catch {}
    }

    // Clean folder
    const appFolder = path.join(this.appsDir, appId);
    if (fs.existsSync(appFolder)) {
      try {
        fs.rmSync(appFolder, { recursive: true, force: true });
      } catch {}
    }

    this.registry.delete(appId);
    this.saveRegistry();
    return true;
  }

  private createWindowsShortcuts(record: InstalledPwaRecord): void {
    const execPath = process.execPath;
    const desktopPath = path.join(app.getPath("desktop"), `${record.name}.lnk`);
    const startMenuFolder = path.join(
      app.getPath("appData"),
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
      "Forge Apps"
    );

    if (!fs.existsSync(startMenuFolder)) {
      fs.mkdirSync(startMenuFolder, { recursive: true });
    }
    const startMenuPath = path.join(startMenuFolder, `${record.name}.lnk`);

    const shortcutOptions = {
      target: execPath,
      args: `--pwa-app-id=${record.id}`,
      description: `${record.name} - Progressive Web App in Forge`,
      icon: record.iconPath && fs.existsSync(record.iconPath) ? record.iconPath : execPath,
      iconIndex: 0,
      appUserModelId: `com.forge.pwa.${record.id}`,
    };

    try {
      shell.writeShortcutLink(desktopPath, "create", shortcutOptions);
      shell.writeShortcutLink(startMenuPath, "create", shortcutOptions);
    } catch (err) {
      console.warn("[PwaInstallService] Could not write Windows shortcut:", err);
    }
  }

  private async downloadFile(url: string, destPath: string): Promise<void> {
    const response = await net.fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
  }

  private generateAppId(scopeOrStartUrl: string): string {
    return crypto.createHash("sha256").update(scopeOrStartUrl).digest("hex").slice(0, 16);
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.appsDir)) {
      fs.mkdirSync(this.appsDir, { recursive: true });
    }
  }

  private loadRegistry(): void {
    if (fs.existsSync(this.registryFile)) {
      try {
        const raw = fs.readFileSync(this.registryFile, "utf8");
        const list: InstalledPwaRecord[] = JSON.parse(raw);
        for (const item of list) {
          this.registry.set(item.id, item);
        }
      } catch {}
    }
  }

  private saveRegistry(): void {
    try {
      const list = Array.from(this.registry.values());
      fs.writeFileSync(this.registryFile, JSON.stringify(list, null, 2), "utf8");
    } catch {}
  }
}
