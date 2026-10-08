import { app, session, ipcMain, webContents, type WebContents } from "electron";
import * as os from "os";

let isCorsBypassActive = false;
let bypassPrivateNetworkAccess = true;

export const CWS_POLYFILL_MAIN_WORLD_SCRIPT = `
(function() {
  if (window.__forge_cws_mock_injected || window.__forge_webstore_polyfilled) return;
  window.__forge_cws_mock_injected = true;
  window.__forge_webstore_polyfilled = true;

  if (!window.chrome) window.chrome = {};
  if (!window.chrome.app) {
    window.chrome.app = {
      isInstalled: false,
      InstallState: { DISABLED: "disabled", INSTALLED: "installed", NOT_INSTALLED: "not_installed" },
      RunningState: { CANNOT_RUN: "cannot_run", READY_TO_RUN: "ready_to_run", RUNNING: "running" },
      getDetails: function() { return null; },
      getIsInstalled: function() { return false; },
      runningState: function() { return "cannot_run"; }
    };
  }

  const installedExts = new Set();

  function makeEvent() {
    const list = new Set();
    return {
      addListener: function(fn) { if (typeof fn === "function") list.add(fn); },
      removeListener: function(fn) { list.delete(fn); },
      hasListener: function(fn) { return list.has(fn); },
      hasListeners: function() { return list.size > 0; },
      dispatch: function(...args) {
        for (const fn of list) {
          try { fn(...args); } catch (e) {}
        }
      }
    };
  }

  const onInstallStageChanged = makeEvent();
  const onDownloadProgress = makeEvent();

  function parsePageExtensionDetails() {
    try {
      const href = window.location.href || "";
      const path = window.location.pathname || "";
      const match = path.match(/\\/detail\\/(?:([^/]+)\\/)?([a-z]{32})/i) ||
                    href.match(/\\/detail\\/([a-z]{32})/i) ||
                    href.match(/\\b([a-z]{32})\\b/i);
      const id = match ? (match[2] || match[1] || match[0]).toLowerCase() : "";
      const slug = (match && match[1] && match[1].length !== 32) ? match[1] : "";
      
      let name = "";
      const h1 = document.querySelector("h1");
      if (h1 && h1.textContent) {
        name = h1.textContent.trim();
      } else if (slug) {
        name = slug.split("-").map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
      } else {
        name = (document.title || "").split("-")[0]?.replace(/Chrome Web Store/i, "").trim() || "Extension";
      }

      let iconUrl = "";
      const img = document.querySelector("img[src*='googleusercontent.com'], img[src*='extension']");
      if (img && img.src) iconUrl = img.src;

      return { id: id, name: name, iconUrl: iconUrl, url: href };
    } catch {
      return { id: "", name: "Extension", iconUrl: "", url: "" };
    }
  }

  function triggerForgeInstall(idParam, nameParam, iconParam) {
    const info = parsePageExtensionDetails();
    const id = (idParam || info.id || "").toLowerCase();
    const name = nameParam || info.name || "Chrome Extension";
    const iconUrl = iconParam || info.iconUrl || "";

    if (id) {
      installedExts.add(id);
      if (!Array.isArray(window.__forge_installed_ids)) window.__forge_installed_ids = [];
      if (!window.__forge_installed_ids.includes(id)) window.__forge_installed_ids.push(id);
      console.log("__FORGE_EXT_INSTALL__:" + JSON.stringify({
        id: id,
        name: name,
        iconUrl: iconUrl,
        url: window.location.href
      }));
    }

    try {
      onInstallStageChanged.dispatch("installing");
      setTimeout(function() {
        onInstallStageChanged.dispatch("install_complete");
      }, 50);
    } catch (e) {}

    // Immediately stop any spinning loaders on the page
    stopSpinnersOnPage();
  }

  function stopSpinnersOnPage() {
    function pierce(root) {
      try {
        var spinners = root.querySelectorAll("md-circular-progress, [role='progressbar'], .loading-spinner");
        for (var i = 0; i < spinners.length; i++) {
          spinners[i].style.setProperty("display", "none", "important");
          spinners[i].style.setProperty("visibility", "hidden", "important");
          spinners[i].style.setProperty("pointer-events", "none", "important");
        }
        var buttons = root.querySelectorAll("button, [role='button']");
        for (var j = 0; j < buttons.length; j++) {
          buttons[j].removeAttribute("disabled");
          buttons[j].removeAttribute("aria-busy");
          buttons[j].style.setProperty("pointer-events", "auto", "important");
        }
        var all = root.querySelectorAll("*");
        for (var k = 0; k < all.length; k++) {
          if (all[k].shadowRoot) pierce(all[k].shadowRoot);
        }
      } catch (e) {}
    }
    let count = 0;
    const interval = setInterval(function() {
      count++;
      pierce(document);
      if (count > 15) clearInterval(interval);
    }, 150);
  }

  const mock = {
    onInstallStageChanged: onInstallStageChanged,
    onDownloadProgress: onDownloadProgress,

    beginInstallWithManifest3: function(details, callback) {
      const id = (details && typeof details === "string" ? details : (details && details.id ? details.id : parsePageExtensionDetails().id)).toLowerCase();
      const name = (details && details.localizedName ? details.localizedName : parsePageExtensionDetails().name);
      const icon = (details && details.iconUrl ? details.iconUrl : parsePageExtensionDetails().iconUrl);
      triggerForgeInstall(id, name, icon);

      if (typeof callback === "function") {
        setTimeout(function() { try { callback(""); } catch (e) {} }, 10);
      }
      return Promise.resolve("");
    },

    completeInstall: function(id, callback) {
      if (id) {
        const clean = String(id).toLowerCase();
        installedExts.add(clean);
        if (!Array.isArray(window.__forge_installed_ids)) window.__forge_installed_ids = [];
        if (!window.__forge_installed_ids.includes(clean)) window.__forge_installed_ids.push(clean);
      }
      stopSpinnersOnPage();
      try { onInstallStageChanged.dispatch("install_complete"); } catch (e) {}
      if (typeof callback === "function") {
        setTimeout(function() { try { callback(""); } catch (e) {} }, 10);
      }
      return Promise.resolve("");
    },

    install: function(id, callback) {
      triggerForgeInstall(id);
      if (typeof callback === "function") {
        setTimeout(function() { try { callback(""); } catch (e) {} }, 10);
      }
      return Promise.resolve("");
    },

    getExtensionStatus: function(id, manifest, callback) {
      const cb = typeof manifest === "function" ? manifest : callback;
      const targetId = String(id || parsePageExtensionDetails().id || "").toLowerCase();
      const list = Array.isArray(window.__forge_installed_ids) ? window.__forge_installed_ids : [];
      const isInstalled = targetId ? (installedExts.has(targetId) || list.includes(targetId)) : false;
      const status = isInstalled ? "enabled" : "installable";
      if (typeof cb === "function") {
        try { cb(status); } catch (e) {}
      }
      return Promise.resolve(status);
    },

    getBrowserLogin: function(cb) { if (cb) cb({ login: "" }); return Promise.resolve({ login: "" }); },
    getStoreLogin: function(cb) { if (cb) cb(""); return Promise.resolve(""); },
    setStoreLogin: function(login, cb) { if (cb) cb(); return Promise.resolve(); },
    getWebGLStatus: function(cb) { if (cb) cb("webgl_allowed"); return Promise.resolve("webgl_allowed"); },
    getIsLauncherEnabled: function(cb) { if (cb) cb(false); return Promise.resolve(false); },
    isInIncognitoMode: function(cb) { if (cb) cb(false); return Promise.resolve(false); },
    isPendingCustodianApproval: function(id, cb) { if (cb) cb(false); return Promise.resolve(false); },
    getReferrerChain: function(cb) { if (cb) cb(""); return Promise.resolve(""); },
    getFullChromeVersion: function(cb) { if (cb) cb({ version_number: "134.0.6998.88" }); return Promise.resolve({ version_number: "134.0.6998.88" }); },
    getMV2DeprecationStatus: function(cb) { if (cb) cb("inactive"); return Promise.resolve("inactive"); },
    shouldShowEnterprisePromotionBanner: function(cb) { if (cb) cb("PROMOTION_TYPE_UNSPECIFIED"); return Promise.resolve("PROMOTION_TYPE_UNSPECIFIED"); }
  };

  try {
    Object.defineProperty(window.chrome, "webstorePrivate", {
      value: mock,
      writable: true,
      configurable: true
    });
  } catch (e) {
    window.chrome.webstorePrivate = mock;
  }

  if (!window.chrome.management) {
    window.chrome.management = {
      get: function(id, cb) {
        const info = { id: id, name: "Extension", enabled: true, installType: "normal" };
        if (typeof cb === "function") cb(info);
        return Promise.resolve(info);
      },
      getAll: function(cb) {
        if (typeof cb === "function") cb([]);
        return Promise.resolve([]);
      },
      onInstalled: makeEvent(),
      onUninstalled: makeEvent(),
      onEnabled: makeEvent(),
      onDisabled: makeEvent()
    };
  }
})();
`;

/**
 * Configure response header rewriting for developer CORS bypass, CSP stripping for CWS, and PiP/Fullscreen policies
 */
export function setupCorsBypassInterceptor(targetSession: Electron.Session) {
  try {
    targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const urlLower = (details.url || "").toLowerCase();
      const isGoogle = urlLower.includes("google.com");
      const requestHeaders = { ...(details.requestHeaders || {}) };

      if (isGoogle) {
        requestHeaders["User-Agent"] =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";
        requestHeaders["sec-ch-ua"] =
          '"Google Chrome";v="134", "Chromium";v="134", "Not:A-Brand";v="24"';
        requestHeaders["sec-ch-ua-mobile"] = "?0";
        requestHeaders["sec-ch-ua-platform"] = '"Windows"';
        requestHeaders["sec-ch-ua-platform-version"] = '"15.0.0"';
      }

      callback({ requestHeaders });
    });
  } catch {}

  targetSession.webRequest.onHeadersReceived((details, callback) => {
    const urlLower = (details.url || "").toLowerCase();
    const isChromeWebStore =
      urlLower.includes("chromewebstore.google.com") ||
      urlLower.includes("chrome.google.com") ||
      urlLower.includes("clients2.google.com");

    const responseHeaders = { ...(details.responseHeaders || {}) };

    // Strip restrictive CSP headers for Chrome Web Store so our polyfill scripts can execute freely
    if (isChromeWebStore) {
      delete responseHeaders["content-security-policy"];
      delete responseHeaders["content-security-policy-report-only"];
      delete responseHeaders["Content-Security-Policy"];
      delete responseHeaders["Content-Security-Policy-Report-Only"];
    }

    // Strip deprecated/invalid 'X-Frame-Options: ALLOW-FROM' directives (e.g. from ogs.google.com)
    // which modern Chromium/Blink no longer recognizes and logs as a console error
    for (const key of Object.keys(responseHeaders)) {
      if (key.toLowerCase() === "x-frame-options") {
        const val = responseHeaders[key];
        const hasAllowFrom = (s: string) => s.toLowerCase().includes("allow-from");
        if (Array.isArray(val) && val.some(hasAllowFrom)) {
          delete responseHeaders[key];
        } else if (typeof val === "string" && hasAllowFrom(val)) {
          delete responseHeaders[key];
        }
      }
    }

    // Ensure Permissions-Policy & Feature-Policy do not restrict Picture-in-Picture or Fullscreen
    for (const key of Object.keys(responseHeaders)) {
      const lower = key.toLowerCase();
      if (lower === "permissions-policy" || lower === "feature-policy") {
        const val = responseHeaders[key];
        if (Array.isArray(val)) {
          responseHeaders[key] = val.map((v) =>
            v.replace(/picture-in-picture=\(\)/gi, "picture-in-picture=*")
             .replace(/fullscreen=\(\)/gi, "fullscreen=*")
          );
        } else if (typeof val === "string") {
          responseHeaders[key] = val
            .replace(/picture-in-picture=\(\)/gi, "picture-in-picture=*")
            .replace(/fullscreen=\(\)/gi, "fullscreen=*");
        }
      }
    }

    if (isCorsBypassActive) {
      const reqOrigin = details.requestHeaders?.Origin || details.requestHeaders?.origin || "*";
      responseHeaders["access-control-allow-origin"] = [reqOrigin];
      responseHeaders["access-control-allow-methods"] = ["GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD"];
      responseHeaders["access-control-allow-headers"] = ["*"];
      responseHeaders["access-control-allow-credentials"] = ["true"];

      if (bypassPrivateNetworkAccess) {
        responseHeaders["access-control-allow-private-network"] = ["true"];
      }

      delete responseHeaders["x-frame-options"];
      delete responseHeaders["X-Frame-Options"];
    }

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

    const injectCwsPolyfill = () => {
      try {
        if (!contents || contents.isDestroyed()) return;
        const u = (contents.getURL() || "").toLowerCase();
        if (u.includes("chromewebstore.google.com") || u.includes("chrome.google.com")) {
          contents.executeJavaScript(CWS_POLYFILL_MAIN_WORLD_SCRIPT).catch(() => {});
        }
      } catch {}
    };

    // Note: NEVER executeJavaScript on 'did-start-navigation'!
    // Calling executeJavaScript while navigation is in-flight crashes Chromium with STATUS_ACCESS_VIOLATION (0xC0000005).
    // Safe script injection must strictly occur only when the frame/DOM is ready.
    contents.on("dom-ready", injectCwsPolyfill);
    contents.on("did-finish-load", injectCwsPolyfill);
    contents.on("did-navigate-in-page", injectCwsPolyfill);

    contents.on("render-process-gone", (_ev, details) => {
      try {
        console.warn(`[Compat Manager] Guest webview ${contents.id} render process gone:`, details?.reason, details?.exitCode);
        const allWeb = webContents.getAllWebContents();
        for (const w of allWeb) {
          if (w.getType() === "window" && !w.isDestroyed()) {
            try {
              w.send("compat:tab-crashed", {
                contentsId: contents.id,
                reason: details?.reason,
                exitCode: details?.exitCode,
              });
            } catch {}
          }
        }
      } catch {}
    });

    contents.on("console-message", (event: any, ...rest: any[]) => {
      try {
        let msg = "";
        let lvl = 0;
        let ln = 0;
        let src = "";

        // Support both Electron 30+ ConsoleMessageEventParams object and legacy parameters
        if (event && typeof event.message === "string") {
          msg = event.message;
          lvl = Number(event.level || 0);
          ln = Number(event.line || 0);
          src = String(event.sourceId || "");
        } else if (rest[0] && typeof rest[0] === "object" && typeof rest[0].message === "string") {
          msg = rest[0].message;
          lvl = Number(rest[0].level || 0);
          ln = Number(rest[0].line || 0);
          src = String(rest[0].sourceId || "");
        } else if (typeof rest[1] === "string") {
          lvl = Number(rest[0] || 0);
          msg = rest[1];
          ln = Number(rest[2] || 0);
          src = String(rest[3] || "");
        } else if (typeof rest[0] === "string") {
          msg = rest[0];
        }

        if (!msg || typeof msg !== "string") return;

        const lower = msg.toLowerCase();
        if (lower.includes("deprecation") || lower.includes("[deprecation]")) {
          const allWeb = webContents.getAllWebContents();
          for (const w of allWeb) {
            if (w.getType() === "window" && !w.isDestroyed()) {
              try {
                w.send("compat:deprecation-logged", {
                  contentsId: contents.id,
                  level: lvl,
                  message: msg,
                  line: ln,
                  source: src,
                });
              } catch {}
            }
          }
        }
      } catch (err) {
        // Guard against any logging parsing errors to never crash the main process
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
