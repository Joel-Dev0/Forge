// electron/extensions/extensionPopupPreload.ts
var import_electron = require("electron");
function isObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function isStr(v) {
  return typeof v === "string";
}
function isPosInt(v) {
  return typeof v === "number" && Number.isFinite(v) && Number.isInteger(v) && v > 0;
}
function isFn(v) {
  return typeof v === "function";
}
var EXTENSION_ID_RE = /^chrome-extension:\/\/([a-z][a-z0-9]{31})\//i;
var _eid = "";
try {
  const m = window.location.href.match(EXTENSION_ID_RE);
  if (m) _eid = m[1].toLowerCase();
} catch {
}
var EXTENSION_ID = _eid;
var ALLOWED_CHANNELS = /* @__PURE__ */ new Set([
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
  "extensions:action:set-title"
]);
async function secureInvoke(channel, payload) {
  if (!ALLOWED_CHANNELS.has(channel)) {
    return Promise.reject(new Error(`[Forge] Disallowed IPC channel: ${channel}`));
  }
  return import_electron.ipcRenderer.invoke(channel, payload);
}
var messageListeners = /* @__PURE__ */ new Set();
import_electron.ipcRenderer.on("chrome:runtime:message", (_event, data) => {
  if (!isObj(data)) return;
  const message = data["message"];
  const rawSender = data["sender"];
  const sender = isObj(rawSender) ? { id: EXTENSION_ID, ...rawSender } : { id: EXTENSION_ID };
  for (const listener of messageListeners) {
    try {
      listener(message, sender, () => {
      });
    } catch (e) {
      console.error("[Forge Popup] onMessage listener error:", e);
    }
  }
});
var g = window;
if (!isObj(g["chrome"])) g["chrome"] = /* @__PURE__ */ Object.create(null);
var chrome = g["chrome"];
if (!isObj(chrome["runtime"])) chrome["runtime"] = /* @__PURE__ */ Object.create(null);
var rt = chrome["runtime"];
if (!rt["id"]) rt["id"] = EXTENSION_ID;
if (!isFn(rt["getURL"])) {
  rt["getURL"] = function(path) {
    const clean = (isStr(path) ? path : "").replace(/^\/+/, "");
    return `chrome-extension://${EXTENSION_ID}/${clean}`;
  };
}
if (!isFn(rt["sendMessage"])) {
  rt["sendMessage"] = async function(arg1, arg2, arg3, arg4) {
    let targetId = EXTENSION_ID;
    let message;
    let callback;
    if (isStr(arg1)) {
      targetId = /^[a-z][a-z0-9]{31}$/i.test(arg1) ? arg1.toLowerCase() : EXTENSION_ID;
      message = arg2;
      callback = isFn(arg3) ? arg3 : isFn(arg4) ? arg4 : void 0;
    } else {
      message = arg1;
      callback = isFn(arg2) ? arg2 : isFn(arg3) ? arg3 : void 0;
    }
    try {
      const res = await secureInvoke("extensions:runtime:send-message", {
        extensionId: targetId,
        message,
        sender: { id: EXTENSION_ID, url: window.location.href }
      });
      if (isFn(callback)) {
        try {
          callback(res);
        } catch {
        }
      }
      return res;
    } catch (err) {
      const msg = isObj(err) && isStr(err["message"]) ? err["message"] : String(err);
      rt["lastError"] = { message: msg };
      if (isFn(callback)) {
        try {
          callback(void 0);
        } catch {
        }
      }
      throw err;
    }
  };
}
if (!isObj(rt["onMessage"])) {
  rt["onMessage"] = {
    addListener(fn) {
      if (isFn(fn)) messageListeners.add(fn);
    },
    removeListener(fn) {
      if (isFn(fn)) messageListeners.delete(fn);
    },
    hasListener(fn) {
      return isFn(fn) && messageListeners.has(fn);
    }
  };
}
if (!("lastError" in rt)) rt["lastError"] = null;
if (!isObj(chrome["tabs"])) chrome["tabs"] = /* @__PURE__ */ Object.create(null);
var tabs = chrome["tabs"];
if (!isFn(tabs["query"])) {
  tabs["query"] = async function(filter, callback) {
    const safeFilter = isObj(filter) ? filter : {};
    try {
      const result = await secureInvoke("extensions:tabs:query", safeFilter);
      const list = Array.isArray(result) ? result : [];
      if (isFn(callback)) {
        try {
          callback(list);
        } catch (e) {
          console.error("[Forge Popup] tabs.query callback error:", e);
        }
      }
      return list;
    } catch {
      if (isFn(callback)) {
        try {
          callback([]);
        } catch {
        }
      }
      return [];
    }
  };
}
if (!isFn(tabs["get"])) {
  tabs["get"] = async function(tabId, callback) {
    if (!isPosInt(tabId)) {
      if (isFn(callback)) {
        try {
          callback(null);
        } catch {
        }
      }
      return null;
    }
    try {
      const tab = await secureInvoke("extensions:tabs:get", tabId);
      if (isFn(callback)) {
        try {
          callback(tab);
        } catch {
        }
      }
      return tab;
    } catch {
      return null;
    }
  };
}
if (!isFn(tabs["sendMessage"])) {
  tabs["sendMessage"] = async function(tabId, message, optOrCb, maybeCb) {
    if (!isPosInt(tabId)) return Promise.reject(new Error("Invalid tabId"));
    const callback = isFn(optOrCb) ? optOrCb : isFn(maybeCb) ? maybeCb : void 0;
    try {
      const res = await secureInvoke("extensions:tabs:send-message", {
        tabId,
        message,
        sender: { id: EXTENSION_ID, url: window.location.href }
      });
      if (isFn(callback)) {
        try {
          callback(res);
        } catch {
        }
      }
      return res;
    } catch (err) {
      const msg = isObj(err) && isStr(err["message"]) ? err["message"] : String(err);
      rt["lastError"] = { message: msg };
      if (isFn(callback)) {
        try {
          callback(void 0);
        } catch {
        }
      }
      throw err;
    }
  };
}
if (!isFn(tabs["reload"])) {
  tabs["reload"] = async function(tabId, _props, callback) {
    const tid = isPosInt(tabId) ? tabId : void 0;
    try {
      if (tid !== void 0) {
        await secureInvoke("extensions:tabs:reload", tid);
      } else {
        const list = await tabs["query"]({ active: true, currentWindow: true });
        const first = Array.isArray(list) ? list[0] : null;
        if (isObj(first) && isPosInt(first["id"])) {
          await secureInvoke("extensions:tabs:reload", first["id"]);
        }
      }
    } catch {
    }
    if (isFn(callback)) {
      try {
        callback();
      } catch {
      }
    }
  };
}
if (!isFn(tabs["update"])) {
  tabs["update"] = async function(arg1, arg2, arg3) {
    let tabId;
    let updateProps;
    let callback;
    if (isPosInt(arg1)) {
      tabId = arg1;
      updateProps = arg2;
      callback = isFn(arg3) ? arg3 : void 0;
    } else {
      updateProps = arg1;
      callback = isFn(arg2) ? arg2 : void 0;
    }
    const safeProps = {};
    if (isObj(updateProps)) {
      if (isStr(updateProps["url"])) safeProps.url = updateProps["url"];
      if (typeof updateProps["active"] === "boolean") safeProps.active = updateProps["active"];
    }
    try {
      let res;
      if (tabId !== void 0) {
        res = await secureInvoke("extensions:tabs:update", { tabId, props: safeProps });
      } else {
        const list = await tabs["query"]({ active: true, currentWindow: true });
        const first = Array.isArray(list) ? list[0] : null;
        if (isObj(first) && isPosInt(first["id"])) {
          res = await secureInvoke("extensions:tabs:update", { tabId: first["id"], props: safeProps });
        }
      }
      if (isFn(callback)) {
        try {
          callback(res);
        } catch {
        }
      }
      return res;
    } catch {
      return null;
    }
  };
}
if (!isFn(tabs["executeScript"])) {
  tabs["executeScript"] = async function(arg1, arg2, arg3) {
    let tabId;
    let details;
    let callback;
    if (isPosInt(arg1)) {
      tabId = arg1;
      details = arg2;
      callback = isFn(arg3) ? arg3 : void 0;
    } else {
      details = arg1;
      callback = isFn(arg2) ? arg2 : void 0;
    }
    const code = isObj(details) && isStr(details["code"]) ? details["code"] : "";
    if (!code.trim()) {
      if (isFn(callback)) {
        try {
          callback([]);
        } catch {
        }
      }
      return [];
    }
    try {
      let res;
      if (tabId !== void 0) {
        res = await secureInvoke("extensions:tabs:execute-script", { tabId, code });
      } else {
        const list = await tabs["query"]({ active: true, currentWindow: true });
        const first = Array.isArray(list) ? list[0] : null;
        if (isObj(first) && isPosInt(first["id"])) {
          res = await secureInvoke("extensions:tabs:execute-script", { tabId: first["id"], code });
        }
      }
      if (isFn(callback)) {
        try {
          callback([res]);
        } catch {
        }
      }
      return [res];
    } catch {
      return [];
    }
  };
}
if (!isFn(tabs["insertCSS"])) {
  tabs["insertCSS"] = async function(arg1, arg2, arg3) {
    let tabId;
    let details;
    let callback;
    if (isPosInt(arg1)) {
      tabId = arg1;
      details = arg2;
      callback = isFn(arg3) ? arg3 : void 0;
    } else {
      details = arg1;
      callback = isFn(arg2) ? arg2 : void 0;
    }
    const css = isObj(details) && isStr(details["code"]) ? details["code"] : "";
    try {
      if (tabId !== void 0) {
        await secureInvoke("extensions:tabs:insert-css", { tabId, css });
      } else {
        const list = await tabs["query"]({ active: true, currentWindow: true });
        const first = Array.isArray(list) ? list[0] : null;
        if (isObj(first) && isPosInt(first["id"])) {
          await secureInvoke("extensions:tabs:insert-css", { tabId: first["id"], css });
        }
      }
    } catch {
    }
    if (isFn(callback)) {
      try {
        callback();
      } catch {
      }
    }
  };
}
function makeActionApi() {
  return {
    setBadgeText(details, callback) {
      const text = isObj(details) && isStr(details["text"]) ? details["text"] : "";
      const tabId = isObj(details) && isPosInt(details["tabId"]) ? details["tabId"] : void 0;
      secureInvoke("extensions:action:set-badge-text", {
        extensionId: EXTENSION_ID,
        text,
        tabId
      }).finally(() => {
        if (isFn(callback)) callback();
      });
    },
    setBadgeBackgroundColor(details, callback) {
      let colorStr = "#0078d4";
      if (isObj(details)) {
        if (isStr(details["color"])) {
          colorStr = details["color"];
        } else if (Array.isArray(details["color"])) {
          const arr = details["color"];
          if (arr.length >= 3 && arr.every((n) => typeof n === "number")) {
            colorStr = `rgba(${arr.slice(0, 4).join(",")})`;
          }
        }
      }
      const tabId = isObj(details) && isPosInt(details["tabId"]) ? details["tabId"] : void 0;
      secureInvoke("extensions:action:set-badge-color", {
        extensionId: EXTENSION_ID,
        color: colorStr,
        tabId
      }).finally(() => {
        if (isFn(callback)) callback();
      });
    },
    setTitle(details, callback) {
      const title = isObj(details) && isStr(details["title"]) ? details["title"] : "";
      const tabId = isObj(details) && isPosInt(details["tabId"]) ? details["tabId"] : void 0;
      secureInvoke("extensions:action:set-title", {
        extensionId: EXTENSION_ID,
        title,
        tabId
      }).finally(() => {
        if (isFn(callback)) callback();
      });
    },
    setIcon(_details, callback) {
      if (isFn(callback)) callback();
    }
  };
}
var actionApi = makeActionApi();
if (!isObj(chrome["action"])) chrome["action"] = actionApi;
if (!isObj(chrome["browserAction"])) chrome["browserAction"] = actionApi;
if (!isObj(chrome["windows"])) {
  chrome["windows"] = {
    getCurrent(callback) {
      const winObj = { id: 1, focused: true, state: "normal", type: "popup" };
      if (isFn(callback)) {
        try {
          callback(winObj);
        } catch {
        }
      }
      return Promise.resolve(winObj);
    },
    get(windowId, callback) {
      const id = typeof windowId === "number" ? windowId : 1;
      const winObj = { id, focused: true, state: "normal", type: "normal" };
      if (isFn(callback)) {
        try {
          callback(winObj);
        } catch {
        }
      }
      return Promise.resolve(winObj);
    }
  };
}
var RESIZE_MIN_W = 280;
var RESIZE_MAX_W = 800;
var RESIZE_MIN_H = 200;
var RESIZE_MAX_H = 600;
var RESIZE_DELTA = 5;
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
      import_electron.ipcRenderer.send("extensions:popup:resize", {
        extensionId: EXTENSION_ID,
        width: w,
        height: h
      });
    }
  };
  setTimeout(resizeCheck, 100);
  setTimeout(resizeCheck, 400);
  try {
    const observer = new ResizeObserver(resizeCheck);
    observer.observe(document.body);
  } catch {
  }
});
