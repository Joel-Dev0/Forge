import { app, BrowserWindow, ipcMain, nativeTheme, session, type WebContents } from "electron";
import type { NetworkEntry, NetworkResourceType } from "./types.js";
import { evaluateAdBlockRequest, getEngineInstance } from "../adblock/adblockAdapter.js";
import { stripTrackingParameters } from "@forge/adblock-engine";
import { checkVpnKillSwitch } from "./vpnAdapter.js";

const entries = new Map<string, NetworkEntry>();
const contentsDebuggerMap = new Map<number, WebContents>();
const requestContentsMap = new Map<string, number>();

let currentNetworkTheme: "light" | "dark" = nativeTheme.shouldUseDarkColors ? "dark" : "light";

export function setNetworkMonitorTheme(theme: "light" | "dark") {
  currentNetworkTheme = theme;
}

export function getNetworkMonitorTheme(): "light" | "dark" {
  return currentNetworkTheme;
}

function getBaseName(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const parts = pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) {
      return parsed.search ? `${last}${parsed.search.substring(0, 20)}` : last;
    }
    return parsed.hostname + (parsed.pathname === "/" ? "" : parsed.pathname);
  } catch {
    return urlStr.substring(0, 40);
  }
}

function normalizeType(type?: string): NetworkResourceType {
  if (!type) return "other";
  const lower = type.toLowerCase();
  if (lower.includes("xhr")) return "xhr";
  if (lower.includes("fetch")) return "fetch";
  if (lower.includes("document") || lower.includes("doc")) return "document";
  if (lower.includes("script") || lower.includes("js")) return "script";
  if (lower.includes("stylesheet") || lower.includes("css")) return "stylesheet";
  if (lower.includes("image") || lower.includes("img") || lower.includes("png") || lower.includes("jpg") || lower.includes("svg")) return "image";
  if (lower.includes("font")) return "font";
  if (lower.includes("media") || lower.includes("video") || lower.includes("audio")) return "media";
  return "other";
}

export function initNetworkMonitor(getMainWindow: () => BrowserWindow | null) {
  let pendingBatch: NetworkEntry[] = [];
  let throttleTimer: NodeJS.Timeout | null = null;

  function flushBatch() {
    throttleTimer = null;
    if (pendingBatch.length === 0) return;
    const batch = pendingBatch;
    pendingBatch = [];
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("network:entries-batch", batch);
    }
  }

  function broadcastEntry(entry: NetworkEntry) {
    pendingBatch.push(entry);
    if (!throttleTimer) {
      throttleTimer = setTimeout(flushBatch, 50);
    }
  }

  // 1. Chrome DevTools Protocol (CDP) for capturing full requests & response bodies
  app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "webview") return;

    const contentsId = contents.id;
    contentsDebuggerMap.set(contentsId, contents);

    const attachCdp = () => {
      try {
        if (!contents.debugger.isAttached()) {
          contents.debugger.attach("1.3");
        }

        contents.debugger.sendCommand("Network.enable", {
          maxPostDataSize: 10 * 1024 * 1024,
          maxResourceBufferSize: 10 * 1024 * 1024,
          maxTotalBufferSize: 50 * 1024 * 1024,
        }).catch(() => {});

        contents.debugger.on("message", async (_dbgEvent, method, params) => {
          if (method === "Network.requestWillBeSent") {
            const req = params.request;
            const entryId = String(params.requestId);
            const startTime = Math.round(params.timestamp * 1000);

            requestContentsMap.set(entryId, contentsId);

            const existing = entries.get(entryId);
            const entry: NetworkEntry = {
              id: entryId,
              url: req.url,
              name: getBaseName(req.url),
              method: req.method || "GET",
              resourceType: normalizeType(params.type),
              status: existing ? existing.status : 0,
              statusText: existing ? existing.statusText : "Pending",
              mimeType: undefined,
              requestHeaders: req.headers || {},
              responseHeaders: existing ? existing.responseHeaders : {},
              postData: req.postData || (req.hasPostData ? "(Payload available)" : undefined),
              size: 0,
              startTime: startTime || Date.now(),
              duration: 0,
              state: "pending",
              initiator: params.initiator?.type,
            };

            entries.set(entryId, entry);
            broadcastEntry(entry);
          } else if (method === "Network.responseReceived") {
            const entryId = String(params.requestId);
            const entry = entries.get(entryId);
            const resp = params.response;

            if (entry && resp) {
              entry.status = resp.status;
              entry.statusText = resp.statusText || String(resp.status);
              entry.mimeType = resp.mimeType;
              entry.responseHeaders = resp.headers || {};
              if (params.type) entry.resourceType = normalizeType(params.type);

              broadcastEntry(entry);
            }
          } else if (method === "Network.loadingFinished") {
            const entryId = String(params.requestId);
            const entry = entries.get(entryId);

            if (entry) {
              const finishTime = Math.round(params.timestamp * 1000);
              entry.duration = finishTime > entry.startTime ? finishTime - entry.startTime : 1;
              entry.size = params.encodedDataLength || entry.size;
              entry.state = "completed";

              // Do not eagerly download response bodies for every subrequest to prevent queue blocking.
              // Response bodies are fetched on-demand in network:get-body when inspected in DevTools.
              broadcastEntry(entry);
            }
          } else if (method === "Network.loadingFailed") {
            const entryId = String(params.requestId);
            const entry = entries.get(entryId);
            if (entry) {
              entry.state = "failed";
              entry.error = params.errorText || "Request failed";
              if (params.canceled) entry.error = "Canceled";
              broadcastEntry(entry);
            }
          }
        });
      } catch (err) {
        console.warn("Forge Network Monitor: Could not attach CDP debugger:", err);
      }
    };

    contents.once("dom-ready", attachCdp);
    contents.on("destroyed", () => {
      contentsDebuggerMap.delete(contentsId);
    });
  });

  function getSourceUrl(details: { referrer?: string; webContentsId?: number; frame?: any }): string | undefined {
    try {
      if (details.referrer) return details.referrer;
      if (details.frame && details.frame.url) return details.frame.url;
      if (details.webContentsId) {
        const contents = contentsDebuggerMap.get(details.webContentsId);
        if (contents && !contents.isDestroyed()) {
          return contents.getURL();
        }
      }
    } catch {}
    return undefined;
  }

  // 2. session.webRequest as fallback & global logger
  const ses = session.fromPartition("persist:forge");

  ses.webRequest.onBeforeRequest((details, callback) => {
    try {
      const entryId = String(details.id);
      const sourceUrl = getSourceUrl(details);

      // 0. Enforce VPN Kill Switch if active
      if (checkVpnKillSwitch(details.url)) {
        callback({ cancel: true });
        return;
      }

      // 1. Evaluate with AdBlock Engine
      const adblock = evaluateAdBlockRequest({
        url: details.url,
        method: details.method,
        resourceType: details.resourceType,
        referrer: sourceUrl,
      });

      if (adblock.cancel) {
        const entry: NetworkEntry = {
          id: entryId,
          url: details.url,
          name: getBaseName(details.url),
          method: details.method || "GET",
          resourceType: normalizeType(details.resourceType),
          status: 0,
          statusText: "Blocked by AdBlock",
          requestHeaders: {},
          responseHeaders: {},
          size: 0,
          startTime: Date.now(),
          duration: 0,
          state: "failed",
          error: `net::ERR_BLOCKED_BY_CLIENT (${adblock.decision.rule?.raw || "AdBlock"})`,
        };
        entries.set(entryId, entry);
        broadcastEntry(entry);

        callback({ cancel: true });
        return;
      }

      // 2. Strip tracking query parameters if Tracker Protection is enabled
      const engine = getEngineInstance();
      if (engine.isEnabled() && engine.isFeatureEnabled("trackerProtection")) {
        const stripped = stripTrackingParameters(details.url);
        if (stripped.strippedParams.length > 0 && stripped.cleanUrl !== details.url) {
          callback({ redirectURL: stripped.cleanUrl });
          return;
        }
      }

      let postData: string | undefined;

      if (details.uploadData && details.uploadData.length > 0) {
        try {
          const parts = details.uploadData
            .map((u) => (u.bytes ? u.bytes.toString("utf-8") : ""))
            .filter(Boolean);
          if (parts.length > 0) postData = parts.join("");
        } catch {}
      }

      if (!entries.has(entryId)) {
        const entry: NetworkEntry = {
          id: entryId,
          url: details.url,
          name: getBaseName(details.url),
          method: details.method || "GET",
          resourceType: normalizeType(details.resourceType),
          status: 0,
          statusText: "Pending",
          requestHeaders: {},
          responseHeaders: {},
          postData,
          size: 0,
          startTime: Date.now(),
          duration: 0,
          state: "pending",
        };
        entries.set(entryId, entry);
        broadcastEntry(entry);
      } else if (postData) {
        const entry = entries.get(entryId)!;
        entry.postData = postData;
        broadcastEntry(entry);
      }

      callback({});
    } catch (err) {
      console.warn("[NetworkMonitor] onBeforeRequest error:", err);
      callback({});
    }
  });

  // Allowed requests pass directly without repeating expensive regex matching passes
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    try {
      const requestHeaders = { ...(details.requestHeaders || {}) };
      // Synchronize client hints for color scheme so search engines and websites serve matching HTML
      requestHeaders["Sec-CH-Prefers-Color-Scheme"] = currentNetworkTheme;
      callback({ requestHeaders });
    } catch {
      callback({});
    }
  });

  ses.webRequest.onHeadersReceived((details, callback) => {
    try {
      const entryId = String(details.id);
      const entry = entries.get(entryId);
      const responseHeaders = { ...(details.responseHeaders || {}) };

      const urlLower = (details.url || "").toLowerCase();
      if (
        urlLower.includes("chromewebstore.google.com") ||
        urlLower.includes("chrome.google.com") ||
        urlLower.includes("clients2.google.com")
      ) {
        delete responseHeaders["content-security-policy"];
        delete responseHeaders["content-security-policy-report-only"];
        delete responseHeaders["Content-Security-Policy"];
        delete responseHeaders["Content-Security-Policy-Report-Only"];
      }

      // Strip deprecated/invalid 'X-Frame-Options: ALLOW-FROM' directives (e.g. from ogs.google.com)
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

      // Ensure Permissions-Policy & Feature-Policy do not restrict Picture-in-Picture or Fullscreen on any page
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

      if (entry) {
        entry.status = details.statusCode;
        entry.statusText = details.statusLine ? details.statusLine.replace(/^HTTP\/\d\.\d\s+\d+\s*/, "") : "OK";
        if (responseHeaders) {
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(responseHeaders)) {
            headers[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : v;
          }
          entry.responseHeaders = headers;
          if (headers["content-type"]) {
            entry.mimeType = headers["content-type"].split(";")[0].trim();
          }
        }
        broadcastEntry(entry);
      }
      callback({ responseHeaders });
    } catch {
      callback({ responseHeaders: details.responseHeaders });
    }
  });

  ses.webRequest.onCompleted((details) => {
    const entryId = String(details.id);
    const entry = entries.get(entryId);
    if (entry) {
      entry.status = details.statusCode;
      entry.state = "completed";
      entry.duration = Math.max(1, Date.now() - entry.startTime);
      broadcastEntry(entry);
    }
  });

  ses.webRequest.onErrorOccurred((details) => {
    const entryId = String(details.id);
    const entry = entries.get(entryId);
    if (entry) {
      entry.state = "failed";
      entry.error = details.error || "Network error";
      broadcastEntry(entry);
    }
  });

  // 3. Register IPC methods
  ipcMain.handle("network:get-body", async (_event, requestId: string) => {
    const entry = entries.get(requestId);
    if (entry?.responseBody) return entry.responseBody;

    // Fetch on-demand via CDP if available
    const cId = requestContentsMap.get(requestId);
    if (cId) {
      const contents = contentsDebuggerMap.get(cId);
      if (contents && !contents.isDestroyed()) {
        try {
          if (contents.debugger.isAttached()) {
            const bodyResult: any = await contents.debugger.sendCommand("Network.getResponseBody", {
              requestId,
            });
            if (bodyResult && bodyResult.body) {
              const body = bodyResult.base64Encoded
                ? Buffer.from(bodyResult.body, "base64").toString("utf-8")
                : bodyResult.body;
              if (entry) {
                entry.responseBody = body;
                entry.hasResponseBody = true;
              }
              return body;
            }
          }
        } catch {
          // Response body might not be cached in CDP for certain data/redirects
        }
      }
    }
    return entry?.responseBody || null;
  });

  ipcMain.on("network:clear", () => {
    entries.clear();
    requestContentsMap.clear();
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("network:cleared");
    }
  });
}
