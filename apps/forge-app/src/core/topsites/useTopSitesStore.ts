import { create } from "zustand";

export interface TopSite {
  /** Normalized hostname (without leading www.) used as the unique key. */
  host: string;
  /** Representative landing URL (origin) used when the tile is clicked. */
  url: string;
  title: string;
  favicon?: string;
  /** Total lifetime visits recorded for this host. */
  visits: number;
  /** Timestamp (ms) of the most recent visit. */
  lastVisitedAt: number;
  /**
   * Timestamps (ms) of recent visits (rolling window, capped) used to compute
   * dynamic frecency (frequency + recency) and detect recurring activity.
   */
  recentVisits?: number[];
}

interface TopSitesState {
  sites: Record<string, TopSite>;
  /** Hosts the user explicitly removed from the Top Sites grid. */
  hidden: string[];
  recordVisit: (url: string, title?: string, favicon?: string) => void;
  updateMeta: (url: string, meta: { title?: string; favicon?: string }) => void;
  hideSite: (host: string) => void;
  restoreHidden: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = "forge_top_sites_v1";
const MAX_SITES = 300;
/** Ignore repeated visits to the same host inside this window (reload / redirect spam). */
const VISIT_DEBOUNCE_MS = 4000;

const ONE_HOUR = 3600 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

/** Window in days after which an inactive page is completely set aside from the Top Sites grid. */
export const MAX_INACTIVITY_DAYS = 28;

/** Minimum visits required to establish recurring activity (avoids accidental 1-time visits). */
export const MIN_RECURRING_VISITS = 2;

/**
 * Backward compatibility alias for any caller expecting MIN_TOP_SITE_VISITS.
 * Formerly 7, now set to MIN_RECURRING_VISITS (2) so recurring activity qualifies immediately.
 */
export const MIN_TOP_SITE_VISITS = MIN_RECURRING_VISITS;

/** Minimum frecency score required to remain active in the Top Sites grid. */
export const MIN_ACTIVE_SCORE = 20;

/** Max recent visit timestamps stored per site in localStorage to keep storage compact. */
const MAX_RECENT_TIMESTAMPS = 40;

interface Persisted {
  sites: Record<string, TopSite>;
  hidden: string[];
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sites: {}, hidden: [] };
    const parsed = JSON.parse(raw);
    return {
      sites: parsed && typeof parsed.sites === "object" && parsed.sites ? parsed.sites : {},
      hidden: Array.isArray(parsed?.hidden) ? parsed.hidden : [],
    };
  } catch {
    return { sites: {}, hidden: [] };
  }
}

function save(data: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Returns the normalized host + origin for a trackable page, or null for
 * internal / non-web / local URLs that must never show up as a "top site".
 */
export function parseTrackableUrl(rawUrl: string): { host: string; origin: string; isRoot: boolean } | null {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
    return { host, origin: `${u.protocol}//${u.host}`, isRoot: u.pathname === "/" || u.pathname === "" };
  } catch {
    return null;
  }
}

/**
 * Assigns a weight to a visit based on how recently it occurred:
 * - Within 24 hours: 100 points
 * - Within 4 days:    70 points
 * - Within 14 days:   35 points
 * - Within 28 days:   10 points
 * - Older than 28d:    0 points (decayed / set aside)
 */
export function getVisitRecencyWeight(ageMs: number): number {
  if (ageMs < 1 * ONE_DAY) return 100;
  if (ageMs < 4 * ONE_DAY) return 70;
  if (ageMs < 14 * ONE_DAY) return 35;
  if (ageMs < 28 * ONE_DAY) return 10;
  return 0;
}

/**
 * Computes a dynamic Frecency (Frequency + Recency) score for a site.
 * Sites that the user frequents heavily now rank at the top, while sites the user
 * has stopped visiting decay over time and drop to 0.
 */
export function computeFrecencyScore(site: TopSite, now: number = Date.now()): number {
  const daysSinceLast = (now - site.lastVisitedAt) / ONE_DAY;
  if (daysSinceLast > MAX_INACTIVITY_DAYS) {
    return 0; // Page has been set aside due to inactivity (> 28 days)
  }

  if (Array.isArray(site.recentVisits) && site.recentVisits.length > 0) {
    let score = 0;
    for (const ts of site.recentVisits) {
      score += getVisitRecencyWeight(now - ts);
    }
    return score;
  }

  // Graceful fallback for legacy records saved before recentVisits tracking:
  const baseWeight = getVisitRecencyWeight(now - site.lastVisitedAt);
  if (baseWeight === 0) return 0;
  return baseWeight + Math.min(site.visits - 1, 15) * (baseWeight * 0.25);
}

function prune(sites: Record<string, TopSite>): Record<string, TopSite> {
  const now = Date.now();
  const list = Object.values(sites);
  if (list.length <= MAX_SITES) return sites;
  list.sort((a, b) => {
    const scoreB = computeFrecencyScore(b, now);
    const scoreA = computeFrecencyScore(a, now);
    return scoreB - scoreA || b.visits - a.visits || b.lastVisitedAt - a.lastVisitedAt;
  });
  const next: Record<string, TopSite> = {};
  for (const s of list.slice(0, MAX_SITES)) next[s.host] = s;
  return next;
}

/**
 * Selects the most resorted-to and frequently visited sites based on recurring activity:
 * 1. Excludes explicitly hidden hosts.
 * 2. Requires recurring activity (visits >= minVisits, default 2), filtering out one-off visits.
 * 3. Excludes inactive pages that the user stopped using (> 28 days or score < 20).
 * 4. Ranks by dynamic frecency score descending, ensuring currently active sites lead.
 */
export function selectTopSites(
  state: Pick<TopSitesState, "sites" | "hidden">,
  limit: number,
  minVisits: number = MIN_RECURRING_VISITS,
  now: number = Date.now()
): TopSite[] {
  const hidden = new Set(state.hidden);
  return Object.values(state.sites)
    .filter((s) => {
      if (hidden.has(s.host)) return false;
      if (s.visits < minVisits) return false;
      const daysSinceLast = (now - s.lastVisitedAt) / ONE_DAY;
      if (daysSinceLast > MAX_INACTIVITY_DAYS) return false;
      const score = computeFrecencyScore(s, now);
      return score >= MIN_ACTIVE_SCORE;
    })
    .sort((a, b) => {
      const scoreB = computeFrecencyScore(b, now);
      const scoreA = computeFrecencyScore(a, now);
      return scoreB - scoreA || b.lastVisitedAt - a.lastVisitedAt;
    })
    .slice(0, limit);
}

const initial = load();

export const useTopSitesStore = create<TopSitesState>((set) => ({
  sites: initial.sites,
  hidden: initial.hidden,

  recordVisit(url, title, favicon) {
    const parsed = parseTrackableUrl(url);
    if (!parsed) return;

    set((s) => {
      const existing = s.sites[parsed.host];
      const now = Date.now();
      if (existing && now - existing.lastVisitedAt < VISIT_DEBOUNCE_MS) {
        return s;
      }

      // Filter recent visits within 35 days and append current timestamp
      const existingRecent = Array.isArray(existing?.recentVisits)
        ? existing.recentVisits.filter((ts) => now - ts < 35 * ONE_DAY)
        : existing?.lastVisitedAt
        ? [existing.lastVisitedAt]
        : [];

      const recentVisits = [...existingRecent, now].slice(-MAX_RECENT_TIMESTAMPS);

      const cleanTitle =
        parsed.isRoot && title && title !== "New Tab" && !/^https?:\/\//i.test(title) ? title : undefined;
      const site: TopSite = existing
        ? {
            ...existing,
            title: cleanTitle || existing.title,
            favicon: favicon || existing.favicon,
            visits: existing.visits + 1,
            lastVisitedAt: now,
            recentVisits,
          }
        : {
            host: parsed.host,
            url: parsed.origin,
            title: cleanTitle || parsed.host,
            favicon,
            visits: 1,
            lastVisitedAt: now,
            recentVisits: [now],
          };

      const sites = prune({ ...s.sites, [parsed.host]: site });
      save({ sites, hidden: s.hidden });
      return { sites };
    });
  },

  updateMeta(url, meta) {
    const parsed = parseTrackableUrl(url);
    if (!parsed) return;

    set((s) => {
      const existing = s.sites[parsed.host];
      if (!existing) return s;

      let isRootPage = false;
      try {
        const p = new URL(url).pathname;
        isRootPage = p === "/" || p === "";
      } catch {}

      const cleanTitle =
        isRootPage && meta.title && meta.title !== "New Tab" && !/^https?:\/\//i.test(meta.title)
          ? meta.title
          : undefined;
      const title = cleanTitle || existing.title;
      const favicon = meta.favicon || existing.favicon;
      if (title === existing.title && favicon === existing.favicon) return s;

      const sites = { ...s.sites, [parsed.host]: { ...existing, title, favicon } };
      save({ sites, hidden: s.hidden });
      return { sites };
    });
  },

  hideSite(host) {
    set((s) => {
      if (s.hidden.includes(host)) return s;
      const hidden = [...s.hidden, host];
      save({ sites: s.sites, hidden });
      return { hidden };
    });
  },

  restoreHidden() {
    set((s) => {
      save({ sites: s.sites, hidden: [] });
      return { hidden: [] };
    });
  },

  clearAll() {
    save({ sites: {}, hidden: [] });
    set({ sites: {}, hidden: [] });
  },
}));

// Keep multiple Forge windows in sync in real time through the storage event.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    const data = load();
    useTopSitesStore.setState({ sites: data.sites, hidden: data.hidden });
  });
}
