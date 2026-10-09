// electron/preload.ts
var import_electron = require("electron");
var guestPreloadPath = "";
try {
  guestPreloadPath = import_electron.ipcRenderer.sendSync("adblock:get-guest-preload-path-sync") || "";
} catch {
}
var windowControls = {
  minimize: () => {
    try {
      import_electron.ipcRenderer.send("window:minimize");
    } catch {
    }
    try {
      import_electron.ipcRenderer.invoke("window:minimize").catch(() => {
      });
    } catch {
    }
  },
  maximize: () => import_electron.ipcRenderer.send("window:maximize"),
  restoreAndFocus: () => import_electron.ipcRenderer.send("window:restore-and-focus"),
  close: () => import_electron.ipcRenderer.send("window:close"),
  openPrivate: () => import_electron.ipcRenderer.send("window:open-private"),
  isMaximized: () => import_electron.ipcRenderer.invoke("window:is-maximized"),
  setFullScreen: (flag) => import_electron.ipcRenderer.send("window:set-fullscreen", flag),
  isFullScreen: () => import_electron.ipcRenderer.invoke("window:is-fullscreen"),
  setTheme: (mode, resolved) => import_electron.ipcRenderer.send("theme:set", mode, resolved),
  setTitle: (title) => import_electron.ipcRenderer.send("window:set-title", title)
};
import_electron.contextBridge.exposeInMainWorld("electron", windowControls);
import_electron.contextBridge.exposeInMainWorld("forge", {
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
  setTitle: (title) => import_electron.ipcRenderer.send("window:set-title", title),
  shortcuts: {
    onTrigger: (callback) => {
      const listener = (_event, action) => callback(action);
      import_electron.ipcRenderer.on("shortcut:trigger", listener);
      return () => import_electron.ipcRenderer.removeListener("shortcut:trigger", listener);
    }
  },
  tabs: {
    onOpenTab: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("tabs:open-tab", listener);
      return () => import_electron.ipcRenderer.removeListener("tabs:open-tab", listener);
    },
    onAudioChanged: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("tabs:audio-changed", listener);
      return () => import_electron.ipcRenderer.removeListener("tabs:audio-changed", listener);
    },
    getTabsMemory: (items) => import_electron.ipcRenderer.invoke("tabs:get-memory", items),
    setMuted: (contentsId, isMuted) => import_electron.ipcRenderer.invoke("tabs:set-muted", { contentsId, isMuted })
  },
  downloads: {
    start: (url, filename) => import_electron.ipcRenderer.invoke("downloads:start", { url, filename }),
    getRecent: () => import_electron.ipcRenderer.invoke("downloads:get-recent"),
    clearHistory: () => import_electron.ipcRenderer.invoke("downloads:clear-history"),
    openFolder: () => import_electron.ipcRenderer.invoke("downloads:open-folder"),
    openFile: (filePath) => import_electron.ipcRenderer.invoke("downloads:open-file", filePath),
    showInFolder: (filePath) => import_electron.ipcRenderer.invoke("downloads:show-in-folder", filePath),
    onDownloadCreated: (callback) => {
      const listener = (_event, item) => callback(item);
      import_electron.ipcRenderer.on("downloads:item-created", listener);
      return () => import_electron.ipcRenderer.removeListener("downloads:item-created", listener);
    },
    onDownloadUpdated: (callback) => {
      const listener = (_event, item) => callback(item);
      import_electron.ipcRenderer.on("downloads:item-updated", listener);
      return () => import_electron.ipcRenderer.removeListener("downloads:item-updated", listener);
    },
    onDownloadDone: (callback) => {
      const listener = (_event, item) => callback(item);
      import_electron.ipcRenderer.on("downloads:item-done", listener);
      return () => import_electron.ipcRenderer.removeListener("downloads:item-done", listener);
    }
  },
  pip: {
    onActivateTabByContentsId: (callback) => {
      const listener = (_event, contentsId) => callback(contentsId);
      import_electron.ipcRenderer.on("webview:activate-tab-by-contents-id", listener);
      return () => import_electron.ipcRenderer.removeListener("webview:activate-tab-by-contents-id", listener);
    }
  },
  contextMenu: {
    onShow: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("browser:context-menu", listener);
      return () => import_electron.ipcRenderer.removeListener("browser:context-menu", listener);
    },
    inspectElement: (data) => import_electron.ipcRenderer.invoke("browser:inspect-element", data)
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
      const listenerBatch = (_event, batch) => {
        if (Array.isArray(batch)) {
          for (const item of batch) callback(item);
        }
      };
      import_electron.ipcRenderer.on("network:entry-update", listener);
      import_electron.ipcRenderer.on("network:entries-batch", listenerBatch);
      return () => {
        import_electron.ipcRenderer.removeListener("network:entry-update", listener);
        import_electron.ipcRenderer.removeListener("network:entries-batch", listenerBatch);
      };
    },
    onBatch: (callback) => {
      const listener = (_event, batch) => callback(batch);
      import_electron.ipcRenderer.on("network:entries-batch", listener);
      return () => import_electron.ipcRenderer.removeListener("network:entries-batch", listener);
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
    guestPreloadPath,
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
    evaluateRequest: (url, referrer) => import_electron.ipcRenderer.invoke("adblock:evaluate-request", { url, referrer }),
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
  },
  privacy: {
    getStats: (historyCount) => import_electron.ipcRenderer.invoke("privacy:get-stats", historyCount),
    getPolicy: () => import_electron.ipcRenderer.invoke("privacy:get-policy"),
    updatePolicy: (partial) => import_electron.ipcRenderer.invoke("privacy:update-policy", partial),
    cleanNow: (overrideTargets, overrideCookieRule) => import_electron.ipcRenderer.invoke("privacy:clean-now", overrideTargets, overrideCookieRule),
    cleanTrackersOnly: () => import_electron.ipcRenderer.invoke("privacy:clean-trackers-only"),
    addProtectedDomain: (domain) => import_electron.ipcRenderer.invoke("privacy:add-protected-domain", domain),
    removeProtectedDomain: (domain) => import_electron.ipcRenderer.invoke("privacy:remove-protected-domain", domain),
    onStatsUpdated: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("privacy:stats-updated", listener);
      return () => import_electron.ipcRenderer.removeListener("privacy:stats-updated", listener);
    },
    onCleanupCompleted: (callback) => {
      const listener = (_event, result) => callback(result);
      import_electron.ipcRenderer.on("privacy:cleanup-completed", listener);
      return () => import_electron.ipcRenderer.removeListener("privacy:cleanup-completed", listener);
    },
    onPolicyChanged: (callback) => {
      const listener = (_event, policy) => callback(policy);
      import_electron.ipcRenderer.on("privacy:policy-changed", listener);
      return () => import_electron.ipcRenderer.removeListener("privacy:policy-changed", listener);
    },
    onClearHistoryRequested: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("privacy:clear-history-requested", listener);
      return () => import_electron.ipcRenderer.removeListener("privacy:clear-history-requested", listener);
    },
    onClearDownloadsRequested: (callback) => {
      const listener = () => callback();
      import_electron.ipcRenderer.on("privacy:clear-downloads-requested", listener);
      return () => import_electron.ipcRenderer.removeListener("privacy:clear-downloads-requested", listener);
    },
    createSession: (mode, name) => import_electron.ipcRenderer.invoke("privacy:create-session", mode, name),
    destroySession: (sessionId) => import_electron.ipcRenderer.invoke("privacy:destroy-session", sessionId),
    registerTab: (sessionId) => import_electron.ipcRenderer.invoke("privacy:register-tab", sessionId),
    unregisterTab: (sessionId) => import_electron.ipcRenderer.invoke("privacy:unregister-tab", sessionId),
    getSessions: () => import_electron.ipcRenderer.invoke("privacy:get-sessions")
  },
  tor: {
    getStatus: () => import_electron.ipcRenderer.invoke("tor:get-status"),
    connect: () => import_electron.ipcRenderer.invoke("tor:connect"),
    disconnect: () => import_electron.ipcRenderer.invoke("tor:disconnect"),
    newCircuit: () => import_electron.ipcRenderer.invoke("tor:new-circuit"),
    testLeak: () => import_electron.ipcRenderer.invoke("tor:test-leak"),
    onStatusChanged: (callback) => {
      const listener = (_event, status) => callback(status);
      import_electron.ipcRenderer.on("tor:status-changed", listener);
      return () => import_electron.ipcRenderer.removeListener("tor:status-changed", listener);
    },
    onCircuitChanged: (callback) => {
      const listener = (_event, circuit) => callback(circuit);
      import_electron.ipcRenderer.on("tor:circuit-changed", listener);
      return () => import_electron.ipcRenderer.removeListener("tor:circuit-changed", listener);
    }
  },
  session: {
    saveBackup: (data) => import_electron.ipcRenderer.invoke("session:save-backup", data),
    getBackup: () => import_electron.ipcRenderer.invoke("session:get-backup")
  },
  sessions: {
    clearData: (partition, types) => import_electron.ipcRenderer.invoke("sessions:clear-data", partition, types)
  },
  focus: {
    syncState: (payload) => import_electron.ipcRenderer.invoke("focus:sync-state", payload)
  },
  compat: {
    setCORSBypass: (active) => import_electron.ipcRenderer.invoke("compat:set-cors-bypass", active),
    getCORSBypass: () => import_electron.ipcRenderer.invoke("compat:get-cors-bypass"),
    getVersions: () => import_electron.ipcRenderer.invoke("compat:get-versions"),
    getLocalIp: () => import_electron.ipcRenderer.invoke("compat:get-local-ip"),
    setEmulation: (targetContentsId, options) => import_electron.ipcRenderer.invoke("compat:set-emulation", targetContentsId, options),
    collectGarbage: (targetContentsId) => import_electron.ipcRenderer.invoke("compat:collect-garbage", targetContentsId),
    onTabCrashed: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("compat:tab-crashed", listener);
      return () => import_electron.ipcRenderer.removeListener("compat:tab-crashed", listener);
    },
    onDeprecationLogged: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("compat:deprecation-logged", listener);
      return () => import_electron.ipcRenderer.removeListener("compat:deprecation-logged", listener);
    }
  },
  extensions: {
    installFromWebStore: (extId, url) => import_electron.ipcRenderer.invoke("extensions:install-from-cws", { extId, url }),
    uninstall: (extId) => import_electron.ipcRenderer.invoke("extensions:uninstall", { extId }),
    listInstalled: () => import_electron.ipcRenderer.invoke("extensions:list-installed"),
    // Fix #4 + Phase 6: Open extension popup window with optional anchorBounds
    openPopup: (extId, anchorBounds) => import_electron.ipcRenderer.invoke("extensions:open-popup", { extId, anchorBounds }),
    getPopupInfo: (extId) => import_electron.ipcRenderer.invoke("extensions:get-popup-info", { extId }),
    // Phase 1 Diagnostics: Query extension compatibility data
    getDiagnostics: (extId) => import_electron.ipcRenderer.invoke("extensions:diagnostics", extId ? { extId } : void 0),
    getDiagnosticsSummary: () => import_electron.ipcRenderer.invoke("extensions:diagnostics-summary"),
    getSessionBridgeSummary: () => import_electron.ipcRenderer.invoke("extensions:session-bridge-summary"),
    // Phase 3: Tab Bridge
    getTabSummary: () => import_electron.ipcRenderer.invoke("extensions:tabs:summary"),
    syncTabs: (tabs) => import_electron.ipcRenderer.invoke("extensions:tabs:sync", tabs),
    setActiveTab: (webContentsId) => import_electron.ipcRenderer.invoke("extensions:tabs:set-active", webContentsId),
    queryTabs: (filter) => import_electron.ipcRenderer.invoke("extensions:tabs:query", filter),
    sendMessageToTab: (tabId, message) => import_electron.ipcRenderer.invoke("extensions:tabs:send-message", { tabId, message }),
    // Phase 5: Messaging Bridge
    sendMessage: (extensionId, message) => import_electron.ipcRenderer.invoke("extensions:runtime:send-message", { extensionId, message }),
    broadcastMessage: (message, filter) => import_electron.ipcRenderer.invoke("extensions:runtime:broadcast", { message, filter }),
    getMessageStats: () => import_electron.ipcRenderer.invoke("extensions:message:stats"),
    // Phase 6: Action & Badges
    getAllBadges: (tabId) => import_electron.ipcRenderer.invoke("extensions:action:get-all-badges", tabId),
    getBadge: (extensionId, tabId) => import_electron.ipcRenderer.invoke("extensions:action:get-badge", { extensionId, tabId }),
    onBadgeUpdated: (callback) => {
      const listener = (_event, data) => callback(data);
      import_electron.ipcRenderer.on("extensions:action:badge-updated", listener);
      return () => import_electron.ipcRenderer.removeListener("extensions:action:badge-updated", listener);
    },
    // Phase 7: Service Worker Lifecycle
    getServiceWorkerStatuses: () => import_electron.ipcRenderer.invoke("extensions:sw:get-statuses"),
    wakeServiceWorker: (extensionId) => import_electron.ipcRenderer.invoke("extensions:sw:wake", { extensionId })
  },
  pwa: {
    registerTab: (tabId, contentsId) => import_electron.ipcRenderer.send("pwa:register-tab", { tabId, contentsId }),
    getEligibility: (tabId) => import_electron.ipcRenderer.invoke("pwa:get-eligibility", tabId),
    requestInstall: (tabId) => import_electron.ipcRenderer.invoke("pwa:request-install", tabId),
    getInstalled: () => import_electron.ipcRenderer.invoke("pwa:get-installed"),
    launchInstalled: (appId) => import_electron.ipcRenderer.invoke("pwa:launch-installed", appId),
    uninstall: (appId) => import_electron.ipcRenderer.invoke("pwa:uninstall", appId),
    onEligibilityUpdated: (callback) => {
      const listener = (_event, result) => callback(result);
      import_electron.ipcRenderer.on("pwa:eligibility-updated", listener);
      return () => import_electron.ipcRenderer.removeListener("pwa:eligibility-updated", listener);
    }
  }
});
