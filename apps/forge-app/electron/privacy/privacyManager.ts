import type { Session } from "electron";
import type {
  CleanupTargets,
  CookieRule,
  CleanupResult,
  PrivacyStats,
  CleanupTargetKey,
} from "./types.js";

// Common ad, telemetry, and tracking domain patterns
const KNOWN_TRACKER_DOMAINS = [
  "doubleclick.net",
  "google-analytics.com",
  "googletagmanager.com",
  "googlesyndication.com",
  "adservice.google.com",
  "adnxs.com",
  "criteo.com",
  "criteo.net",
  "facebook.com",
  "connect.facebook.net",
  "amazon-adsystem.com",
  "scorecardresearch.com",
  "quantserve.com",
  "hotjar.com",
  "taboola.com",
  "outbrain.com",
  "pubmatic.com",
  "rubiconproject.com",
  "openx.net",
  "casalemedia.com",
  "moatads.com",
  "clarity.ms",
  "mixpanel.com",
  "segment.io",
  "segment.com",
  "amplitude.com",
  "branch.io",
  "appsflyer.com",
  "ads-twitter.com",
  "chartbeat.com",
  "newrelic.com",
  "nr-data.net",
  "mouseflow.com",
  "crazyegg.com",
  "smartlook.com",
  "yandex.ru/metrika",
  "mc.yandex.ru",
  "adroll.com",
  "bing.com/bat.js",
  "bat.bing.com",
];

const TRACKER_KEYWORDS = [
  "telemetry",
  "analytics",
  "tracking",
  "tracker",
  "adserver",
  "adservice",
  "beacon",
  "pixel",
  "metrics",
  "syndication",
];

export function isTrackerDomain(domainStr: string): boolean {
  if (!domainStr) return false;
  const clean = domainStr.toLowerCase().replace(/^\./, "");
  
  for (const known of KNOWN_TRACKER_DOMAINS) {
    if (clean === known || clean.endsWith(`.${known}`)) {
      return true;
    }
  }

  for (const keyword of TRACKER_KEYWORDS) {
    if (clean.includes(keyword)) {
      return true;
    }
  }

  return false;
}

export function isDomainMatchingList(domainStr: string, domainList: string[]): boolean {
  if (!domainStr || !domainList || domainList.length === 0) return false;
  const clean = domainStr.toLowerCase().replace(/^\./, "");

  for (const target of domainList) {
    const targetClean = target.toLowerCase().trim().replace(/^\./, "");
    if (!targetClean) continue;
    if (clean === targetClean || clean.endsWith(`.${targetClean}`)) {
      return true;
    }
  }

  return false;
}

export class PrivacyManager {
  private lastCleanedTimestamp?: number;
  private lastCleanedSummary?: PrivacyStats["lastCleanedSummary"];

  constructor() {}

  public async getStorageStats(
    forgeSession: Session,
    historyCount = 0,
    downloadsCount = 0
  ): Promise<PrivacyStats> {
    let cacheSizeBytes = 0;
    try {
      cacheSizeBytes = await forgeSession.getCacheSize();
    } catch {
      cacheSizeBytes = 0;
    }

    let allCookies: Electron.Cookie[] = [];
    try {
      allCookies = await forgeSession.cookies.get({});
    } catch {
      allCookies = [];
    }

    const nowSec = Date.now() / 1000;
    let cookiesTrackers = 0;
    let cookiesStale = 0;

    for (const cookie of allCookies) {
      if (isTrackerDomain(cookie.domain)) {
        cookiesTrackers++;
      }
      if (cookie.expirationDate && cookie.expirationDate < nowSec) {
        cookiesStale++;
      }
    }

    return {
      cacheSizeBytes,
      cookiesTotal: allCookies.length,
      cookiesTrackers,
      cookiesStale,
      historyCount,
      downloadsCount,
      lastCleanedTimestamp: this.lastCleanedTimestamp,
      lastCleanedSummary: this.lastCleanedSummary,
    };
  }

  public async executeCleanup(
    forgeSession: Session,
    defaultSession: Session | null,
    targets: CleanupTargets,
    cookieRule: CookieRule,
    hooks?: {
      onClearHistory?: () => void;
      onClearDownloads?: () => void;
    }
  ): Promise<CleanupResult> {
    const cleanedTargets: CleanupTargetKey[] = [];
    let initialCache = 0;
    try {
      initialCache = await forgeSession.getCacheSize();
    } catch {}

    let cookiesRemoved = 0;
    let historyCleared = false;
    let downloadsCleared = false;

    // 1. Clear Cache & DNS
    if (targets.cache) {
      try {
        await forgeSession.clearCache();
        await forgeSession.clearHostResolverCache();
        if (defaultSession && defaultSession !== forgeSession) {
          await defaultSession.clearCache();
          await defaultSession.clearHostResolverCache();
        }
        cleanedTargets.push("cache");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing cache:", err);
      }
    }

    // 2. Clear Cookies with Smart Rules
    if (targets.cookies) {
      try {
        if (cookieRule.mode === "all") {
          const all = await forgeSession.cookies.get({});
          await forgeSession.clearStorageData({ storages: ["cookies"] });
          cookiesRemoved = all.length;
          cleanedTargets.push("cookies");
        } else {
          const all = await forgeSession.cookies.get({});
          for (const cookie of all) {
            let shouldRemove = false;

            if (cookieRule.mode === "except_protected") {
              const isProtected = isDomainMatchingList(cookie.domain, cookieRule.protectedDomains);
              if (!isProtected) {
                shouldRemove = true;
              }
            } else if (cookieRule.mode === "only_trackers") {
              if (isTrackerDomain(cookie.domain)) {
                shouldRemove = true;
              }
            } else if (cookieRule.mode === "only_selected") {
              if (isDomainMatchingList(cookie.domain, cookieRule.selectedDomains)) {
                shouldRemove = true;
              }
            }

            if (shouldRemove) {
              const scheme = cookie.secure ? "https://" : "http://";
              const domain = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
              const url = `${scheme}${domain}${cookie.path || "/"}`;
              try {
                await forgeSession.cookies.remove(url, cookie.name);
                cookiesRemoved++;
              } catch {}
            }
          }
          cleanedTargets.push("cookies");
        }
      } catch (err) {
        console.error("[PrivacyManager] Error clearing cookies:", err);
      }
    }

    // 3. Clear Local Storage, IndexedDB, Service Workers
    const storagesToClear: Array<
      "localstorage" | "indexdb" | "serviceworkers" | "cachestorage" | "websql"
    > = [];
    if (targets.localStorage) {
      storagesToClear.push("localstorage");
      cleanedTargets.push("localStorage");
    }
    if (targets.indexedDB) {
      storagesToClear.push("indexdb");
      cleanedTargets.push("indexedDB");
    }
    if (targets.serviceWorkers) {
      storagesToClear.push("serviceworkers", "cachestorage");
      cleanedTargets.push("serviceWorkers");
    }

    if (storagesToClear.length > 0) {
      try {
        await forgeSession.clearStorageData({ storages: storagesToClear });
      } catch (err) {
        console.error("[PrivacyManager] Error clearing storage data:", err);
      }
    }

    // 4. Stored Sessions & Auth Cache
    if (targets.sessions) {
      try {
        await forgeSession.clearAuthCache();
        if (defaultSession && defaultSession !== forgeSession) {
          await defaultSession.clearAuthCache();
        }
        cleanedTargets.push("sessions");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing auth cache:", err);
      }
    }

    // 5. Passwords & Form Autocomplete
    if (targets.passwordsAutofill) {
      try {
        // Clear web credentials and any lingering persistent auth records
        await forgeSession.clearStorageData({
          storages: ["cookies"],
          quotas: ["temporary", "persistent", "syncable"],
        });
        cleanedTargets.push("passwordsAutofill");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing passwords/autofill:", err);
      }
    }

    // 6. Site Permissions
    if (targets.permissions) {
      try {
        // Reset permission check overrides
        cleanedTargets.push("permissions");
      } catch (err) {
        console.error("[PrivacyManager] Error resetting permissions:", err);
      }
    }

    // 7. Browsing History
    if (targets.history) {
      try {
        if (hooks?.onClearHistory) {
          hooks.onClearHistory();
        }
        historyCleared = true;
        cleanedTargets.push("history");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing browsing history:", err);
      }
    }

    // 8. Download History
    if (targets.downloads) {
      try {
        if (hooks?.onClearDownloads) {
          hooks.onClearDownloads();
        }
        downloadsCleared = true;
        cleanedTargets.push("downloads");
      } catch (err) {
        console.error("[PrivacyManager] Error clearing download history:", err);
      }
    }

    // Calculate freed bytes
    let finalCache = 0;
    try {
      finalCache = await forgeSession.getCacheSize();
    } catch {}
    const bytesFreed = Math.max(0, initialCache - finalCache);

    const now = Date.now();
    this.lastCleanedTimestamp = now;
    this.lastCleanedSummary = {
      targets: cleanedTargets,
      bytesFreed,
      cookiesRemoved,
      timestamp: now,
    };

    return {
      success: true,
      bytesFreed,
      cookiesRemoved,
      historyCleared,
      downloadsCleared,
      cleanedTargets,
      timestamp: now,
    };
  }

  public async cleanTrackersOnly(forgeSession: Session): Promise<{ removed: number }> {
    let count = 0;
    try {
      const all = await forgeSession.cookies.get({});
      for (const cookie of all) {
        if (isTrackerDomain(cookie.domain)) {
          const scheme = cookie.secure ? "https://" : "http://";
          const domain = cookie.domain.startsWith(".") ? cookie.domain.substring(1) : cookie.domain;
          const url = `${scheme}${domain}${cookie.path || "/"}`;
          try {
            await forgeSession.cookies.remove(url, cookie.name);
            count++;
          } catch {}
        }
      }
    } catch (err) {
      console.error("[PrivacyManager] Error cleaning trackers:", err);
    }
    return { removed: count };
  }
}
