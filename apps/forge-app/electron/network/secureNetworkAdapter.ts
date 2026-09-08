import { app, BrowserWindow, ipcMain, session, net } from "electron";
import {
  NetworkManager,
  ProxyProvider,
  type NetworkStatus,
  type NetworkMode,
  type ProxyConfig,
  type WireGuardConfig,
  type NetworkLocationInfo,
  type ConnectionTestResult,
} from "@forge/network-core";

let networkManager: NetworkManager | null = null;
let activeProxyCredentials: { username?: string; password?: string } | null = null;

export function getNetworkManager(): NetworkManager {
  if (!networkManager) {
    networkManager = new NetworkManager();
  }
  return networkManager;
}

export function initSecureNetworkAdapter(getMainWindow: () => BrowserWindow | null) {
  const manager = getNetworkManager();

  function broadcastStatus(status: NetworkStatus) {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("secure-network:status-changed", status);
    }
  }

  manager.onStatusChange((status) => {
    broadcastStatus(status);
  });

  const getTargetSessions = () => [
    session.fromPartition("persist:forge"),
    session.defaultSession,
  ];

  // Configure proxy credentials auto-reply on authentication challenges
  app.on("login", (event, _webContents, _request, authInfo, callback) => {
    if (authInfo.isProxy && activeProxyCredentials?.username) {
      event.preventDefault();
      callback(activeProxyCredentials.username, activeProxyCredentials.password || "");
    }
  });

  // Custom fetch function that routes through the Electron network stack (and thus the configured proxy)
  const sessionFetch = async (url: string): Promise<any> => {
    try {
      const response = await net.fetch(url, {
        headers: { "User-Agent": "ForgeBrowser/1.0 SecureNetwork" },
      });
      return await response.json();
    } catch {
      // Fallback using global fetch if net.fetch fails
      const res = await fetch(url, {
        headers: { "User-Agent": "ForgeBrowser/1.0 SecureNetwork" },
      });
      return await res.json();
    }
  };

  // 1. Get current status
  ipcMain.handle("secure-network:get-status", async () => {
    return manager.getStatus();
  });

  // 2. Connect (Direct, Proxy, or WireGuard)
  ipcMain.handle(
    "secure-network:connect",
    async (
      _event,
      payload: { mode: NetworkMode; config?: Partial<ProxyConfig> | WireGuardConfig }
    ) => {
      const { mode, config } = payload;
      const sessions = getTargetSessions();

      try {
        if (mode === "direct") {
          activeProxyCredentials = null;
          await Promise.all(sessions.map((s) => s.setProxy({ mode: "direct" })));
          const status = await manager.switchProvider("direct");
          // Refresh direct IP asynchronously
          manager.resolveLocation(sessionFetch).then((loc) => {
            manager.getStatus().then(broadcastStatus);
          }).catch(() => {});
          return { ok: true, status };
        }

        if (mode === "proxy") {
          const proxyConfig = config as Partial<ProxyConfig> | undefined;
          activeProxyCredentials = {
            username: proxyConfig?.username,
            password: proxyConfig?.password,
          };

          const status = await manager.switchProvider("proxy", proxyConfig);
          const proxyProvider = manager.getProxyProvider();
          const { proxyRules, proxyBypassRules } = proxyProvider.toElectronProxyRules();

          await Promise.all(
            sessions.map((s) => s.setProxy({ proxyRules, proxyBypassRules }))
          );

          // Resolve external IP through proxy asynchronously
          manager.resolveLocation(sessionFetch).then((loc) => {
            manager.getStatus().then(broadcastStatus);
          }).catch(() => {});

          return { ok: true, status };
        }

        if (mode === "wireguard") {
          activeProxyCredentials = null;
          const status = await manager.switchProvider("wireguard", config as WireGuardConfig);
          return { ok: true, status };
        }

        return { ok: false, error: `Unsupported mode: ${mode}` };
      } catch (err: any) {
        return { ok: false, error: err.message || String(err) };
      }
    }
  );

  // 3. Disconnect (Restores Direct connection)
  ipcMain.handle("secure-network:disconnect", async () => {
    try {
      activeProxyCredentials = null;
      const sessions = getTargetSessions();
      await Promise.all(sessions.map((s) => s.setProxy({ mode: "direct" })));

      const status = await manager.disconnect();
      manager.resolveLocation(sessionFetch).then(() => {
        manager.getStatus().then(broadcastStatus);
      }).catch(() => {});

      return { ok: true, status };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  // 4. Refresh Public IP / Location
  ipcMain.handle("secure-network:refresh-ip", async () => {
    try {
      const location = await manager.resolveLocation(sessionFetch);
      const status = await manager.getStatus();
      broadcastStatus(status);
      return { ok: true, location };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  // 5. Test connection latency
  ipcMain.handle("secure-network:test-connection", async (_event, targetUrl?: string) => {
    try {
      const testFetch = async (url: string) => {
        return net.fetch(url, { method: "HEAD" });
      };
      const result: ConnectionTestResult = await manager.testConnection(
        targetUrl || "https://www.google.com/generate_204",
        testFetch
      );
      return { ok: true, result };
    } catch (err: any) {
      return {
        ok: false,
        result: {
          success: false,
          latencyMs: -1,
          error: err.message || String(err),
        },
      };
    }
  });

  // Initial IP resolution on startup
  setTimeout(() => {
    manager.resolveLocation(sessionFetch).then((loc) => {
      manager.getStatus().then(broadcastStatus);
    }).catch(() => {});
  }, 2000);
}
