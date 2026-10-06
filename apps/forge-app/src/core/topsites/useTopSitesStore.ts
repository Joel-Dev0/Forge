import { create } from "zustand";

export interface TopSite {
  /** Normalized hostname (without leading www.) used as the unique key. */
  host: string;
  /** Representative landing URL (origin) used when the tile is clicked. */
  url: string;
  title: string;
  favicon?: string;
  visits: number;
  lastVisitedAt: number;
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

function prune(sites: Record<string, TopSite>): Record<string, TopSite> {
  const list = Object.values(sites);
  if (list.length <= MAX_SITES) return sites;
  list.sort((a, b) => b.visits - a.visits || b.lastVisitedAt - a.lastVisitedAt);
  const next: Record<string, TopSite> = {};
  for (const s of list.slice(0, MAX_SITES)) next[s.host] = s;
  return next;
}

export function selectTopSites(state: Pick<TopSitesState, "sites" | "hidden">, limit: number): TopSite[] {
  const hidden = new Set(state.hidden);
  return Object.values(state.sites)
    .filter((s) => !hidden.has(s.host))
    .sort((a, b) => b.visits - a.visits || b.lastVisitedAt - a.lastVisitedAt)
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

      const cleanTitle =
        parsed.isRoot && title && title !== "New Tab" && !/^https?:\/\//i.test(title) ? title : undefined;
      const site: TopSite = existing
        ? {
            ...existing,
            title: cleanTitle || existing.title,
            favicon: favicon || existing.favicon,
            visits: existing.visits + 1,
            lastVisitedAt: now,
          }
        : {
            host: parsed.host,
            url: parsed.origin,
            title: cleanTitle || parsed.host,
            favicon,
            visits: 1,
            lastVisitedAt: now,
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
