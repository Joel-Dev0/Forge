import { contextBridge, ipcRenderer } from "electron";

const windowControls = {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  restoreAndFocus: () => ipcRenderer.send("window:restore-and-focus"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  setFullScreen: (flag: boolean) => ipcRenderer.send("window:set-fullscreen", flag),
  isFullScreen: () => ipcRenderer.invoke("window:is-fullscreen"),
  setTheme: (mode: "system" | "light" | "dark") => ipcRenderer.send("theme:set", mode),
  setTitle: (title: string) => ipcRenderer.send("window:set-title", title),
};

contextBridge.exposeInMainWorld("electron", windowControls);

contextBridge.exposeInMainWorld("forge", {
  platform: process.platform,
  ...windowControls,
  setTitle: (title: string) => ipcRenderer.send("window:set-title", title),
  restoreAndFocus: () => ipcRenderer.send("window:restore-and-focus"),
  pip: {
    onActivateTabByContentsId: (callback: (contentsId: number) => void) => {
      const listener = (_event: any, contentsId: number) => callback(contentsId);
      ipcRenderer.on("webview:activate-tab-by-contents-id", listener);
      return () => ipcRenderer.removeListener("webview:activate-tab-by-contents-id", listener);
    },
  },
  power: {
    onPowerResume: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("power:resume", listener);
      return () => ipcRenderer.removeListener("power:resume", listener);
    },
    onPowerSuspend: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("power:suspend", listener);
      return () => ipcRenderer.removeListener("power:suspend", listener);
    },
  },
  fullscreen: {
    setFullScreen: (flag: boolean) => ipcRenderer.send("window:set-fullscreen", flag),
    isFullScreen: () => ipcRenderer.invoke("window:is-fullscreen"),
    onHtmlFullScreenChange: (callback: (data: { isFullscreen: boolean; contentsId?: number }) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on("webview:html-full-screen-change", listener);
      return () => ipcRenderer.removeListener("webview:html-full-screen-change", listener);
    },
  },
  media: {
    updateStatus: (data: { isPlaying: boolean }) => ipcRenderer.send("media:status-update", data),
    onTaskbarMediaPrev: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("taskbar:media-prev", listener);
      return () => ipcRenderer.removeListener("taskbar:media-prev", listener);
    },
    onTaskbarMediaTogglePlay: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("taskbar:media-toggle-play", listener);
      return () => ipcRenderer.removeListener("taskbar:media-toggle-play", listener);
    },
    onTaskbarMediaNext: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("taskbar:media-next", listener);
      return () => ipcRenderer.removeListener("taskbar:media-next", listener);
    },
  },
  http: {
    request: (options: any) => ipcRenderer.invoke("forge:http:request", options),
  },
  network: {
    onEntry: (callback: (entry: any) => void) => {
      const listener = (_event: any, entry: any) => callback(entry);
      ipcRenderer.on("network:entry-update", listener);
      return () => ipcRenderer.removeListener("network:entry-update", listener);
    },
    onClear: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("network:cleared", listener);
      return () => ipcRenderer.removeListener("network:cleared", listener);
    },
    clear: () => ipcRenderer.send("network:clear"),
    getResponseBody: (requestId: string) => ipcRenderer.invoke("network:get-body", requestId),
  },
  terminal: {
    exec: (command: string, shell: "powershell" | "cmd" = "powershell") =>
      ipcRenderer.invoke("terminal:exec", command, shell),
    getCwd: () => ipcRenderer.invoke("terminal:get-cwd"),
    setCwd: (newCwd: string) => ipcRenderer.invoke("terminal:set-cwd", newCwd),
  },
  adblock: {
    getState: () => ipcRenderer.invoke("adblock:get-state"),
    setEnabled: (enabled: boolean) => ipcRenderer.invoke("adblock:set-enabled", enabled),
    setFeature: (feature: string, enabled: boolean) => ipcRenderer.invoke("adblock:set-feature", feature, enabled),
    getDetailedStats: () => ipcRenderer.invoke("adblock:get-detailed-stats"),
    getCustomRules: () => ipcRenderer.invoke("adblock:get-custom-rules"),
    toggleCustomRule: (ruleId: string, enabled?: boolean) => ipcRenderer.invoke("adblock:toggle-custom-rule", ruleId, enabled),
    importRules: (rawContent: string) => ipcRenderer.invoke("adblock:import-rules", rawContent),
    exportRules: () => ipcRenderer.invoke("adblock:export-rules"),
    toggleList: (listId: string, enabled?: boolean) => ipcRenderer.invoke("adblock:toggle-list", listId, enabled),
    addUserRule: (rawRule: string) => ipcRenderer.invoke("adblock:add-user-rule", rawRule),
    removeUserRule: (ruleId: string) => ipcRenderer.invoke("adblock:remove-user-rule", ruleId),
    clearLogs: () => ipcRenderer.invoke("adblock:clear-logs"),
    getCosmeticCSS: (url: string) => ipcRenderer.invoke("adblock:get-cosmetic-css", url),
    getScriptlet: (url: string) => ipcRenderer.invoke("adblock:get-scriptlet", url),
    updateLists: () => ipcRenderer.invoke("adblock:update-lists"),
    getGuestPreloadPath: () => ipcRenderer.invoke("adblock:get-guest-preload-path"),
    onRequestEntry: (callback: (entry: any) => void) => {
      const listener = (_event: any, entry: any) => callback(entry);
      ipcRenderer.on("adblock:request-entry", listener);
      return () => ipcRenderer.removeListener("adblock:request-entry", listener);
    },
    onStateChanged: (callback: (state: any) => void) => {
      const listener = (_event: any, state: any) => callback(state);
      ipcRenderer.on("adblock:state-changed", listener);
      return () => ipcRenderer.removeListener("adblock:state-changed", listener);
    },
    onListsUpdated: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status);
      ipcRenderer.on("adblock:lists-updated", listener);
      return () => ipcRenderer.removeListener("adblock:lists-updated", listener);
    },
    onLogsCleared: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("adblock:logs-cleared", listener);
      return () => ipcRenderer.removeListener("adblock:logs-cleared", listener);
    },
  },
  secureNetwork: {
    getStatus: () => ipcRenderer.invoke("secure-network:get-status"),
    connect: (payload: { mode: string; config?: any }) => ipcRenderer.invoke("secure-network:connect", payload),
    disconnect: () => ipcRenderer.invoke("secure-network:disconnect"),
    refreshIp: () => ipcRenderer.invoke("secure-network:refresh-ip"),
    testConnection: (targetUrl?: string) => ipcRenderer.invoke("secure-network:test-connection", targetUrl),
    onStatusChanged: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status);
      ipcRenderer.on("secure-network:status-changed", listener);
      return () => ipcRenderer.removeListener("secure-network:status-changed", listener);
    },
  },
  vpn: {
    getStatus: () => ipcRenderer.invoke("vpn:get-status"),
    connect: (profileIdOrConfig?: any) => ipcRenderer.invoke("vpn:connect", profileIdOrConfig),
    disconnect: () => ipcRenderer.invoke("vpn:disconnect"),
    setKillSwitch: (enabled: boolean) => ipcRenderer.invoke("vpn:set-kill-switch", enabled),
    getLocations: () => ipcRenderer.invoke("vpn:get-locations"),
    selectLocation: (locationId: string) => ipcRenderer.invoke("vpn:select-location", locationId),
    getProfiles: () => ipcRenderer.invoke("vpn:get-profiles"),
    saveProfile: (profile: any) => ipcRenderer.invoke("vpn:save-profile", profile),
    deleteProfile: (profileId: string) => ipcRenderer.invoke("vpn:delete-profile", profileId),
    importConfig: (rawText: string, name?: string) => ipcRenderer.invoke("vpn:import-config", rawText, name),
    exportConfig: (profileId?: string) => ipcRenderer.invoke("vpn:export-config", profileId),
    testLatency: (locationId: string) => ipcRenderer.invoke("vpn:test-latency", locationId),
    onStatusChanged: (callback: (status: any) => void) => {
      const listener = (_event: any, status: any) => callback(status);
      ipcRenderer.on("vpn:status-changed", listener);
      return () => ipcRenderer.removeListener("vpn:status-changed", listener);
    },
  },
});

