import { session, ipcMain, type Session as ElectronSession } from "electron";
import { PrivacyManager } from "@forge/privacy-core";
import { ElectronTorRuntime } from "../tor/TorRuntime.js";

export class ElectronPrivateSessionManager {
  private static instance: ElectronPrivateSessionManager | null = null;
  private privacyManager: PrivacyManager;
  private configuredPartitions = new Set<string>();
  private downloadSetupHandler: ((ses: ElectronSession) => void) | null = null;

  constructor() {
    this.privacyManager = PrivacyManager.getInstance();

    // Register cleanup callback with PrivacyManager
    this.privacyManager.setCleanupHandler(async (partitionName: string) => {
      await this.destroyPrivatePartition(partitionName);
    });
  }

  public static getInstance(): ElectronPrivateSessionManager {
    if (!ElectronPrivateSessionManager.instance) {
      ElectronPrivateSessionManager.instance = new ElectronPrivateSessionManager();
    }
    return ElectronPrivateSessionManager.instance;
  }

  public setDownloadSetupHandler(handler: (ses: ElectronSession) => void) {
    this.downloadSetupHandler = handler;
  }

  public isPrivateOrTorPartition(partitionName: string): boolean {
    return partitionName.startsWith("private_") || partitionName.startsWith("tor_");
  }

  public async configurePrivatePartition(ses: ElectronSession, partitionName: string): Promise<void> {
    if (this.configuredPartitions.has(partitionName)) return;
    this.configuredPartitions.add(partitionName);

    // Attach native download handlers for real filesystem saving
    if (this.downloadSetupHandler) {
      try {
        this.downloadSetupHandler(ses);
      } catch (err) {
        console.warn(`[PrivateSessionManager] Error attaching download handler:`, err);
      }
    }

    const isTor = partitionName.startsWith("tor_");
    const isPrivate = partitionName.startsWith("private_");

    console.log(`[PrivateSessionManager] Configuring temporary in-memory session for partition: ${partitionName} (Tor: ${isTor}, Private: ${isPrivate})`);

    // 1. WebRTC Leak Defense: strictly disable non-proxied UDP (Standard Tor Browser defense)
    try {
      ses.setWebRTCIPHandlingPolicy("disable_non_proxied_udp");
    } catch (err) {
      console.warn(`[PrivateSessionManager] Could not set WebRTC IP handling policy:`, err);
    }

    // 2. Tor Mode: Route all traffic via Tor SOCKS5 proxy
    if (isTor) {
      const torRuntime = ElectronTorRuntime.getInstance();
      const proxyRule = torRuntime.getProxyRule();
      try {
        await ses.setProxy({
          proxyRules: proxyRule,
          proxyBypassRules: "", // no bypasses, route all requests through Tor
        });
        console.log(`[PrivateSessionManager] Partition ${partitionName} routed through Tor proxy: ${proxyRule}`);
      } catch (err) {
        console.error(`[PrivateSessionManager] Error setting Tor proxy on ${partitionName}:`, err);
      }
    }

    // 3. Strict Permission Request Handler: Deny Geolocation, Media, and Notifications in Private/Tor
    ses.setPermissionRequestHandler((_webContents, permission, callback) => {
      const deniedPermissions = ["geolocation", "notifications", "media", "midi", "openExternal"];
      if (deniedPermissions.includes(permission)) {
        console.log(`[PrivateSessionManager] Denied permission "${permission}" in private/tor context`);
        callback(false);
        return;
      }
      callback(true);
    });
  }

  public async destroyPrivatePartition(partitionName: string): Promise<void> {
    try {
      console.log(`[PrivateSessionManager] Destroying temporary in-memory data for partition: ${partitionName}`);
      const targetSes = session.fromPartition(partitionName);

      // Wipe all in-memory data
      await targetSes.clearStorageData({
        storages: ["cookies", "localstorage", "indexdb", "websql", "cachestorage", "serviceworkers"],
        quotas: ["temporary", "syncable"],
      });
      await targetSes.clearCache();
      await targetSes.clearAuthCache();

      // Reset proxy if it was Tor
      if (partitionName.startsWith("tor_")) {
        await targetSes.setProxy({ proxyRules: "" });
      }

      this.configuredPartitions.delete(partitionName);
      console.log(`[PrivateSessionManager] Successfully purged temporary partition: ${partitionName}`);
    } catch (err) {
      console.warn(`[PrivateSessionManager] Error purging partition ${partitionName}:`, err);
    }
  }

  public registerIPC(): void {
    ipcMain.handle("privacy:create-session", async (_event, mode: "private" | "tor", name?: string) => {
      const sess = this.privacyManager.createPrivateSession(mode, name);
      // Pre-configure the partition in Electron
      const electronSes = session.fromPartition(sess.partition);
      await this.configurePrivatePartition(electronSes, sess.partition);
      return {
        id: sess.id,
        mode: sess.mode,
        name: sess.name,
        partition: sess.partition,
        createdAt: sess.createdAt,
      };
    });

    ipcMain.handle("privacy:destroy-session", async (_event, sessionId: string) => {
      await this.privacyManager.destroySession(sessionId);
      return { success: true };
    });

    ipcMain.handle("privacy:register-tab", async (_event, sessionId: string) => {
      this.privacyManager.registerTab(sessionId);
      return { success: true };
    });

    ipcMain.handle("privacy:unregister-tab", async (_event, sessionId: string) => {
      const destroyed = await this.privacyManager.unregisterTab(sessionId);
      return { destroyed };
    });

    ipcMain.handle("privacy:get-sessions", async () => {
      return this.privacyManager.getAllSessions().map((s) => ({
        id: s.id,
        mode: s.mode,
        name: s.name,
        partition: s.partition,
        createdAt: s.createdAt,
        activeTabCount: s.activeTabCount,
      }));
    });
  }
}
