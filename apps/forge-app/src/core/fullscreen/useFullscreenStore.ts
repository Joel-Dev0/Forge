import { create } from "zustand";

interface FullscreenState {
  isFullscreen: boolean;
  activeTabId: string | null;
  setFullscreen: (isFullscreen: boolean, tabId?: string | null) => void;
  toggleFullscreen: () => void;
}

export const useFullscreenStore = create<FullscreenState>((set, get) => ({
  isFullscreen: false,
  activeTabId: null,

  setFullscreen: (isFullscreen, tabId = null) => {
    set({ isFullscreen, activeTabId: tabId });
  },

  toggleFullscreen: () => {
    const next = !get().isFullscreen;
    get().setFullscreen(next);
  },
}));
