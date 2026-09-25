import { ipcMain, BrowserWindow } from "electron";
import { ElectronTorRuntime } from "./TorRuntime.js";
import { TorManager } from "@forge/tor-core";

export function registerTorIPC() {
  const runtime = ElectronTorRuntime.getInstance();
  const manager = TorManager.getInstance();

  // Broadcast Tor status changes to all renderer windows
  manager.events.onStatus((status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        try {
          win.webContents.send("tor:status-changed", status);
        } catch {}
      }
    }
  });

  manager.events.onCircuit((circuit) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        try {
          win.webContents.send("tor:circuit-changed", circuit);
        } catch {}
      }
    }
  });

  ipcMain.handle("tor:get-status", async () => {
    return runtime.getStatus();
  });

  ipcMain.handle("tor:connect", async () => {
    return runtime.connect();
  });

  ipcMain.handle("tor:disconnect", async () => {
    return runtime.disconnect();
  });

  ipcMain.handle("tor:new-circuit", async () => {
    return runtime.newCircuit();
  });

  ipcMain.handle("tor:test-leak", async () => {
    return runtime.runLeakTest();
  });
}
