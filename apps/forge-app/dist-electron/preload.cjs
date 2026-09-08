// electron/preload.ts
var import_electron = require("electron");
var windowControls = {
  minimize: () => import_electron.ipcRenderer.send("window:minimize"),
  maximize: () => import_electron.ipcRenderer.send("window:maximize"),
  restoreAndFocus: () => import_electron.ipcRenderer.send("window:restore-and-focus"),
  close: () => import_electron.ipcRenderer.send("window:close"),
  isMaximized: () => import_electron.ipcRenderer.invoke("window:is-maximized"),
  setFullScreen: (flag) => import_electron.ipcRenderer.send("window:set-fullscreen", flag),
  isFullScreen: () => import_electron.ipcRenderer.invoke("window:is-fullscreen"),
  setTheme: (mode) => import_electron.ipcRenderer.send("theme:set", mode),
  setTitle: (title) => import_electron.ipcRenderer.send("window:set-title", title)
};
import_electron.contextBridge.exposeInMainWorld("electron", windowControls);
import_electron.contextBridge.exposeInMainWorld("forge", {
  platform: process.platform,
  ...windowControls,
  setTitle: (title) => import_electron.ipcRenderer.send("window:set-title", title),
  restoreAndFocus: () => import_electron.ipcRenderer.send("window:restore-and-focus"),
  pip: {
    onActivateTabByContentsId: (callback) => {
      const listener = (_event, contentsId) => callback(contentsId);
      import_electron.ipcRenderer.on("webview:activate-tab-by-contents-id", listener);
      return () => import_electron.ipcRenderer.removeListener("webview:activate-tab-by-contents-id", listener);
    }
  },
  power: {
    onPowerResume: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("power:resume", listener);
      return () => import_electron.ipcRenderer.removeListener("power:resume", listener);
    },
    onPowerSuspend: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("power:suspend", listener);
      return () => import_electron.ipcRenderer.removeListener("power:suspend", listener);
    }
  },
  fullscreen: {
    setFullScreen: (flag) => import_electron.ipcRenderer.send("window:set-fullscreen", flag),
    isFullScreen: () => import_electron.ipcRenderer.invoke("window:is-fullscreen"),
    onHtmlFullScreenChange: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("webview:html-full-screen-change", listener);
      return () => import_electron.ipcRenderer.removeListener("webview:html-full-screen-change", listener);
    }
  },
  media: {
    updateStatus: (data) => import_electron.ipcRenderer.send("media:status-update", data),
    onTaskbarMediaPrev: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("taskbar:media-prev", listener);
      return () => import_electron.ipcRenderer.removeListener("taskbar:media-prev", listener);
    },
    onTaskbarMediaTogglePlay: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("taskbar:media-toggle-play", listener);
      return () => import_electron.ipcRenderer.removeListener("taskbar:media-toggle-play", listener);
    },
    onTaskbarMediaNext: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("taskbar:media-next", listener);
      return () => import_electron.ipcRenderer.removeListener("taskbar:media-next", listener);
    }
  },
  http: {
    request: (options) => import_electron.ipcRenderer.invoke("forge:http:request", options)
  },
  network: {
    onEntry: (callback) => {
      const listener = (_event, entry) => callback(entry);
      import_electron.ipcRenderer.on("network:entry-update", listener);
      return () => import_electron.ipcRenderer.removeListener("network:entry-update", listener);
    },
    onClear: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("network:cleared", listener);
      return () => import_electron.ipcRenderer.removeListener("network:cleared", listener);
    },
    clear: () => import_electron.ipcRenderer.send("network:clear"),
    getResponseBody: (requestId) => import_electron.ipcRenderer.invoke("network:get-body", requestId)
  },
  terminal: {
    exec: (command, shell = "powershell") => import_electron.ipcRenderer.invoke("terminal:exec", command, shell),
    getCwd: () => import_electron.ipcRenderer.invoke("terminal:get-cwd"),
    setCwd: (newCwd) => import_electron.ipcRenderer.invoke("terminal:set-cwd", newCwd)
  },
  adblock: {
    getState: () => import_electron.ipcRenderer.invoke("adblock:get-state"),
    setEnabled: (enabled) => import_electron.ipcRenderer.invoke("adblock:set-enabled", enabled),
    setFeature: (feature, enabled) => import_electron.ipcRenderer.invoke("adblock:set-feature", feature, enabled),
    getDetailedStats: () => import_electron.ipcRenderer.invoke("adblock:get-detailed-stats"),
    getCustomRules: () => import_electron.ipcRenderer.invoke("adblock:get-custom-rules"),
    toggleCustomRule: (ruleId, enabled) => import_electron.ipcRenderer.invoke("adblock:toggle-custom-rule", ruleId, enabled),
    importRules: (rawContent) => import_electron.ipcRenderer.invoke("adblock:import-rules", rawContent),
    exportRules: () => import_electron.ipcRenderer.invoke("adblock:export-rules"),
    toggleList: (listId, enabled) => import_electron.ipcRenderer.invoke("adblock:toggle-list", listId, enabled),
    addUserRule: (rawRule) => import_electron.ipcRenderer.invoke("adblock:add-user-rule", rawRule),
    removeUserRule: (ruleId) => import_electron.ipcRenderer.invoke("adblock:remove-user-rule", ruleId),
    clearLogs: () => import_electron.ipcRenderer.invoke("adblock:clear-logs"),
    getCosmeticCSS: (url) => import_electron.ipcRenderer.invoke("adblock:get-cosmetic-css", url),
    getScriptlet: (url) => import_electron.ipcRenderer.invoke("adblock:get-scriptlet", url),
    updateLists: () => import_electron.ipcRenderer.invoke("adblock:update-lists"),
    getGuestPreloadPath: () => import_electron.ipcRenderer.invoke("adblock:get-guest-preload-path"),
    onRequestEntry: (callback) => {
      const listener = (_event, entry) => callback(entry);
      import_electron.ipcRenderer.on("adblock:request-entry", listener);
      return () => import_electron.ipcRenderer.removeListener("adblock:request-entry", listener);
    },
    onStateChanged: (callback) => {
      const listener = (_event, state) => callback(state);
      import_electron.ipcRenderer.on("adblock:state-changed", listener);
      return () => import_electron.ipcRenderer.removeListener("adblock:state-changed", listener);
    },
    onListsUpdated: (callback) => {
      const listener = (_event, status) => callback(status);
      import_electron.ipcRenderer.on("adblock:lists-updated", listener);
      return () => import_electron.ipcRenderer.removeListener("adblock:lists-updated", listener);
    },
    onLogsCleared: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("adblock:logs-cleared", listener);
      return () => import_electron.ipcRenderer.removeListener("adblock:logs-cleared", listener);
    }
  },
  secureNetwork: {
    getStatus: () => import_electron.ipcRenderer.invoke("secure-network:get-status"),
    connect: (payload) => import_electron.ipcRenderer.invoke("secure-network:connect", payload),
    disconnect: () => import_electron.ipcRenderer.invoke("secure-network:disconnect"),
    refreshIp: () => import_electron.ipcRenderer.invoke("secure-network:refresh-ip"),
    testConnection: (targetUrl) => import_electron.ipcRenderer.invoke("secure-network:test-connection", targetUrl),
    onStatusChanged: (callback) => {
      const listener = (_event, status) => callback(status);
      import_electron.ipcRenderer.on("secure-network:status-changed", listener);
      return () => import_electron.ipcRenderer.removeListener("secure-network:status-changed", listener);
    }
  },
  vpn: {
    getStatus: () => import_electron.ipcRenderer.invoke("vpn:get-status"),
    connect: (profileIdOrConfig) => import_electron.ipcRenderer.invoke("vpn:connect", profileIdOrConfig),
    disconnect: () => import_electron.ipcRenderer.invoke("vpn:disconnect"),
    setKillSwitch: (enabled) => import_electron.ipcRenderer.invoke("vpn:set-kill-switch", enabled),
    getLocations: () => import_electron.ipcRenderer.invoke("vpn:get-locations"),
    selectLocation: (locationId) => import_electron.ipcRenderer.invoke("vpn:select-location", locationId),
    getProfiles: () => import_electron.ipcRenderer.invoke("vpn:get-profiles"),
    saveProfile: (profile) => import_electron.ipcRenderer.invoke("vpn:save-profile", profile),
    deleteProfile: (profileId) => import_electron.ipcRenderer.invoke("vpn:delete-profile", profileId),
    importConfig: (rawText, name) => import_electron.ipcRenderer.invoke("vpn:import-config", rawText, name),
    exportConfig: (profileId) => import_electron.ipcRenderer.invoke("vpn:export-config", profileId),
    testLatency: (locationId) => import_electron.ipcRenderer.invoke("vpn:test-latency", locationId),
    onStatusChanged: (callback) => {
      const listener = (_event, status) => callback(status);
      import_electron.ipcRenderer.on("vpn:status-changed", listener);
      return () => import_electron.ipcRenderer.removeListener("vpn:status-changed", listener);
    }
  }
});
