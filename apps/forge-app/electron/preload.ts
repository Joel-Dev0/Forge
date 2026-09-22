import { contextBridge, ipcRenderer } from "electron";

let guestPreloadPath = "";
try {
  guestPreloadPath = ipcRenderer.sendSync("adblock:get-guest-preload-path-sync") || "";
} catch {}

const windowControls = {
  minimize: () => {
    try {
      ipcRenderer.send("window:minimize");
    } catch {}
    try {
      ipcRenderer.invoke("window:minimize").catch(() => {});
    } catch {}
  },
  maximize: () => ipcRenderer.send("window:maximize"),
  restoreAndFocus: () => ipcRenderer.send("window:restore-and-focus"),
  close: () => ipcRenderer.send("window:close"),
  openPrivate: () => ipcRenderer.send("window:open-private"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  setFullScreen: (flag: boolean) => ipcRenderer.send("window:set-fullscreen", flag),
  isFullScreen: () => ipcRenderer.invoke("window:is-fullscreen"),
  setTheme: (mode: "system" | "light" | "dark", resolved?: "light" | "dark") => ipcRenderer.send("theme:set", mode, resolved),
  setTitle: (title: string) => ipcRenderer.send("window:set-title", title),
};

contextBridge.exposeInMainWorld("electron", windowControls);

contextBridge.exposeInMainWorld("forge", {
  platform: process.platform,
  minimize: windowControls.minimize,
  maximize: windowControls.maximize,
  restoreAndFocus: windowControls.restoreAndFocus,
  close: windowControls.close,
  openPrivate: windowControls.openPrivate,
  isMaximized: windowControls.isMaximized,
  setFullScreen: windowControls.setFullScreen,
  isFullScreen: windowControls.isFullScreen,
  setTheme: windowControls.setTheme,
  setTitle: (title: string) => ipcRenderer.send("window:set-title", title),
  shortcuts: {
    onTrigger: (callback: (action: string) => void) => {
      const listener = (_event: any, action: string) => callback(action);
      ipcRenderer.on("shortcut:trigger", listener);
      return () => ipcRenderer.removeListener("shortcut:trigger", listener);
    },
  },
  tabs: {
    onOpenTab: (callback: (data: { url: string }) => void) => {
      const listener = (_event: any, data: { url: string }) => callback(data);
      ipcRenderer.on("tabs:open-tab", listener);
      return () => ipcRenderer.removeListener("tabs:open-tab", listener);
    },
    onAudioChanged: (
      callback: (data: { contentsId: number; isPlayingAudio: boolean; isMuted: boolean }) => void
    ) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on("tabs:audio-changed", listener);
      return () => ipcRenderer.removeListener("tabs:audio-changed", listener);
    },
    getTabsMemory: (items: any[]) =>
      ipcRenderer.invoke("tabs:get-memory", items),
    setMuted: (contentsId: number, isMuted: boolean) =>
      ipcRenderer.invoke("tabs:set-muted", { contentsId, isMuted }),
  },
  downloads: {
    getRecent: () => ipcRenderer.invoke("downloads:get-recent"),
    clearHistory: () => ipcRenderer.invoke("downloads:clear-history"),
    openFolder: () => ipcRenderer.invoke("downloads:open-folder"),
    openFile: (filePath: string) => ipcRenderer.invoke("downloads:open-file", filePath),
    showInFolder: (filePath: string) => ipcRenderer.invoke("downloads:show-in-folder", filePath),
    onDownloadCreated: (callback: (item: any) => void) => {
      const listener = (_event: any, item: any) => callback(item);
      ipcRenderer.on("downloads:item-created", listener);
      return () => ipcRenderer.removeListener("downloads:item-created", listener);
    },
    onDownloadUpdated: (callback: (item: any) => void) => {
      const listener = (_event: any, item: any) => callback(item);
      ipcRenderer.on("downloads:item-updated", listener);
      return () => ipcRenderer.removeListener("downloads:item-updated", listener);
    },
    onDownloadDone: (callback: (item: any) => void) => {
      const listener = (_event: any, item: any) => callback(item);
      ipcRenderer.on("downloads:item-done", listener);
      return () => ipcRenderer.removeListener("downloads:item-done", listener);
    },
  },
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
      const listenerBatch = (_event: any, batch: any[]) => {
        if (Array.isArray(batch)) {
          for (const item of batch) callback(item);
        }
      };
      ipcRenderer.on("network:entry-update", listener);
      ipcRenderer.on("network:entries-batch", listenerBatch);
      return () => {
        ipcRenderer.removeListener("network:entry-update", listener);
        ipcRenderer.removeListener("network:entries-batch", listenerBatch);
      };
    },
    onBatch: (callback: (batch: any[]) => void) => {
      const listener = (_event: any, batch: any[]) => callback(batch);
      ipcRenderer.on("network:entries-batch", listener);
      return () => ipcRenderer.removeListener("network:entries-batch", listener);
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
    guestPreloadPath,
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
    evaluateRequest: (url: string) => ipcRenderer.invoke("adblock:evaluate-request", url),
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
  privacy: {
    getStats: (historyCount?: number) => ipcRenderer.invoke("privacy:get-stats", historyCount),
    getPolicy: () => ipcRenderer.invoke("privacy:get-policy"),
    updatePolicy: (partial: any) => ipcRenderer.invoke("privacy:update-policy", partial),
    cleanNow: (overrideTargets?: any, overrideCookieRule?: any) =>
      ipcRenderer.invoke("privacy:clean-now", overrideTargets, overrideCookieRule),
    cleanTrackersOnly: () => ipcRenderer.invoke("privacy:clean-trackers-only"),
    addProtectedDomain: (domain: string) => ipcRenderer.invoke("privacy:add-protected-domain", domain),
    removeProtectedDomain: (domain: string) => ipcRenderer.invoke("privacy:remove-protected-domain", domain),
    onStatsUpdated: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("privacy:stats-updated", listener);
      return () => ipcRenderer.removeListener("privacy:stats-updated", listener);
    },
    onCleanupCompleted: (callback: (result: any) => void) => {
      const listener = (_event: any, result: any) => callback(result);
      ipcRenderer.on("privacy:cleanup-completed", listener);
      return () => ipcRenderer.removeListener("privacy:cleanup-completed", listener);
    },
    onPolicyChanged: (callback: (policy: any) => void) => {
      const listener = (_event: any, policy: any) => callback(policy);
      ipcRenderer.on("privacy:policy-changed", listener);
      return () => ipcRenderer.removeListener("privacy:policy-changed", listener);
    },
    onClearHistoryRequested: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("privacy:clear-history-requested", listener);
      return () => ipcRenderer.removeListener("privacy:clear-history-requested", listener);
    },
    onClearDownloadsRequested: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on("privacy:clear-downloads-requested", listener);
      return () => ipcRenderer.removeListener("privacy:clear-downloads-requested", listener);
    },
  },
  session: {
    saveBackup: (data: any) => ipcRenderer.invoke("session:save-backup", data),
    getBackup: () => ipcRenderer.invoke("session:get-backup"),
  },
  sessions: {
    clearData: (partition: string, types?: string[]) =>
      ipcRenderer.invoke("sessions:clear-data", partition, types),
  },
  focus: {
    syncState: (payload: any) =>
      ipcRenderer.invoke("focus:sync-state", payload),
  },
  compat: {
    setCORSBypass: (active: boolean) =>
      ipcRenderer.invoke("compat:set-cors-bypass", active),
    getCORSBypass: () =>
      ipcRenderer.invoke("compat:get-cors-bypass"),
    getVersions: () =>
      ipcRenderer.invoke("compat:get-versions"),
    getLocalIp: () =>
      ipcRenderer.invoke("compat:get-local-ip"),
    setEmulation: (targetContentsId: number | undefined, options: any) =>
      ipcRenderer.invoke("compat:set-emulation", targetContentsId, options),
    collectGarbage: (targetContentsId?: number) =>
      ipcRenderer.invoke("compat:collect-garbage", targetContentsId),
    onTabCrashed: (callback: (data: { contentsId: number; reason: string; exitCode: number }) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on("compat:tab-crashed", listener);
      return () => ipcRenderer.removeListener("compat:tab-crashed", listener);
    },
    onDeprecationLogged: (callback: (data: { contentsId: number; level: number; message: string; line: number; source: string }) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on("compat:deprecation-logged", listener);
      return () => ipcRenderer.removeListener("compat:deprecation-logged", listener);
    },
  },
});

