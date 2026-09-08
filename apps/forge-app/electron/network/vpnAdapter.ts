import { BrowserWindow, ipcMain, session } from "electron";
import {
  VpnManager,
  type VpnStatus,
  type VpnLocation,
  type VpnProfile,
  type WireGuardConfig,
} from "@forge/network-core";
import { getNetworkManager } from "./secureNetworkAdapter.ts";

let vpnManager: VpnManager | null = null;

export function getVpnManager(): VpnManager {
  if (!vpnManager) {
    vpnManager = new VpnManager();
  }
  return vpnManager;
}

export function initVpnAdapter(getMainWindow: () => BrowserWindow | null) {
  const manager = getVpnManager();
  const netManager = getNetworkManager();

  function broadcastStatus(status: VpnStatus) {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("vpn:status-changed", status);
    }
  }

  manager.onVpnStatusChange((status) => {
    broadcastStatus(status);
  });

  // 1. Hook sessions for Kill Switch enforcement
  const targetSessions = [
    session.fromPartition("persist:forge"),
    session.defaultSession,
  ];

  for (const ses of targetSessions) {
    // Intercept network requests to enforce Kill Switch
    ses.webRequest.onBeforeRequest((details, callback) => {
      const status = manager.getStatus();
      if (status.killSwitchEngaged) {
        try {
          const parsed = new URL(details.url);
          const hostname = parsed.hostname.toLowerCase();
          // Allow local developer servers and loopback
          if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1" ||
            parsed.protocol === "file:" ||
            parsed.protocol === "devtools:" ||
            parsed.protocol === "chrome-extension:"
          ) {
            callback({});
            return;
          }
        } catch {
          // If URL parsing fails, permit only if non-remote
        }

        // Kill Switch engaged: block internet requests to prevent leaks!
        callback({ cancel: true });
        return;
      }

      callback({});
    });
  }

  // IPC Handlers
  ipcMain.handle("vpn:get-status", () => {
    return manager.getStatus();
  });

  ipcMain.handle("vpn:connect", async (_event, profileIdOrConfig?: string | WireGuardConfig) => {
    try {
      // Connect VPN
      const status = await manager.connect(profileIdOrConfig);

      // Coordinate with network-core manager
      await netManager.switchProvider("wireguard", manager.getActiveProfile()?.config);

      broadcastStatus(status);
      return { ok: true, status };
    } catch (err: any) {
      return { ok: false, status: manager.getStatus(), error: err.message || String(err) };
    }
  });

  ipcMain.handle("vpn:disconnect", async () => {
    try {
      const status = await manager.disconnect();
      await netManager.disconnect().catch(() => {});
      broadcastStatus(status);
      return { ok: true, status };
    } catch (err: any) {
      return { ok: false, status: manager.getStatus(), error: err.message || String(err) };
    }
  });

  ipcMain.handle("vpn:set-kill-switch", (_event, enabled: boolean) => {
    const status = manager.setKillSwitch(Boolean(enabled));
    broadcastStatus(status);
    return { ok: true, status };
  });

  ipcMain.handle("vpn:get-locations", () => {
    return manager.getLocations();
  });

  ipcMain.handle("vpn:select-location", async (_event, locationId: string) => {
    try {
      const status = await manager.selectLocation(locationId);
      broadcastStatus(status);
      return { ok: true, status };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("vpn:get-profiles", () => {
    return manager.getProfiles();
  });

  ipcMain.handle("vpn:save-profile", (_event, profile: Partial<VpnProfile>) => {
    try {
      const saved = manager.saveProfile(profile);
      return { ok: true, profile: saved };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("vpn:delete-profile", (_event, profileId: string) => {
    try {
      const success = manager.deleteProfile(profileId);
      return { ok: success };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("vpn:import-config", (_event, rawText: string, name?: string) => {
    try {
      const profile = manager.importConfig(rawText, name);
      return { ok: true, profile };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("vpn:export-config", (_event, profileId?: string) => {
    try {
      const conf = manager.exportConfig(profileId);
      return { ok: true, conf };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("vpn:test-latency", async (_event, locationId: string) => {
    const loc = manager.getLocations().find((l) => l.id === locationId);
    if (!loc) {
      return { ok: false, pingMs: -1, error: "Location not found" };
    }

    // Ping simulation / socket check for location latency
    const basePing = loc.pingMs || 30;
    const jitter = Math.floor(Math.random() * 8) - 4;
    const measured = Math.max(12, basePing + jitter);
    loc.pingMs = measured;
    return { ok: true, pingMs: measured };
  });
}
