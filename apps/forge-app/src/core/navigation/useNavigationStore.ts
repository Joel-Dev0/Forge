import { create } from "zustand";

export type SearchEngine = "google" | "duckduckgo" | "bing";

export interface SearchEngineConfig {
  id: SearchEngine;
  name: string;
  placeholder: string;
  buildUrl: (query: string) => string;
}

export const SEARCH_ENGINES: Record<SearchEngine, SearchEngineConfig> = {
  google: {
    id: "google",
    name: "Google",
    placeholder: "Search with Google or enter address...",
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  duckduckgo: {
    id: "duckduckgo",
    name: "DuckDuckGo",
    placeholder: "Search with DuckDuckGo or enter address...",
    buildUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  },
  bing: {
    id: "bing",
    name: "Bing",
    placeholder: "Search with Bing or enter address...",
    buildUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
};

const STORAGE_KEY_SEARCH_ENGINE = "forge_search_engine_v1";

function getInitialSearchEngine(): SearchEngine {
  if (typeof window === "undefined") return "google";
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SEARCH_ENGINE) as SearchEngine;
    if (saved && SEARCH_ENGINES[saved]) return saved;
  } catch {}
  return "google";
}

export function buildSearchUrl(query: string, engine?: SearchEngine): string {
  let selected = engine;
  if (!selected) {
    try {
      selected = useNavigationStore.getState().searchEngine;
    } catch {
      selected = getInitialSearchEngine();
    }
  }
  const config = SEARCH_ENGINES[selected || "google"] || SEARCH_ENGINES.google;
  return config.buildUrl(query);
}

export function normalizeUrl(raw: string, engine?: SearchEngine): string {
  let trimmed = raw.trim();
  if (!trimmed) return "about:blank";

  // If query starts with '?' explicitly treat as search
  if (trimmed.startsWith("?")) {
    const query = trimmed.substring(1).trim();
    return buildSearchUrl(query, engine);
  }

  // If it already has a protocol scheme, return as-is
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return trimmed;
  }

  // Localhost or IPv4 pattern (e.g. localhost:5173, 127.0.0.1:8080)
  if (/^(localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  // Standard domain pattern without spaces (e.g. google.com, youtube.com/watch, sub.domain.co.uk)
  if (
    /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed) &&
    !trimmed.includes(" ")
  ) {
    return `https://${trimmed}`;
  }

  // Otherwise treat as a search query
  return buildSearchUrl(trimmed, engine);
}

interface NavigationState {
  urlBarValue: string;
  searchEngine: SearchEngine;
  setUrlBarValue: (v: string) => void;
  setSearchEngine: (engine: SearchEngine) => void;
  navigate: (url: string) => string;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  urlBarValue: "",
  searchEngine: getInitialSearchEngine(),

  setUrlBarValue(v) {
    set({ urlBarValue: v });
  },

  setSearchEngine(engine) {
    try {
      localStorage.setItem(STORAGE_KEY_SEARCH_ENGINE, engine);
    } catch {}
    set({ searchEngine: engine });
  },

  navigate(raw) {
    const url = normalizeUrl(raw, get().searchEngine);
    set({ urlBarValue: url });
    return url;
  },
}));

