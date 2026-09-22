import { app, session, ipcMain, webContents, type WebContents } from "electron";
import * as os from "os";

let isCorsBypassActive = false;
let bypassPrivateNetworkAccess = true;

/**
 * Configure response header rewriting for developer CORS bypass and local API access
 */
export function setupCorsBypassInterceptor(targetSession: Electron.Session) {
  targetSession.webRequest.onHeadersReceived((details, callback) => {
    if (!isCorsBypassActive) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    const responseHeaders = { ...(details.responseHeaders || {}) };

    // Detect request origin or default to wildcard
    const reqOrigin = details.requestHeaders?.Origin || details.requestHeaders?.origin || "*";

    // Set CORS headers
    responseHeaders["access-control-allow-origin"] = [reqOrigin];
    responseHeaders["access-control-allow-methods"] = ["GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"];
    responseHeaders["access-control-allow-headers"] = ["*"];
    responseHeaders["access-control-allow-credentials"] = ["true"];

    if (bypassPrivateNetworkAccess) {
      responseHeaders["access-control-allow-private-network"] = ["true"];
    }

    // Strip restrictive headers that block local embedding
    delete responseHeaders["x-frame-options"];
    delete responseHeaders["X-Frame-Options"];

    callback({ responseHeaders });
  });
}

/**
 * Find local IPv4 address on the primary active Wi-Fi / Ethernet adapter
 */
export function getPrimaryLocalIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net of netList) {
        // Skip internal loopback and non-IPv4 addresses
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {}
  return "127.0.0.1";
}

/**
 * Initialize Web Engine & Compatibility Analysis manager
 */
export function initCompatManager() {
  // Set up default session
  setupCorsBypassInterceptor(session.defaultSession);

  // Monitor web-contents creation for crash tracking and deprecations
  app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "webview") return;

    contents.on("render-process-gone", (_ev, details) => {
      console.warn(`[Compat Manager] Guest webview ${contents.id} crashed:`, details.reason, details.exitCode);
      const allWeb = webContents.getAllWebContents();
      for (const w of allWeb) {
        if (w.getType() === "window") {
          w.send("compat:tab-crashed", {
            contentsId: contents.id,
            reason: details.reason,
            exitCode: details.exitCode,
          });
        }
      }
    });

    contents.on("console-message", (_ev, level, message, line, sourceId) => {
      if (message.toLowerCase().includes("deprecation") || message.toLowerCase().includes("[deprecation]")) {
        const allWeb = webContents.getAllWebContents();
        for (const w of allWeb) {
          if (w.getType() === "window") {
            w.send("compat:deprecation-logged", {
              contentsId: contents.id,
              level,
              message,
              line,
              source: sourceId,
            });
          }
        }
      }
    });
  });

  // IPC: Toggle CORS Bypass
  ipcMain.handle("compat:set-cors-bypass", (_event, active: boolean) => {
    isCorsBypassActive = Boolean(active);
    console.log(`[Compat Manager] Developer CORS Bypass set to: ${isCorsBypassActive}`);
    return { success: true, isCorsBypassActive };
  });

  ipcMain.handle("compat:get-cors-bypass", () => {
    return isCorsBypassActive;
  });

  // IPC: Get Runtime Versions
  ipcMain.handle("compat:get-versions", () => {
    return {
      chromium: process.versions.chrome || "132.0.0.0",
      v8: process.versions.v8 || "13.0.0.0",
      node: process.versions.node || "20.0.0",
      electron: process.versions.electron || "34.0.0",
    };
  });

  // IPC: Get Local Network IP for Physical Device Bridge
  ipcMain.handle("compat:get-local-ip", () => {
    return getPrimaryLocalIp();
  });

  // IPC: Set CDP Emulation (CPU throttling, network conditions, touch emulation)
  ipcMain.handle("compat:set-emulation", async (_event, targetContentsId?: number, options?: any) => {
    const target = targetContentsId ? webContents.fromId(targetContentsId) : null;
    const targets = target ? [target] : webContents.getAllWebContents().filter((c) => c.getType() === "webview");

    for (const c of targets) {
      if (c.isDestroyed()) continue;
      try {
        if (!c.debugger.isAttached()) {
          c.debugger.attach("1.3");
        }

        // 1. CPU Throttling
        if (typeof options?.cpuThrottlingRate === "number") {
          await c.debugger.sendCommand("Emulation.setCPUThrottlingRate", {
            rate: Math.max(1, options.cpuThrottlingRate),
          }).catch(() => {});
        }

        // 2. Network Throttling
        if (options?.networkConditions !== undefined) {
          if (options.networkConditions === null) {
            await c.debugger.sendCommand("Network.emulateNetworkConditions", {
              offline: false,
              latency: 0,
              downloadThroughput: -1,
              uploadThroughput: -1,
            }).catch(() => {});
          } else {
            await c.debugger.sendCommand("Network.emulateNetworkConditions", {
              offline: Boolean(options.networkConditions.offline),
              latency: options.networkConditions.latency || 0,
              downloadThroughput: options.networkConditions.downloadThroughput || -1,
              uploadThroughput: options.networkConditions.uploadThroughput || -1,
            }).catch(() => {});
          }
        }

        // 3. Touch Emulation
        if (typeof options?.touchEmulation === "boolean") {
          await c.debugger.sendCommand("Emulation.setTouchEmulationEnabled", {
            enabled: options.touchEmulation,
            maxTouchPoints: 5,
          }).catch(() => {});
          await c.debugger.sendCommand("Emulation.setEmitTouchEventsForMouse", {
            enabled: options.touchEmulation,
            configuration: "mobile",
          }).catch(() => {});
        }
      } catch (err) {
        console.warn(`[Compat Manager] Emulation command error on ${c.id}:`, err);
      }
    }

    return { success: true };
  });

  // IPC: Force V8 Garbage Collection
  ipcMain.handle("compat:collect-garbage", async (_event, targetContentsId?: number) => {
    const target = targetContentsId ? webContents.fromId(targetContentsId) : null;
    const targets = target ? [target] : webContents.getAllWebContents().filter((c) => c.getType() === "webview");

    let executedCount = 0;
    for (const c of targets) {
      if (c.isDestroyed()) continue;
      try {
        if (!c.debugger.isAttached()) {
          c.debugger.attach("1.3");
        }
        await c.debugger.sendCommand("HeapProfiler.enable").catch(() => {});
        await c.debugger.sendCommand("HeapProfiler.collectGarbage").catch(() => {});
        executedCount++;
      } catch (err) {
        console.warn(`[Compat Manager] GC command error on ${c.id}:`, err);
      }
    }

    return { success: executedCount > 0, count: executedCount };
  });
}
