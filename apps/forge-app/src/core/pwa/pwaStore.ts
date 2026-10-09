import { create } from "zustand";
import type { InstalledPwaRecord, PwaEligibilityResult } from "./pwaTypes.ts";

interface PwaState {
  eligibilityByTab: Record<string, PwaEligibilityResult>;
  installedApps: InstalledPwaRecord[];
  activeModalTabId: string | null;
  isInstalling: boolean;

  setEligibility: (result: PwaEligibilityResult) => void;
  clearTabEligibility: (tabId: string) => void;
  openInstallModal: (tabId: string) => void;
  closeInstallModal: () => void;
  loadInstalledApps: () => Promise<void>;
  installPwa: (tabId: string) => Promise<{ success: boolean; error?: string }>;
  launchApp: (appId: string) => Promise<boolean>;
  uninstallApp: (appId: string) => Promise<boolean>;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  eligibilityByTab: {},
  installedApps: [],
  activeModalTabId: null,
  isInstalling: false,

  setEligibility: (result: PwaEligibilityResult) => {
    set((state) => ({
      eligibilityByTab: {
        ...state.eligibilityByTab,
        [result.tabId]: result,
      },
    }));
  },

  clearTabEligibility: (tabId: string) => {
    set((state) => {
      const copy = { ...state.eligibilityByTab };
      delete copy[tabId];
      return { eligibilityByTab: copy };
    });
  },

  openInstallModal: (tabId: string) => {
    set({ activeModalTabId: tabId });
  },

  closeInstallModal: () => {
    set({ activeModalTabId: null });
  },

  loadInstalledApps: async () => {
    try {
      const forge = (window as any).forge;
      if (forge?.pwa?.getInstalled) {
        const apps = await forge.pwa.getInstalled();
        set({ installedApps: apps || [] });
      }
    } catch (err) {
      console.warn("[PwaStore] Error loading installed PWAs:", err);
    }
  },

  installPwa: async (tabId: string) => {
    const forge = (window as any).forge;
    if (!forge?.pwa?.requestInstall) {
      return { success: false, error: "PWA installation API unavailable" };
    }

    set({ isInstalling: true });
    try {
      const result = await forge.pwa.requestInstall(tabId);
      if (result.success) {
        await get().loadInstalledApps();
        set({ activeModalTabId: null, isInstalling: false });
        window.dispatchEvent(
          new CustomEvent("forge:toast", {
            detail: "Web Application successfully installed in Forge!",
          })
        );
        return { success: true };
      } else {
        set({ isInstalling: false });
        return { success: false, error: result.error || "Installation rejected" };
      }
    } catch (err: any) {
      set({ isInstalling: false });
      return { success: false, error: err?.message || "Failed to install PWA" };
    }
  },

  launchApp: async (appId: string) => {
    try {
      const forge = (window as any).forge;
      if (forge?.pwa?.launchInstalled) {
        return await forge.pwa.launchInstalled(appId);
      }
    } catch {}
    return false;
  },

  uninstallApp: async (appId: string) => {
    try {
      const forge = (window as any).forge;
      if (forge?.pwa?.uninstall) {
        const ok = await forge.pwa.uninstall(appId);
        if (ok) {
          await get().loadInstalledApps();
          return true;
        }
      }
    } catch {}
    return false;
  },
}));

// Initialize global IPC event listener once
if (typeof window !== "undefined") {
  const forge = (window as any).forge;
  if (forge?.pwa?.onEligibilityUpdated) {
    forge.pwa.onEligibilityUpdated((result: PwaEligibilityResult) => {
      usePwaStore.getState().setEligibility(result);
    });
  }
}
