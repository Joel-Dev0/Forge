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

interface TabsState {
  tabs: Tab[];
  activeTabId: string;
  openTab: (url?: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Tab>) => void;
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
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) return; // never close last tab
    const idx = tabs.findIndex((t) => t.id === id);
    const next = tabs[idx === 0 ? 1 : idx - 1];
    const nextTabs = tabs.filter((t) => t.id !== id);
    const nextActiveId = activeTabId === id ? next.id : activeTabId;
    saveSession(nextTabs, nextActiveId);
    set({
      tabs: nextTabs,
      activeTabId: nextActiveId,
    });
  },

  setActiveTab(id) {
    const { tabs } = get();
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
}));
