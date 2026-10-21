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
  isThirdPartyRequest,
} from "@forge/adblock-engine";
import type { WebContents, HandlerDetails } from "electron";
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


function getAutoRulesFilePath(): string {
  try {
    return path.join(app.getPath("userData"), "forge_auto_learned_rules.json");
  } catch {
    return path.join(process.cwd(), "forge_auto_learned_rules.json");
  }
}

function loadPersistedAutoRules(): void {
  try {
    const p = getAutoRulesFilePath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.raw) {
            engine.learnRule(item.raw, item.category || "ad", item.reason || "Restored from persistent cache");
          }
        }
      }
    }
  } catch {}
}

function persistAutoRules(): void {
  try {
    const p = getAutoRulesFilePath();
    const rules = engine.getAutoLearnedRules();
    fs.writeFileSync(p, JSON.stringify(rules.map((r) => ({ raw: r.raw, category: r.category, domain: r.domain })), null, 2), "utf8");
  } catch {}
}

export function initAdBlockAdapter(mainWindowGetter: () => BrowserWindow | null) {
  getWin = mainWindowGetter;

  // Hook Smart Auto-Rule persistence & live events
  engine.onRuleLearned = (rule, reason) => {
    persistAutoRules();
    broadcastEvent("adblock:rule-learned", { rule, reason });
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
  };
  loadPersistedAutoRules();

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
  const insertedCssKeys = new Map<Electron.WebContents, Set<string>>();

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

        if (!enabled) {
          const keys = insertedCssKeys.get(contents);
          if (keys) {
            for (const key of keys) {
              contents.removeInsertedCSS(key).catch(() => {});
            }
            keys.clear();
          }
        } else {
          const url = contents.getURL();
          if (url && url !== "about:blank") {
            const css = engine.getCosmeticCSS(url);
            if (css) {
              contents.insertCSS(css).then((key) => {
                if (key) {
                  let keys = insertedCssKeys.get(contents);
                  if (!keys) {
                    keys = new Set();
                    insertedCssKeys.set(contents, keys);
                  }
                  keys.add(key);
                }
              }).catch(() => {});
            }
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

  ipcMain.handle("adblock:get-auto-learned-rules", () => {
    return engine.getAutoLearnedRules();
  });

  ipcMain.handle("adblock:clear-auto-learned-rules", () => {
    engine.clearAutoLearnedRules();
    persistAutoRules();
    broadcastEvent("adblock:state-changed", getFullBroadcastState());
    return true;
  });

  ipcMain.handle("adblock:learn-rule", (_event, target: string, category?: any, reason?: string) => {
    const rule = engine.learnRule(target, category || "ad", reason || "Manually learned rule");
    if (rule) persistAutoRules();
    return rule;
  });

  ipcMain.on("adblock:report-auto-rule", (_event, data: { domain?: string; reason?: string }) => {
    if (data && data.domain) {
      engine.learnRule(data.domain, "ad", data.reason || "Reported by in-page Shield");
    }
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

  ipcMain.handle("adblock:evaluate-request", (_event, data: string | { url: string; referrer?: string }) => {
    const targetUrl = typeof data === "string" ? data : data?.url || "";
    const referrer = typeof data === "object" ? data?.referrer : undefined;
    return evaluateAdBlockRequest({ url: targetUrl, referrer, resourceType: "popup" });
  });

  ipcMain.handle("adblock:get-guest-preload-path", () => {
    const guestPreload = path.join(__dirname, "guestPreload.cjs");
    return pathToFileURL(guestPreload).toString();
  });

  ipcMain.on("adblock:get-guest-preload-path-sync", (event) => {
    try {
      const guestPreload = path.join(__dirname, "guestPreload.cjs");
      event.returnValue = pathToFileURL(guestPreload).toString();
    } catch {
      event.returnValue = "";
    }
  });

  // Register guest preload script for session partition 'persist:forge'
  const ses = session.fromPartition("persist:forge");
  const guestPreload = path.join(__dirname, "guestPreload.cjs");
  let guestPreloadCode = "";
  if (fs.existsSync(guestPreload)) {
    try {
      ses.setPreloads([guestPreload]);
      guestPreloadCode = fs.readFileSync(guestPreload, "utf-8");
    } catch (err) {
      console.warn("[AdBlock] Could not register guest preload script:", err);
    }
  }

  // Automatically inject cosmetic CSS, scriptlets and guest preload into all webviews
  app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() !== "webview") return;

    activeWebviewContents.add(contents);
    contents.on("destroyed", () => {
      activeWebviewContents.delete(contents);
      insertedCssKeys.delete(contents);
    });

    // Block popup ad windows & popunders with extreme vigilance
    contents.setWindowOpenHandler((details) => {
      return handleWindowOpenRequest(contents, details, mainWindowGetter);
    });

    // Guard webview from top-level redirects to ad networks, rotators and frame-busting popunders
    contents.on("will-navigate", (event, navUrl) => {
      if (!engine.isEnabled()) return;
      const currentUrl = !contents.isDestroyed() ? contents.getURL() : "";
      if (!currentUrl || currentUrl === "about:blank") return;

      // Allow same-origin navigations unless matching suspicious ad redirect paths
      const isThirdParty = isThirdPartyRequest(navUrl, currentUrl);
      if (!isThirdParty) {
        try {
          const pathname = new URL(navUrl).pathname.toLowerCase();
          if (SUSPICIOUS_AD_REDIRECT_PATHS.some((p) => pathname.includes(p))) {
            console.warn("[Forge Shield] Blocked same-origin ad redirect path:", navUrl);
            event.preventDefault();
            return;
          }
        } catch {}
        return;
      }

      // Check if current page is a search engine (results clicks must be allowed)
      if (isSearchEngineUrl(currentUrl)) return;

      // Check if target is legitimate auth or payment
      const isAuthOrPayment = LEGITIMATE_AUTH_AND_PAYMENT_DOMAINS.some((d) =>
        navUrl.toLowerCase().includes(d)
      );
      if (isAuthOrPayment) return;

      // Block if identified as ad or popunder redirect
      if (isAdOrRedirectUrl(navUrl, currentUrl)) {
        console.warn("[Forge Shield] Blocked third-party ad navigation redirect:", navUrl, "from:", currentUrl);
        event.preventDefault();
        return;
      }
    });

    contents.on("will-frame-navigate", (event: any) => {
      // If a subframe tries to hijack or navigate the top-level main frame
      if (event.isMainFrame && !event.frame?.isDestroyed?.() && event.frame?.parent) {
        const currentUrl = !contents.isDestroyed() ? contents.getURL() : "";
        if (currentUrl && currentUrl !== "about:blank") {
          const isThirdParty = isThirdPartyRequest(event.url, currentUrl);
          const isAuthOrPayment = LEGITIMATE_AUTH_AND_PAYMENT_DOMAINS.some((d) =>
            event.url.toLowerCase().includes(d)
          );
          if (isThirdParty && !isAuthOrPayment && isAdOrRedirectUrl(event.url, currentUrl)) {
            console.warn("[Forge Shield] Blocked frame-busting top-level ad redirect:", event.url);
            event.preventDefault();
            return;
          }
        }
      }
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
          const key = await contents.insertCSS(css);
          if (key) {
            let keys = insertedCssKeys.get(contents);
            if (!keys) {
              keys = new Set();
              insertedCssKeys.set(contents, keys);
            }
            keys.add(key);
          }
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

export function getAdBlockShieldHtml(url: string, category: string, ruleRaw?: string): string {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  const categoryLabel =
    category === "malvertising"
      ? "Security Threat Shield"
      : category === "custom"
      ? "Custom User Filter Rule"
      : "Forge Shield";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Blocked by Forge Shield</title>
  <style>
    :root {
      --bg: #090A0F;
      --card: #13151F;
      --border: #232736;
      --primary: #FF6B00;
      --red: #EF4444;
      --text: #F3F4F6;
      --text-muted: #9CA3AF;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      background: radial-gradient(ellipse at 50% 30%, #1e1014 0%, var(--bg) 70%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      user-select: none;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.7), 0 0 40px rgba(239, 68, 68, 0.15);
      animation: popIn 0.25s ease-out;
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .icon-badge {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #F87171;
      font-size: 28px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .site {
      color: var(--primary);
      word-break: break-all;
    }
    .desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .rule-box {
      background: rgba(0,0,0,0.4);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      font-family: monospace;
      font-size: 11px;
      color: #F87171;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn-back {
      background: var(--primary);
      color: white;
    }
    .btn-back:hover {
      background: #e05e00;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-badge">🛡️</div>
    <h1>Blocked by <span class="site">Forge Shield</span></h1>
    <p class="desc">
      Navigation to <strong>${hostname}</strong> was blocked by your <strong>${categoryLabel}</strong> settings.
    </p>
    ${ruleRaw ? `<div class="rule-box">Rule: ${ruleRaw}</div>` : ""}
    <div class="actions">
      <button class="btn btn-back" onclick="history.back()">Go Back</button>
    </div>
  </div>
</body>
</html>`;
}

export const KNOWN_AD_POPUNDER_DOMAINS_AND_KEYWORDS = [
  // Popunder & Pop-up Ad Networks
  "popads", "popcash", "adcash", "propellerads", "monetag", "hilltopads",
  "adsterra", "richads", "clickadu", "trafficstars", "trafficjunky", "trafficfactory",
  "runative", "ad2up", "juicyads", "yllix", "bidvertiser", "exoclick", "zeropark",
  "plugrush", "adxad", "clickaine", "ad-maven", "active8", "daftads", "twinred",
  "adkernel", "galaksion", "ezmob", "clickadilla", "rollerads", "pushground", "evadav",
  "coinhive", "cryptoloot", "crypto-loot",

  // Video Streaming Ad Networks & Redirect Gates
  "profitablecpmrate", "profitablegatetocontent", "highperformancegate", "highcpmgate",
  "effectivecpmgate", "realsrv", "magsrv", "xlviirdr", "pukegoocha", "whomeeno",
  "voomau", "oortous", "whounsoo", "dooloust", "shoumou", "deloplen", "grootso",
  "shukriya", "slytherin", "fastclick", "short.ink", "direct-link", "shrinkme",
  "linkvertise", "alwingulla", "eastsour", "cloutho", "agacelebir", "wheretheissomething",
  "onclick", "adcontent", "syndication", "videobin", "clicknupload",
  "streamwish", "filemoon", "mixdrop", "streamvid", "mp4upload",

  // Major Ad Servers & Exchanges
  "doubleclick", "googlesyndication", "adservice", "adnxs", "criteo", "taboola",
  "outbrain", "revenuehits", "directrev", "clkmon", "bestadbid",
  "adclicker", "clksite", "rotator", "popunder", "syndicate",
  "tsyndicate", "adtrue", "adthrive", "mediavine", "infolinks", "conversant",
  "rubiconproject", "pubmatic", "openx", "casalemedia", "yieldmo", "smartadserver",
  "sovrn", "revcontent", "mgid", "media.net", "bidswitch", "adroll", "rubicon",
  "adform", "zedo", "aniview", "springserve", "connatix", "spotxchange", "spotx.tv",
  "adtech", "quantserve", "adcolony", "admob", "unityads", "applovin", "ironsrc",
  "vungle", "chartboost", "adpushup", "adblade", "adbutler", "carbonads", "zergnet",
  "raptive", "yieldlove", "snigelweb", "shemedia", "playwire", "ezoic", "a-ads",
  "coinzilla", "bitmedia", "cointraffic", "popmyads", "clicksor", "buysellads",
  "zilla-networks", "onclickprediction", "onclickalgo", "onclickbright", "onclickperformance",
  "ad-rotator", "traffic-media", "zeroad", "redirect-ad", "pushsdk", "push-notification",

  // Gambling / Betting Popups (frequent popunder targets)
  "bet365", "1xbet", "betway", "parimatch", "mostbet", "pin-up", "vulkan",
  "casino", "casinon", "spelpaus", "jackpotcity", "spinpalace", "betwinner",
  "megapari", "melbet",

  // Additional video redirect gates, popunders, stream hosts & scam networks
  "alwingulla", "agacelebir", "cloutho", "eastsour", "dooloust", "whounsoo", "whomeeno",
  "pukegoocha", "oortous", "voomau", "shoumou", "deloplen", "grootso", "shukriya", "slytherin",
  "ad-score", "cpmstar", "adkeeper", "bebi.com", "adoperator", "mondiad", "adstarget",
  "streamhide", "vidhide", "streamtape", "voe.sx", "doodstream", "filelions", "luluvdo",
  "dropload", "hexupload", "shrinkme", "linkvertise", "ouo.io", "adf.ly", "bc.vc", "short.am",
  "shorte.st", "cut-urls", "exe.io", "fc.lc", "gplinks", "droplink",
  "1x-bet", "stake.com", "roobet", "bc.game", "bcgame", "betano", "cleanmypc",
  "your-system-infected", "critical-alert", "security-warning", "repair-now",
  "allow-cookies", "confirm-you-are-not-a-robot", "robot-check", "click-allow", "captcha-verification", "press-allow",
  "system_vpn_update", "quicktoolera", "britishfireplace", "w-one023"
];

export const SUSPICIOUS_AD_REDIRECT_PATHS = [
  "/click.php", "/out.php", "/track.php", "/redirect.php", "/goto.php",
  "/jump.php", "/redir.php", "/traffic/", "/rotator/", "/adclick",
  "/ad_click", "/ad-click", "/pop/click", "/clk/", "/zone/", "/dispatcher.php",
  "/serving/ad", "/track/click", "/delivery/", "/go.php", "/ad.php", "/adv.php",
  "/link.php", "/count.php", "/click/"
];

export const SUSPICIOUS_AFFILIATE_QUERY_KEYS = [
  "click_id", "clickid", "aff_id", "affid", "subid", "sub_id", "sub1", "sub2", "sub6",
  "zoneid", "zone_id", "banner_id", "bannerid", "campaign_id", "campaignid",
  "pub_id", "publisher_id", "ref_id", "refid", "track_id", "tracking_id",
  "popunder", "target_url", "redirect_url", "traffic_source", "ad_id", "adid",
  "psid", "smartlink", "visitor-id", "partner_key", "session_partner_key"
];

export const LEGITIMATE_AUTH_AND_PAYMENT_DOMAINS = [
  "accounts.google.com",
  "appleid.apple.com",
  "github.com/login",
  "github.com/sessions",
  "login.microsoftonline.com",
  "facebook.com/dialog",
  "facebook.com/v",
  "twitter.com/i/oauth2",
  "x.com/i/oauth2",
  "discord.com/oauth2",
  "paypal.com",
  "auth0.com",
  "okta.com",
  "steamcommunity.com/openid",
  "id.twitch.tv",
  "gitlab.com/oauth",
  "bitbucket.org/site/oauth2",
  "login.yahoo.com",
  "checkout.stripe.com",
  "pay.google.com",
  "pay.amazon.com",
  "klarna.com",
  "shopify.com"
];

export function isSearchEngineUrl(urlStr: string): boolean {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    return (
      host.includes("google.") ||
      host.includes("bing.com") ||
      host.includes("duckduckgo.com") ||
      host.includes("ecosia.org") ||
      host.includes("brave.com") ||
      host.includes("yahoo.com") ||
      host.includes("yandex.") ||
      host.includes("baidu.com") ||
      host.includes("startpage.com")
    );
  } catch {
    return false;
  }
}

/**
 * Centrally evaluates whether a target URL is an ad, popunder, or ad redirector.
 */
export function isAdOrRedirectUrl(targetUrl: string, sourceUrl?: string): boolean {
  if (!targetUrl || targetUrl === "about:blank") return false;
  const urlLower = targetUrl.toLowerCase();

  // 1. Script/data schemes
  if (urlLower.startsWith("javascript:") || urlLower.startsWith("data:")) return true;

  // 2. Known ad networks & popunder keywords
  if (KNOWN_AD_POPUNDER_DOMAINS_AND_KEYWORDS.some((k) => urlLower.includes(k))) return true;

  // 3. Known ad redirect paths
  try {
    const parsed = new URL(targetUrl);
    const pathname = parsed.pathname.toLowerCase();
    if (SUSPICIOUS_AD_REDIRECT_PATHS.some((p) => pathname.includes(p))) return true;

    // 4. Third-party affiliate / click query keys
    const isThirdParty = sourceUrl ? isThirdPartyRequest(targetUrl, sourceUrl) : true;
    if (isThirdParty) {
      if (SUSPICIOUS_AFFILIATE_QUERY_KEYS.some((k) => parsed.searchParams.has(k))) {
        return true;
      }
    }
  } catch {}

  // 5. Evaluate against engine
  if (engine.isEnabled()) {
    const popupEval = engine.match({
      url: targetUrl,
      sourceUrl,
      resourceType: "popup",
    });
    if (popupEval.blocked) return true;

    const subdocEval = engine.match({
      url: targetUrl,
      sourceUrl,
      resourceType: "subdocument",
    });
    if (subdocEval.blocked) return true;

    const scriptEval = engine.match({
      url: targetUrl,
      sourceUrl,
      resourceType: "script",
    });
    if (scriptEval.blocked) return true;

    const xmlEval = engine.match({
      url: targetUrl,
      sourceUrl,
      resourceType: "xmlhttprequest",
    });
    if (xmlEval.blocked) return true;
  }

  return false;
}

const lastWindowOpenTimes = new Map<number, number>();

/**
 * Centrally intercepts window open requests from any WebContents in Forge,
 * evaluates AdBlock rules with full referrer/origin context, blocks popunders
 * and ad redirectors, and safely routes legitimate tabs to the Forge browser UI.
 */
export function handleWindowOpenRequest(
  contents: WebContents,
  details: HandlerDetails,
  getWin?: () => BrowserWindow | null
): { action: "deny" } {
  const targetUrl = details.url || "";
  const urlLower = targetUrl.toLowerCase();

  // 1. Instantly deny blank, javascript or data popunders
  if (
    !targetUrl ||
    targetUrl === "about:blank" ||
    targetUrl.startsWith("javascript:") ||
    targetUrl.startsWith("data:")
  ) {
    console.warn("[Forge Shield] Denied blank/script popunder:", targetUrl);
    return { action: "deny" };
  }

  const topPageUrl = !contents.isDestroyed() ? contents.getURL() : "";
  const referrerUrl = details.referrer?.url || "";
  const sourceUrl = referrerUrl || topPageUrl || "";
  const isThirdParty = isThirdPartyRequest(targetUrl, sourceUrl);

  const isLegitimateAuthOrPayment = LEGITIMATE_AUTH_AND_PAYMENT_DOMAINS.some((domain) =>
    urlLower.includes(domain)
  );

  // If a cross-origin embedded subframe (e.g. an embedded video player) attempts to open
  // any third-party target that is not legitimate OAuth/payment: BLOCK IMMEDIATELY!
  const isFromEmbeddedSubframe = Boolean(
    referrerUrl &&
    topPageUrl &&
    topPageUrl !== "about:blank" &&
    isThirdPartyRequest(referrerUrl, topPageUrl)
  );

  if (isFromEmbeddedSubframe && isThirdParty && !isLegitimateAuthOrPayment) {
    console.warn("[Forge Shield] Denied third-party popup from embedded subframe:", targetUrl, "subframe:", referrerUrl);
    return { action: "deny" };
  }

  if (engine.isEnabled()) {
    // 2. Evaluate with isAdOrRedirectUrl
    if (isAdOrRedirectUrl(targetUrl, sourceUrl)) {
      console.warn("[Forge Shield] Denied ad/redirect popup by URL heuristics/rules:", targetUrl);
      return { action: "deny" };
    }

    // 3. Evaluate with AdBlock Engine as popup
    const popupEval = evaluateAdBlockRequest({
      url: targetUrl,
      referrer: sourceUrl,
      resourceType: "popup",
    });
    if (popupEval.cancel) {
      console.warn("[Forge Shield] Denied ad popup by rule:", targetUrl, popupEval.decision.rule?.raw);
      return { action: "deny" };
    }

    // 4. Check popup window features (miniature window dimensions or disabled chrome)
    const isPopupWindow = Boolean(
      details.features && (
        details.features.includes("width=") ||
        details.features.includes("height=") ||
        details.features.includes("location=0") ||
        details.features.includes("menubar=0") ||
        details.features.includes("toolbar=0") ||
        details.features.includes("status=0")
      )
    );

    if (isPopupWindow && !isLegitimateAuthOrPayment) {
      console.warn("[Forge Shield] Denied suspicious non-OAuth popup window:", targetUrl);
      return { action: "deny" };
    }

    // 5. Defuse rapid-fire popunder spam per contents (< 800ms)
    const now = Date.now();
    const lastOpen = lastWindowOpenTimes.get(contents.id) || 0;
    if (now - lastOpen < 800) {
      console.warn("[Forge Shield] Denied rapid-fire popunder spam:", targetUrl);
      return { action: "deny" };
    }
    lastWindowOpenTimes.set(contents.id, now);
  }

  // Route legitimate navigation into a new tab in Forge UI
  try {
    const win = (getWin ? getWin() : null);
    if (win && !win.isDestroyed()) {
      win.webContents.send("tabs:open-tab", { url: targetUrl });
    }
  } catch (err) {
    console.error("[Forge Shield] Error routing link to tab:", err);
  }

  // STRICTLY ALWAYS return { action: "deny" } so Electron NEVER spawns a native OS BrowserWindow!
  return { action: "deny" };
}

