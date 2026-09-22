import { create } from "zustand";

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isLazy?: boolean;
  isPlayingAudio?: boolean;
  isMuted?: boolean;
  memoryMB?: number;
  lastActiveAt?: number;
  isSleeping?: boolean;
  sessionId?: string; // Container session binding (e.g. "default", "personal", "work")
}

interface ClosedTabInfo {
  url: string;
  title: string;
  favicon: string;
  sessionId?: string;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string;
  recentlyClosedTabs: ClosedTabInfo[];
  splitTabId: string | null;
  splitOrientation: "horizontal" | "vertical";
  splitRatio: number; // default 0.5
  focusedSplitPane: "primary" | "secondary";
  setSplitTab: (id: string | null) => void;
  toggleSplitTab: (id: string) => void;
  setSplitOrientation: (orientation: "horizontal" | "vertical") => void;
  setSplitRatio: (ratio: number) => void;
  setFocusedSplitPane: (pane: "primary" | "secondary") => void;
  setTabSession: (tabId: string, sessionId: string) => void;
  openTab: (url?: string, sessionId?: string) => string;
  closeTab: (id: string) => void;
  reopenClosedTab: () => void;
  nextTab: () => void;
  prevTab: () => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, patch: Partial<Tab>) => void;
  moveTab: (fromIndex: number, toIndex: number) => void;
  moveTabLeft: () => void;
  moveTabRight: () => void;
  toggleMuteTab: (id: string) => void;
  setTabAudio: (id: string, isPlayingAudio: boolean, isMuted?: boolean) => void;
  updateTabsMemory: (memoryMap: Record<string, { memoryMB: number; cpuPercent?: number }>) => void;
  snoozeTab: (id: string) => void;
  wakeTab: (id: string) => void;
  checkAutoSleepTabs: (maxIdleMinutes?: number) => void;
}

const SESSION_STORAGE_KEY = "forge_session_tabs_v1";

let nextId = Date.now();

export function getCleanFallbackTitle(url?: string, currentTitle?: string): string {
  const trimmed = currentTitle?.trim();
  if (
    trimmed &&
    trimmed !== "New Tab" &&
    trimmed !== "about:blank" &&
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  const targetUrl =
    trimmed && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
      ? trimmed
      : url;

  if (!targetUrl || targetUrl === "about:blank") return "New Tab";

  try {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host.includes("google.")) {
      let q = parsed.searchParams.get("q");
      if (!q && parsed.searchParams.has("continue")) {
        try {
          const cont = new URL(parsed.searchParams.get("continue")!);
          q = cont.searchParams.get("q");
        } catch {}
      }
      if (q) return `${decodeURIComponent(q)} - Google Search`;
    }
    if (host.includes("bing.com")) {
      const q = parsed.searchParams.get("q");
      if (q) return `${decodeURIComponent(q)} - Bing`;
    }
    if (host.includes("duckduckgo.com")) {
      const q = parsed.searchParams.get("q");
      if (q) return `${decodeURIComponent(q)} - DuckDuckGo`;
    }
    if (host.includes("youtube.com") && parsed.pathname.includes("/watch")) {
      return "YouTube Video";
    }

    if (host) {
      return host;
    }
  } catch {}

  return "New Tab";
}

function makeTab(url = "about:blank", sessionId = "default"): Tab {
  const title = getCleanFallbackTitle(url);
  let favicon = "";
  if (url && url !== "about:blank") {
    try {
      const host = new URL(url).hostname;
      if (host) favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
    } catch {}
  }
  return {
    id: `tab-${nextId++}`,
    title,
    url,
    favicon,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    isLazy: false,
    isPlayingAudio: false,
    isMuted: false,
    memoryMB: url && url !== "about:blank" ? 65 : 20,
    lastActiveAt: Date.now(),
    isSleeping: false,
    sessionId: sessionId || "default",
  };
}

function loadSavedSession(): { tabs: Tab[]; activeTabId: string } | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
      const activeTabId = parsed.tabs.some((t: any) => t.id === parsed.activeTabId)
        ? parsed.activeTabId
        : parsed.tabs[0].id;
      const tabs: Tab[] = parsed.tabs.map((t: any) => {
        const id = String(t.id || `tab-${nextId++}`);
        const url = String(t.url || "about:blank");
        const isActive = id === activeTabId;
        const title = getCleanFallbackTitle(url, t.title);
        let favicon = String(t.favicon || "");
        if (!favicon && url && url !== "about:blank") {
          try {
            const host = new URL(url).hostname;
            if (host) favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
          } catch {}
        }
        const isDormant = !isActive && url !== "about:blank";
        return {
          id,
          title,
          url,
          favicon,
          isLoading: false,
          canGoBack: Boolean(t.canGoBack),
          canGoForward: Boolean(t.canGoForward),
          isLazy: isDormant,
          isPlayingAudio: false,
          isMuted: false,
          memoryMB: isDormant ? 0 : (url && url !== "about:blank" ? 58 : 22),
          lastActiveAt: Date.now(),
          isSleeping: isDormant,
          sessionId: t.sessionId || "default",
        };
      });
      return { tabs, activeTabId };
    }
  } catch {}
  return null;
}

export function saveSession(tabs: Tab[], activeTabId: string) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const payload = {
      tabs: tabs.map(({ id, title, url, favicon, canGoBack, canGoForward, sessionId }) => {
        const cleanTitle = getCleanFallbackTitle(url, title);
        let cleanFavicon = favicon;
        if (!cleanFavicon && url && url !== "about:blank") {
          try {
            const host = new URL(url).hostname;
            if (host) cleanFavicon = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
          } catch {}
        }
        return {
          id,
          title: cleanTitle,
          url,
          favicon: cleanFavicon,
          canGoBack,
          canGoForward,
          sessionId: sessionId || "default",
        };
      }),
      activeTabId,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    (window as any).forge?.session?.saveBackup?.(payload);
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
  splitTabId: null,
  splitOrientation: "horizontal",
  splitRatio: 0.5,
  focusedSplitPane: "primary",

  setSplitTab(id) {
    if (id && id === get().activeTabId) return;
    set({ splitTabId: id, focusedSplitPane: id ? "secondary" : "primary" });
  },

  toggleSplitTab(id) {
    const { splitTabId, activeTabId } = get();
    if (splitTabId === id) {
      set({ splitTabId: null, focusedSplitPane: "primary" });
    } else if (id !== activeTabId) {
      set({ splitTabId: id, focusedSplitPane: "secondary" });
    }
  },

  setSplitOrientation(orientation) {
    set({ splitOrientation: orientation });
  },

  setSplitRatio(ratio) {
    const clamped = Math.max(0.2, Math.min(0.8, ratio));
    set({ splitRatio: clamped });
  },

  setFocusedSplitPane(pane) {
    set({ focusedSplitPane: pane });
  },

  setTabSession(tabId, sessionId) {
    set((s) => {
      const nextTabs = s.tabs.map((t) => (t.id === tabId ? { ...t, sessionId } : t));
      saveSession(nextTabs, s.activeTabId);
      return { tabs: nextTabs };
    });
  },

  openTab(url, sessionId) {
    const tab = makeTab(url, sessionId);
    set((s) => {
      const nextTabs = [...s.tabs, tab];
      saveSession(nextTabs, tab.id);
      return { tabs: nextTabs, activeTabId: tab.id };
    });
    return tab.id;
  },

  closeTab(id) {
    const { tabs, activeTabId, recentlyClosedTabs, splitTabId } = get();
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
              sessionId: closingTab.sessionId || "default",
            },
          ]
        : recentlyClosedTabs;

    const idx = tabs.findIndex((t) => t.id === id);
    const next = tabs[idx === 0 ? 1 : idx - 1];
    const nextTabs = tabs.filter((t) => t.id !== id);
    const nextActiveId = activeTabId === id ? next.id : activeTabId;
    const nextSplitId = splitTabId === id ? null : splitTabId;
    saveSession(nextTabs, nextActiveId);
    set({
      tabs: nextTabs,
      activeTabId: nextActiveId,
      splitTabId: nextSplitId,
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
    const now = Date.now();
    const nextTabs = tabs.map((t) =>
      t.id === nextId
        ? { ...t, isLazy: false, isSleeping: false, lastActiveAt: now }
        : t
    );
    saveSession(nextTabs, nextId);
    set({ tabs: nextTabs, activeTabId: nextId });
  },

  prevTab() {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const prevIdx = idx >= 0 ? (idx - 1 + tabs.length) % tabs.length : 0;
    const nextId = tabs[prevIdx].id;
    const now = Date.now();
    const nextTabs = tabs.map((t) =>
      t.id === nextId
        ? { ...t, isLazy: false, isSleeping: false, lastActiveAt: now }
        : t
    );
    saveSession(nextTabs, nextId);
    set({ tabs: nextTabs, activeTabId: nextId });
  },

  setActiveTab(id) {
    const { tabs } = get();
    if (!tabs.some((t) => t.id === id)) return;
    const now = Date.now();
    const nextTabs = tabs.map((t) =>
      t.id === id
        ? { ...t, isLazy: false, isSleeping: false, lastActiveAt: now }
        : t
    );
    saveSession(nextTabs, id);
    set({ tabs: nextTabs, activeTabId: id });
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

  toggleMuteTab(id) {
    const { tabs } = get();
    const target = tabs.find((t) => t.id === id);
    if (!target) return;
    const nextMuted = !target.isMuted;
    const nextTabs = tabs.map((t) => (t.id === id ? { ...t, isMuted: nextMuted } : t));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("forge:toggle-tab-mute", { detail: { tabId: id, isMuted: nextMuted } })
      );
    }
    set({ tabs: nextTabs });
  },

  setTabAudio(id, isPlayingAudio, isMuted) {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              isPlayingAudio,
              isMuted: isMuted !== undefined ? isMuted : t.isMuted,
            }
          : t
      ),
    }));
  },

  updateTabsMemory(memoryMap) {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.isLazy || t.isSleeping) {
          return t.memoryMB !== 0 ? { ...t, memoryMB: 0 } : t;
        }
        const data = memoryMap[t.id];
        if (data && data.memoryMB !== undefined) {
          return { ...t, memoryMB: data.memoryMB };
        }
        return t;
      }),
    }));
  },

  snoozeTab(id) {
    const { tabs, activeTabId } = get();
    if (id === activeTabId) return; // Never sleep the tab user is looking at
    const target = tabs.find((t) => t.id === id);
    if (!target || target.isPlayingAudio || target.url === "about:blank") return; // Never sleep tab playing music or blank
    const nextTabs = tabs.map((t) =>
      t.id === id ? { ...t, isLazy: true, isSleeping: true, memoryMB: 0 } : t
    );
    saveSession(nextTabs, activeTabId);
    set({ tabs: nextTabs });
  },

  wakeTab(id) {
    const { tabs, activeTabId } = get();
    const nextTabs = tabs.map((t) =>
      t.id === id
        ? {
            ...t,
            isLazy: false,
            isSleeping: false,
            lastActiveAt: Date.now(),
            memoryMB: t.url && t.url !== "about:blank" ? 58 : 22,
          }
        : t
    );
    saveSession(nextTabs, activeTabId);
    set({ tabs: nextTabs });
  },

  checkAutoSleepTabs(maxIdleMinutes = 15) {
    const { tabs, activeTabId } = get();
    const now = Date.now();
    const thresholdMs = maxIdleMinutes * 60 * 1000;
    let changed = false;

    const nextTabs = tabs.map((t) => {
      // Skip active tab, playing audio, about:blank, or already sleeping tabs
      if (
        t.id === activeTabId ||
        t.isPlayingAudio ||
        t.url === "about:blank" ||
        t.isLazy ||
        t.isSleeping
      ) {
        return t;
      }

      const idleDuration = now - (t.lastActiveAt || now);
      if (idleDuration >= thresholdMs) {
        changed = true;
        console.log(`[Forge Auto-Sleep] Tab "${t.title}" (${t.id}) idle for ${Math.round(idleDuration / 60000)}m. Snoozing to save resources.`);
        return {
          ...t,
          isLazy: true,
          isSleeping: true,
          memoryMB: 0,
        };
      }
      return t;
    });

    if (changed) {
      saveSession(nextTabs, activeTabId);
      set({ tabs: nextTabs });
    }
  },
}));

// Secondary fallback: recover tabs from disk backup if localStorage was cleared
if (typeof window !== "undefined") {
  setTimeout(async () => {
    try {
      const backup = await (window as any).forge?.session?.getBackup?.();
      if (backup && Array.isArray(backup.tabs) && backup.tabs.length > 0) {
        const currentTabs = useTabsStore.getState().tabs;
        if (
          currentTabs.length === 1 &&
          currentTabs[0].url === "about:blank" &&
          !localStorage.getItem(SESSION_STORAGE_KEY)
        ) {
          const activeTabId = backup.tabs.some((t: any) => t.id === backup.activeTabId)
            ? backup.activeTabId
            : backup.tabs[0].id;
          const tabs: Tab[] = backup.tabs.map((t: any) => {
            const id = String(t.id || `tab-${nextId++}`);
            const url = String(t.url || "about:blank");
            const isActive = id === activeTabId;
            const title = getCleanFallbackTitle(url, t.title);
            let favicon = String(t.favicon || "");
            if (!favicon && url && url !== "about:blank") {
              try {
                const host = new URL(url).hostname;
                if (host) favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
              } catch {}
            }
            return {
              id,
              title,
              url,
              favicon,
              isLoading: false,
              canGoBack: Boolean(t.canGoBack),
              isLazy: !isActive && url !== "about:blank",
              isSleeping: !isActive && url !== "about:blank",
              isPlayingAudio: false,
              isMuted: false,
              memoryMB: 0,
              lastActiveAt: Date.now(),
            };
          });
          useTabsStore.setState({ tabs, activeTabId });
          saveSession(tabs, activeTabId);
        }
      }
    } catch {}
  }, 120);
}

