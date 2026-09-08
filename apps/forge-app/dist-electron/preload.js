// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electron", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  setTheme: (mode) => ipcRenderer.send("theme:set", mode)
});
contextBridge.exposeInMainWorld("forge", {
  platform: process.platform,
  http: {
    request: (options) => ipcRenderer.invoke("forge:http:request", options)
  },
  network: {
    onEntry: (callback) => {
      const listener = (_event, entry) => callback(entry);
      ipcRenderer.on("network:entry-update", listener);
      return () => ipcRenderer.removeListener("network:entry-update", listener);
    },
    onClear: (callback) => {
      const listener = () => callback();
      ipcRenderer.on("network:cleared", listener);
      return () => ipcRenderer.removeListener("network:cleared", listener);
    },
    clear: () => ipcRenderer.send("network:clear"),
    getResponseBody: (requestId) => ipcRenderer.invoke("network:get-body", requestId)
  }
});
