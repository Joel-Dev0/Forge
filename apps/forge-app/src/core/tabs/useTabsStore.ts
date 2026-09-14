import { create } from "zustand";

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface ClosedTabInfo {
  url: string;
  title: string;
  favicon: string;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string;
  recentlyClosedTabs: ClosedTabInfo[];
  openTab: (url?: string) => string;
  closeTab: (id: string) => void;
  reopenClosedTab: () => void;
  nextTab: () => void;
  prevTab: () => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Tab>) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
  moveTabLeft: () => void;
  moveTabRight: () => void;
}

const SESSION_STORAGE_KEY = "forge_session_tabs_v1";

let nextId = Date.now();

function makeTab(url = "about:blank"): Tab {
  return {
    id: `tab-${nextId++}`,
    title: "New Tab",
    url,
    favicon: "",
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  };
}

function loadSavedSession(): { tabs: Tab[]; activeTabId: string } | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
      const tabs: Tab[] = parsed.tabs.map((t: any) => ({
        id: String(t.id || `tab-${nextId++}`),
        title: String(t.title || "New Tab"),
        url: String(t.url || "about:blank"),
        favicon: String(t.favicon || ""),
        isLoading: false,
        canGoBack: Boolean(t.canGoBack),
        canGoForward: Boolean(t.canGoForward),
      }));
      const activeTabId = tabs.some((t) => t.id === parsed.activeTabId)
        ? parsed.activeTabId
        : tabs[0].id;
      return { tabs, activeTabId };
    }
  } catch {}
  return null;
}

function saveSession(tabs: Tab[], activeTabId: string) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        tabs: tabs.map(({ id, title, url, favicon, canGoBack, canGoForward }) => ({
          id,
          title,
          url,
          favicon,
          canGoBack,
          canGoForward,
        })),
        activeTabId,
      })
    );
  } catch {}
}

const saved = loadSavedSession();
const initialTab = saved ? null : makeTab();
const initialTabs = saved ? saved.tabs : [initialTab!];
const initialActiveId = saved ? saved.activeTabId : initialTab!.id;

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: initialTabs,
  activeTabId: initialActiveId,
  recentlyClosedTabs: [],

  openTab(url) {
    const tab = makeTab(url);
    set((s) => {
      const nextTabs = [...s.tabs, tab];
      saveSession(nextTabs, tab.id);
      return { tabs: nextTabs, activeTabId: tab.id };
    });
    return tab.id;
  },

  closeTab(id) {
    const { tabs, activeTabId, recentlyClosedTabs } = get();
    if (tabs.length === 1) return; // never close last tab
    const closingTab = tabs.find((t) => t.id === id);
    const updatedClosed =
      closingTab && closingTab.url && closingTab.url !== "about:blank"
        ? [
            ...recentlyClosedTabs.slice(-19), // keep last 20 closed tabs
            {
              url: closingTab.url,
              title: closingTab.title || "New Tab",
              favicon: closingTab.favicon || "",
            },
          ]
        : recentlyClosedTabs;

    const idx = tabs.findIndex((t) => t.id === id);
    const next = tabs[idx === 0 ? 1 : idx - 1];
    const nextTabs = tabs.filter((t) => t.id !== id);
    const nextActiveId = activeTabId === id ? next.id : activeTabId;
    saveSession(nextTabs, nextActiveId);
    set({
      tabs: nextTabs,
      activeTabId: nextActiveId,
      recentlyClosedTabs: updatedClosed,
    });
  },

  reopenClosedTab() {
    const { recentlyClosedTabs } = get();
    if (!recentlyClosedTabs || recentlyClosedTabs.length === 0) return;
    const lastClosed = recentlyClosedTabs[recentlyClosedTabs.length - 1];
    const nextClosed = recentlyClosedTabs.slice(0, -1);
    const tab = makeTab(lastClosed.url);
    tab.title = lastClosed.title || "New Tab";
    tab.favicon = lastClosed.favicon || "";
    set((s) => {
      const nextTabs = [...s.tabs, tab];
      saveSession(nextTabs, tab.id);
      return {
        tabs: nextTabs,
        activeTabId: tab.id,
        recentlyClosedTabs: nextClosed,
      };
    });
  },

  nextTab() {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const nextIdx = idx >= 0 ? (idx + 1) % tabs.length : 0;
    const nextId = tabs[nextIdx].id;
    saveSession(tabs, nextId);
    set({ activeTabId: nextId });
  },

  prevTab() {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const prevIdx = idx >= 0 ? (idx - 1 + tabs.length) % tabs.length : 0;
    const nextId = tabs[prevIdx].id;
    saveSession(tabs, nextId);
    set({ activeTabId: nextId });
  },

  setActiveTab(id) {
    const { tabs } = get();
    if (!tabs.some((t) => t.id === id)) return;
    saveSession(tabs, id);
    set({ activeTabId: id });
  },

  updateTab(id, patch) {
    set((s) => {
      const nextTabs = s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t));
      saveSession(nextTabs, s.activeTabId);
      return { tabs: nextTabs };
    });
  },

  moveTab(fromIndex, toIndex) {
    const { tabs, activeTabId } = get();
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= tabs.length ||
      toIndex >= tabs.length
    ) {
      return;
    }
    const nextTabs = [...tabs];
    const [moved] = nextTabs.splice(fromIndex, 1);
    nextTabs.splice(toIndex, 0, moved);
    saveSession(nextTabs, activeTabId);
    set({ tabs: nextTabs });
  },

  moveTabLeft() {
    const { tabs, activeTabId } = get();
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    if (idx > 0) {
      get().moveTab(idx, idx - 1);
    }
  },

  moveTabRight() {
    const { tabs, activeTabId } = get();
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    if (idx >= 0 && idx < tabs.length - 1) {
      get().moveTab(idx, idx + 1);
    }
  },
}));
