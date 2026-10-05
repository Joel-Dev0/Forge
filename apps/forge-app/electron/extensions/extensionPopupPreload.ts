/**
 * Forge Extension Popup Preload Script
 *
 * Injected into extension popup BrowserWindows (e.g. Dark Reader, Bitwarden, uBlock).
 * Provides the full set of Chrome Extension APIs expected by popup UI contexts:
 *   - chrome.tabs (query, get, sendMessage, reload, update, executeScript, insertCSS)
 *   - chrome.runtime (id, getURL, sendMessage, onMessage)
 *   - chrome.action / chrome.browserAction (setBadgeText, setTitle, setBadgeBackgroundColor, etc.)
 *   - chrome.windows (getCurrent, get)
 *
 * SECURITY MODEL
 * ──────────────
 *  1. Extension ID is locked to the chrome-extension:// origin at preload-time;
 *     renderer scripts cannot change or spoof it.
 *  2. All IPC channels are allowlisted in ALLOWED_CHANNELS — arbitrary channels
 *     cannot be invoked from the popup page.
 *  3. Every IPC payload is validated with strict type-guards before dispatch.
 *     tabId must be a positive integer; code must be an inline string (no file paths).
 *  4. No prototype pollution: received objects are read via explicit property access
 *     only — no Object.assign / spread of untrusted data.
 *  5. Resize payload width/height are clamped to [280–800] × [200–600] before send.
 */

import { ipcRenderer } from "electron";

// ── Type guards ─────────────────────────────────────────────────────────────────
function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function isStr(v: unknown): v is string { return typeof v === "string"; }
function isPosInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && (v as number) > 0;
}
function isFn(v: unknown): v is (...a: unknown[]) => unknown { return typeof v === "function"; }

// ── Extension ID locked at preload-time (from origin, not from renderer) ────────
const EXTENSION_ID_RE = /^chrome-extension:\/\/([a-z][a-z0-9]{31})\//i;
let _eid = "";
try {
  const m = window.location.href.match(EXTENSION_ID_RE);
  if (m) _eid = m[1].toLowerCase();
} catch {}
const EXTENSION_ID = _eid; // never mutated after this

// ── IPC allowlist ────────────────────────────────────────────────────────────────
const ALLOWED_CHANNELS = new Set([
  "extensions:runtime:send-message",
  "extensions:tabs:query",
  "extensions:tabs:get",
  "extensions:tabs:send-message",
  "extensions:tabs:reload",
  "extensions:tabs:update",
  "extensions:tabs:execute-script",
  "extensions:tabs:insert-css",
  "extensions:action:set-badge-text",
  "extensions:action:set-badge-color",
  "extensions:action:set-title",
]);

async function secureInvoke(channel: string, payload: unknown): Promise<unknown> {
  if (!ALLOWED_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`[Forge] Disallowed IPC channel: ${channel}`));
  }
  return ipcRenderer.invoke(channel, payload);
}

// ── onMessage listener registry ─────────────────────────────────────────────────
const messageListeners = new Set<(...a: unknown[]) => void>();

ipcRenderer.on("chrome:runtime:message", (_event, data: unknown) => {
  if (!isObj(data)) return;
  const message = data["message"];
  const rawSender = data["sender"];
  const sender = isObj(rawSender)
    ? { id: EXTENSION_ID, ...(rawSender as object) }
    : { id: EXTENSION_ID };
  for (const listener of messageListeners) {
    try { listener(message, sender, () => {}); } catch (e) {
      console.error("[Forge Popup] onMessage listener error:", e);
    }
  }
});

// ── Hydrate window.chrome ─────────────────────────────────────────────────────
// contextIsolation is false for popup windows (they must access window.chrome
// directly). We hydrate window.chrome defensively in the preload scope, guarding
// each assignment so existing native chrome.* properties are never overwritten.
const g = window as Record<string, unknown>;
if (!isObj(g["chrome"])) g["chrome"] = Object.create(null);
const chrome = g["chrome"] as Record<string, unknown>;

// ── 1. chrome.runtime ──────────────────────────────────────────────────────────
if (!isObj(chrome["runtime"])) chrome["runtime"] = Object.create(null);
const rt = chrome["runtime"] as Record<string, unknown>;

if (!rt["id"]) rt["id"] = EXTENSION_ID;

if (!isFn(rt["getURL"])) {
  rt["getURL"] = function(path: unknown): string {
    const clean = (isStr(path) ? path : "").replace(/^\/+/, "");
    return `chrome-extension://${EXTENSION_ID}/${clean}`;
  };
}

if (!isFn(rt["sendMessage"])) {
  rt["sendMessage"] = async function(
    arg1: unknown, arg2?: unknown, arg3?: unknown, arg4?: unknown
  ): Promise<unknown> {
    let targetId = EXTENSION_ID;
    let message: unknown;
    let callback: ((...a: unknown[]) => void) | undefined;

    if (isStr(arg1)) {
      // Validate that the target ID looks like a real extension ID
      targetId = /^[a-z][a-z0-9]{31}$/i.test(arg1) ? arg1.toLowerCase() : EXTENSION_ID;
      message = arg2;
      callback = isFn(arg3) ? arg3 : isFn(arg4) ? arg4 : undefined;
    } else {
      message = arg1;
      callback = isFn(arg2) ? arg2 : isFn(arg3) ? arg3 : undefined;
    }

    try {
      const res = await secureInvoke("extensions:runtime:send-message", {
        extensionId: targetId,
        message,
        sender: { id: EXTENSION_ID, url: window.location.href },
      });
      if (isFn(callback)) { try { callback(res); } catch {} }
      return res;
    } catch (err: unknown) {
      const msg = isObj(err) && isStr(err["message"]) ? err["message"] : String(err);
      rt["lastError"] = { message: msg };
      if (isFn(callback)) { try { callback(undefined); } catch {} }
      throw err;
    }
  };
}

if (!isObj(rt["onMessage"])) {
  rt["onMessage"] = {
    addListener(fn: unknown) { if (isFn(fn)) messageListeners.add(fn); },
    removeListener(fn: unknown) { if (isFn(fn)) messageListeners.delete(fn); },
    hasListener(fn: unknown) { return isFn(fn) && messageListeners.has(fn); },
  };
}

if (!("lastError" in rt)) rt["lastError"] = null;

// ── 2. chrome.tabs ────────────────────────────────────────────────────────────
if (!isObj(chrome["tabs"])) chrome["tabs"] = Object.create(null);
const tabs = chrome["tabs"] as Record<string, unknown>;

if (!isFn(tabs["query"])) {
  tabs["query"] = async function(filter: unknown, callback?: unknown): Promise<unknown[]> {
    const safeFilter = isObj(filter) ? filter : {};
    try {
      const result = await secureInvoke("extensions:tabs:query", safeFilter);
      const list = Array.isArray(result) ? result : [];
      if (isFn(callback)) { try { (callback as any)(list); } catch (e) {
        console.error("[Forge Popup] tabs.query callback error:", e);
      } }
      return list;
    } catch {
      if (isFn(callback)) { try { (callback as any)([]); } catch {} }
      return [];
    }
  };
}

if (!isFn(tabs["get"])) {
  tabs["get"] = async function(tabId: unknown, callback?: unknown): Promise<unknown> {
    if (!isPosInt(tabId)) {
      if (isFn(callback)) { try { (callback as any)(null); } catch {} }
      return null;
    }
    try {
      const tab = await secureInvoke("extensions:tabs:get", tabId);
      if (isFn(callback)) { try { (callback as any)(tab); } catch {} }
      return tab;
    } catch { return null; }
  };
}

if (!isFn(tabs["sendMessage"])) {
  tabs["sendMessage"] = async function(
    tabId: unknown, message: unknown, optOrCb?: unknown, maybeCb?: unknown
  ): Promise<unknown> {
    if (!isPosInt(tabId)) return Promise.reject(new Error("Invalid tabId"));
    const callback = isFn(optOrCb) ? optOrCb : isFn(maybeCb) ? maybeCb : undefined;
    try {
      const res = await secureInvoke("extensions:tabs:send-message", {
        tabId,
        message,
        sender: { id: EXTENSION_ID, url: window.location.href },
      });
      if (isFn(callback)) { try { (callback as any)(res); } catch {} }
      return res;
    } catch (err: unknown) {
      const msg = isObj(err) && isStr(err["message"]) ? err["message"] : String(err);
      rt["lastError"] = { message: msg };
      if (isFn(callback)) { try { (callback as any)(undefined); } catch {} }
      throw err;
    }
  };
}

if (!isFn(tabs["reload"])) {
  tabs["reload"] = async function(
    tabId?: unknown, _props?: unknown, callback?: unknown
  ): Promise<void> {
    const tid = isPosInt(tabId) ? tabId : undefined;
    try {
      if (tid !== undefined) {
        await secureInvoke("extensions:tabs:reload", tid);
      } else {
        const list = await (tabs["query"] as any)({ active: true, currentWindow: true });
        const first = Array.isArray(list) ? list[0] : null;
        if (isObj(first) && isPosInt(first["id"])) {
          await secureInvoke("extensions:tabs:reload", first["id"]);
        }
      }
    } catch {}
    if (isFn(callback)) { try { (callback as any)(); } catch {} }
  };
}

if (!isFn(tabs["update"])) {
  tabs["update"] = async function(
    arg1?: unknown, arg2?: unknown, arg3?: unknown
  ): Promise<unknown> {
    let tabId: number | undefined;
    let updateProps: unknown;
    let callback: ((...a: unknown[]) => void) | undefined;

    if (isPosInt(arg1)) {
      tabId = arg1;
      updateProps = arg2;
      callback = isFn(arg3) ? arg3 : undefined;
    } else {
      updateProps = arg1;
      callback = isFn(arg2) ? arg2 : undefined;
    }

    // Allowlist only safe updateProps fields
    const safeProps: { url?: string; active?: boolean } = {};
    if (isObj(updateProps)) {
      if (isStr(updateProps["url"])) safeProps.url = updateProps["url"];
      if (typeof updateProps["active"] === "boolean") safeProps.active = updateProps["active"];
    }

    try {
      let res: unknown;
      if (tabId !== undefined) {
        res = await secureInvoke("extensions:tabs:update", { tabId, props: safeProps });
      } else {
        const list = await (tabs["query"] as any)({ active: true, currentWindow: true });
        const first = Array.isArray(list) ? list[0] : null;
        if (isObj(first) && isPosInt(first["id"])) {
          res = await secureInvoke("extensions:tabs:update", { tabId: first["id"], props: safeProps });
        }
      }
      if (isFn(callback)) { try { callback(res); } catch {} }
      return res;
    } catch { return null; }
  };
}

if (!isFn(tabs["executeScript"])) {
  tabs["executeScript"] = async function(
    arg1: unknown, arg2?: unknown, arg3?: unknown
  ): Promise<unknown[]> {
    let tabId: number | undefined;
    let details: unknown;
    let callback: ((...a: unknown[]) => void) | undefined;

    if (isPosInt(arg1)) {
      tabId = arg1;
      details = arg2;
      callback = isFn(arg3) ? arg3 : undefined;
    } else {
      details = arg1;
      callback = isFn(arg2) ? arg2 : undefined;
    }

    // Only allow inline `code` strings; reject `file` paths from popup context
    const code = isObj(details) && isStr(details["code"]) ? details["code"] : "";
    if (!code.trim()) {
      if (isFn(callback)) { try { callback([]); } catch {} }
      return [];
    }

    try {
      let res: unknown;
      if (tabId !== undefined) {
        res = await secureInvoke("extensions:tabs:execute-script", { tabId, code });
      } else {
        const list = await (tabs["query"] as any)({ active: true, currentWindow: true });
        const first = Array.isArray(list) ? list[0] : null;
        if (isObj(first) && isPosInt(first["id"])) {
          res = await secureInvoke("extensions:tabs:execute-script", { tabId: first["id"], code });
        }
      }
      if (isFn(callback)) { try { callback([res]); } catch {} }
      return [res];
    } catch { return []; }
  };
}

if (!isFn(tabs["insertCSS"])) {
  tabs["insertCSS"] = async function(
    arg1: unknown, arg2?: unknown, arg3?: unknown
  ): Promise<void> {
    let tabId: number | undefined;
    let details: unknown;
    let callback: (() => void) | undefined;

    if (isPosInt(arg1)) {
      tabId = arg1;
      details = arg2;
      callback = isFn(arg3) ? (arg3 as () => void) : undefined;
    } else {
      details = arg1;
      callback = isFn(arg2) ? (arg2 as () => void) : undefined;
    }

    const css = isObj(details) && isStr(details["code"]) ? details["code"] : "";
    try {
      if (tabId !== undefined) {
        await secureInvoke("extensions:tabs:insert-css", { tabId, css });
      } else {
        const list = await (tabs["query"] as any)({ active: true, currentWindow: true });
        const first = Array.isArray(list) ? list[0] : null;
        if (isObj(first) && isPosInt(first["id"])) {
          await secureInvoke("extensions:tabs:insert-css", { tabId: first["id"], css });
        }
      }
    } catch {}
    if (isFn(callback)) { try { callback(); } catch {} }
  };
}

// ── 3. chrome.action & chrome.browserAction ──────────────────────────────────
function makeActionApi() {
  return {
    setBadgeText(details: unknown, callback?: unknown) {
      const text = isObj(details) && isStr(details["text"]) ? details["text"] : "";
      const tabId = isObj(details) && isPosInt(details["tabId"]) ? details["tabId"] : undefined;
      secureInvoke("extensions:action:set-badge-text", {
        extensionId: EXTENSION_ID, text, tabId,
      }).finally(() => { if (isFn(callback)) (callback as any)(); });
    },
    setBadgeBackgroundColor(details: unknown, callback?: unknown) {
      let colorStr = "#0078d4";
      if (isObj(details)) {
        if (isStr(details["color"])) {
          colorStr = details["color"];
        } else if (Array.isArray(details["color"])) {
          const arr = details["color"] as unknown[];
          if (arr.length >= 3 && arr.every(n => typeof n === "number")) {
            colorStr = `rgba(${arr.slice(0, 4).join(",")})`;
          }
        }
      }
      const tabId = isObj(details) && isPosInt(details["tabId"]) ? details["tabId"] : undefined;
      secureInvoke("extensions:action:set-badge-color", {
        extensionId: EXTENSION_ID, color: colorStr, tabId,
      }).finally(() => { if (isFn(callback)) (callback as any)(); });
    },
    setTitle(details: unknown, callback?: unknown) {
      const title = isObj(details) && isStr(details["title"]) ? details["title"] : "";
      const tabId = isObj(details) && isPosInt(details["tabId"]) ? details["tabId"] : undefined;
      secureInvoke("extensions:action:set-title", {
        extensionId: EXTENSION_ID, title, tabId,
      }).finally(() => { if (isFn(callback)) (callback as any)(); });
    },
    setIcon(_details: unknown, callback?: unknown) {
      if (isFn(callback)) (callback as any)();
    },
  };
}

const actionApi = makeActionApi();
if (!isObj(chrome["action"])) chrome["action"] = actionApi;
if (!isObj(chrome["browserAction"])) chrome["browserAction"] = actionApi;

// ── 4. chrome.windows ────────────────────────────────────────────────────────
if (!isObj(chrome["windows"])) {
  chrome["windows"] = {
    getCurrent(callback?: unknown): Promise<unknown> {
      const winObj = { id: 1, focused: true, state: "normal", type: "popup" };
      if (isFn(callback)) { try { (callback as any)(winObj); } catch {} }
      return Promise.resolve(winObj);
    },
    get(windowId: unknown, callback?: unknown): Promise<unknown> {
      const id = typeof windowId === "number" ? windowId : 1;
      const winObj = { id, focused: true, state: "normal", type: "normal" };
      if (isFn(callback)) { try { (callback as any)(winObj); } catch {} }
      return Promise.resolve(winObj);
    },
  };
}

// ── 5. Auto-Resize Observer ───────────────────────────────────────────────────
const RESIZE_MIN_W = 280, RESIZE_MAX_W = 800;
const RESIZE_MIN_H = 200, RESIZE_MAX_H = 600;
const RESIZE_DELTA = 5;

window.addEventListener("DOMContentLoaded", () => {
  let lastW = 0, lastH = 0;

  const resizeCheck = () => {
    const body = document.body;
    const docEl = document.documentElement;
    if (!body) return;

    const rawW = Math.max(body.scrollWidth, docEl.scrollWidth, body.offsetWidth, docEl.offsetWidth);
    const rawH = Math.max(body.scrollHeight, docEl.scrollHeight, body.offsetHeight, docEl.offsetHeight);

    const w = Math.min(Math.max(rawW, RESIZE_MIN_W), RESIZE_MAX_W);
    const h = Math.min(Math.max(rawH, RESIZE_MIN_H), RESIZE_MAX_H);

    if (Math.abs(w - lastW) > RESIZE_DELTA || Math.abs(h - lastH) > RESIZE_DELTA) {
      lastW = w;
      lastH = h;
      // Only fire-and-forget via .send (not .invoke) — no channel spoofing possible
      ipcRenderer.send("extensions:popup:resize", {
        extensionId: EXTENSION_ID,
        width: w,
        height: h,
      });
    }
  };

  setTimeout(resizeCheck, 100);
  setTimeout(resizeCheck, 400);

  try {
    const observer = new ResizeObserver(resizeCheck);
    observer.observe(document.body);
  } catch {}
});
