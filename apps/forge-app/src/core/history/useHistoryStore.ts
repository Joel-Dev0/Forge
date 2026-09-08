import { create } from "zustand";

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  visitedAt: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  searchQuery: string;
  addEntry: (title: string, url: string, favicon?: string) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  setSearchQuery: (q: string) => void;
}

const STORAGE_KEY = "forge_history_v1";

function loadInitialHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 1000)));
  } catch {}
}

export const useHistoryStore = create<HistoryState>((set) => {
  const initial = loadInitialHistory();

  return {
    entries: initial,
    searchQuery: "",

    addEntry(title, url, favicon) {
      if (!url || url === "about:blank" || url.startsWith("data:")) return;

      set((s) => {
        const cleanTitle = (title && title !== "New Tab") ? title : url;
        const existingIdx = s.entries.findIndex((e) => e.url === url);
        let updatedList = [...s.entries];

        if (existingIdx !== -1) {
          const existing = updatedList[existingIdx];
          const updatedEntry: HistoryEntry = {
            ...existing,
            title: (cleanTitle && cleanTitle !== url) ? cleanTitle : existing.title,
            favicon: favicon || existing.favicon,
            visitedAt: Date.now(),
          };
          updatedList.splice(existingIdx, 1);
          updatedList.unshift(updatedEntry);
        } else {
          const newEntry: HistoryEntry = {
            id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: cleanTitle,
            url,
            favicon,
            visitedAt: Date.now(),
          };
          updatedList.unshift(newEntry);
        }

        const next = updatedList.slice(0, 1000);
        saveHistory(next);
        return { entries: next };
      });
    },

    removeEntry(id) {
      set((s) => {
        const next = s.entries.filter((e) => e.id !== id);
        saveHistory(next);
        return { entries: next };
      });
    },

    clearHistory() {
      saveHistory([]);
      set({ entries: [] });
    },

    setSearchQuery(searchQuery) {
      set({ searchQuery });
    },
  };
});
