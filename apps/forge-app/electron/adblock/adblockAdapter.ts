import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { app, BrowserWindow, ipcMain, session } from "electron";
import {
  AdBlockEngine,
  type BlockDecision,
  type AdBlockStats,
  type BlockRule,
  type ShieldFeatures,
  type DetailedBlockStats,
  type RuleCategory,
} from "@forge/adblock-engine";
import { initListUpdater, updateFilterLists, getListUpdaterStatus } from "./listUpdater.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AdBlockLogEntry {
  id: string;
  url: string;
  name: string;
  domain: string;
  method: string;
  resourceType: string;
  status: "blocked" | "allowed";
  category?: RuleCategory;
  rule?: string;
  listId?: string;
  reason?: string;
  timestamp: number;
}

const engine = new AdBlockEngine(true);
const recentLogs: AdBlockLogEntry[] = [];
const MAX_LOGS = 300;
let getWin: (() => BrowserWindow | null) | null = null;

function getResourceName(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) {
      return parsed.search ? `${last}${parsed.search.substring(0, 15)}` : last;
    }
    return parsed.hostname;
  } catch {
    return urlStr.substring(0, 40);
  }
}

function getDomain(urlStr: string): string {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return "";
  }
}

function broadcastEvent(channel: string, data: any) {
  if (!getWin) return;
  const win = getWin();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function getFullBroadcastState() {
  return {
    enabled: engine.isEnabled(),
    features: engine.getFeatures(),
    stats: engine.getStats(),
    detailedStats: engine.getDetailedStats(),
  };
}

export function initAdBlockAdapter(mainWindowGetter: () => BrowserWindow | null) {
  getWin = mainWindowGetter;

  // Initialize background list auto-updater
  initListUpdater(engine, (status) => {
    broadcastEvent("adblock:lists-updated", status);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
  });

  // IPC Handlers
  ipcMain.handle("adblock:get-state", () => {
    return {
      enabled: engine.isEnabled(),
      features: engine.getFeatures(),
      stats: engine.getStats(),
      detailedStats: engine.getDetailedStats(),
      customRules: engine.getCustomRules(),
      recentLogs: recentLogs.slice(-150),
      updaterStatus: getListUpdaterStatus(),
    };
  });

  const activeWebviewContents = new Set<Electron.WebContents>();

  ipcMain.handle("adblock:set-enabled", (_event, enabled: boolean) => {
    engine.setEnabled(enabled);

    // Synchronize enabled state to all running webview guest frames
    for (const contents of activeWebviewContents) {
      if (!contents.isDestroyed()) {
        contents.executeJavaScript(`
          window.__forge_adblock_enabled = ${enabled};
          if (!${enabled}) {
            const style = document.getElementById('__forge_adblock_css');
            if (style) style.remove();
          }
        `).catch(() => {});

        if (enabled) {
          const url = contents.getURL();
          if (url && url !== "about:blank") {
            const css = engine.getCosmeticCSS(url);
            if (css) contents.insertCSS(css).catch(() => {});
            const scriptlet = engine.getScriptlet(url);
            if (scriptlet) contents.executeJavaScript(scriptlet).catch(() => {});
          }
        }
      }
    }

    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return engine.isEnabled();
  });

  ipcMain.handle("adblock:set-feature", (_event, feature: keyof ShieldFeatures, enabled: boolean) => {
    engine.setFeature(feature, enabled);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return engine.getFeatures();
  });

  ipcMain.handle("adblock:get-detailed-stats", () => {
    return engine.getDetailedStats();
  });

  ipcMain.handle("adblock:get-custom-rules", () => {
    return engine.getCustomRules();
  });

  ipcMain.handle("adblock:toggle-custom-rule", (_event, ruleId: string, enabled?: boolean) => {
    const res = engine.toggleCustomRule(ruleId, enabled);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return res;
  });

  ipcMain.handle("adblock:import-rules", (_event, rawContent: string) => {
    const res = engine.importRules(rawContent);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return res;
  });

  ipcMain.handle("adblock:export-rules", () => {
    return engine.exportRules();
  });

  ipcMain.handle("adblock:toggle-list", (_event, listId: string, enabled?: boolean) => {
    const newState = engine.toggleList(listId, enabled);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return newState;
  });

  ipcMain.handle("adblock:add-user-rule", (_event, rawRule: string) => {
    const rule = engine.addUserRule(rawRule);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return rule ? { ok: true, rule } : { ok: false, error: "Invalid rule syntax" };
  });

  ipcMain.handle("adblock:remove-user-rule", (_event, ruleId: string) => {
    const removed = engine.removeUserRule(ruleId);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return removed;
  });

  ipcMain.handle("adblock:clear-logs", () => {
    recentLogs.length = 0;
    engine.resetStats();
    broadcastEvent("adblock:logs-cleared", {});
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return true;
  });

  ipcMain.handle("adblock:get-cosmetic-css", (_event, url: string) => {
    return engine.getCosmeticCSS(url);
  });

  ipcMain.handle("adblock:get-scriptlet", (_event, url: string) => {
    return engine.getScriptlet(url);
  });

  ipcMain.handle("adblock:update-lists", async () => {
    const result = await updateFilterLists(engine);
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return result;
  });

  ipcMain.handle("adblock:get-guest-preload-path", () => {
    const guestPreload = path.join(__dirname, "guestPreload.cjs");
    return pathToFileURL(guestPreload).toString();
  });

  // Register guest preload script for session partition 'persist:forge'
  const ses = session.fromPartition("persist:forge");
  const guestPreload = path.join(__dirname, "guestPreload.cjs");
  if (fs.existsSync(guestPreload)) {
    try {
      ses.setPreloads([guestPreload]);
    } catch (err) {
      console.warn("[AdBlock] Could not register guest preload script:", err);
    }
  }

  // Automatically inject cosmetic CSS and ad-skipping scriptlets into all webviews
  app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "webview") return;

    activeWebviewContents.add(contents);
    contents.on("destroyed", () => {
      activeWebviewContents.delete(contents);
    });

    // Block popup ad windows
    contents.setWindowOpenHandler((details) => {
      if (!engine.isEnabled()) {
        return { action: "allow" };
      }
      const { cancel } = evaluateAdBlockRequest({ url: details.url });
      if (cancel) {
        return { action: "deny" };
      }
      return { action: "allow" };
    });

    const injectCosmeticsAndScriptlets = async () => {
      try {
        // Sync enabled state flag
        await contents.executeJavaScript(`window.__forge_adblock_enabled = ${engine.isEnabled()};`);
      } catch {}

      if (!engine.isEnabled()) return;
      try {
        const url = contents.getURL();
        if (!url || url === "about:blank") return;

        const css = engine.getCosmeticCSS(url);
        if (css) {
          await contents.insertCSS(css);
        }

        const scriptlet = engine.getScriptlet(url);
        if (scriptlet) {
          await contents.executeJavaScript(scriptlet);
        }
      } catch {}
    };

    contents.on("dom-ready", injectCosmeticsAndScriptlets);
    contents.on("did-navigate-in-page", injectCosmeticsAndScriptlets);
  });
}

let entrySeq = 0;

/**
 * Evaluates an intercepted request.
 * Returns whether to cancel the request and the log entry generated.
 */
export function evaluateAdBlockRequest(details: {
  url: string;
  method?: string;
  resourceType?: string;
  referrer?: string;
}): { cancel: boolean; decision: BlockDecision; logEntry: AdBlockLogEntry } {
  const decision = engine.match({
    url: details.url,
    method: details.method,
    resourceType: details.resourceType,
    sourceUrl: details.referrer,
  });

  const entry: AdBlockLogEntry = {
    id: `ab_${++entrySeq}_${Date.now().toString(36)}`,
    url: details.url,
    name: getResourceName(details.url),
    domain: getDomain(details.url),
    method: details.method || "GET",
    resourceType: details.resourceType || "other",
    status: decision.blocked ? "blocked" : "allowed",
    category: decision.category,
    rule: decision.rule?.raw,
    listId: decision.listId,
    reason: decision.reason,
    timestamp: Date.now(),
  };

  // Add to recent logs
  recentLogs.push(entry);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.shift();
  }

  // Notify renderer window in real time
  broadcastEvent("adblock:request-entry", entry);

  return {
    cancel: decision.blocked,
    decision,
    logEntry: entry,
  };
}

export function getEngineInstance(): AdBlockEngine {
  return engine;
}
