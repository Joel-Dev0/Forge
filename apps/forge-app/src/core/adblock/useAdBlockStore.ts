import { create } from "zustand";

export interface AdBlockLogEntry {
  id: string;
  url: string;
  name: string;
  domain: string;
  method: string;
  resourceType: string;
  status: "blocked" | "allowed";
  category?: "ad" | "tracker" | "malvertising" | "custom";
  rule?: string;
  listId?: string;
  reason?: string;
  timestamp: number;
}

export interface FilterListMetadata {
  id: string;
  name: string;
  category?: string;
  description?: string;
  enabled: boolean;
  rulesCount: number;
  hitsCount: number;
  lastUpdated?: number;
  url?: string;
  version?: string;
}

export interface ShieldFeatures {
  adBlock: boolean;
  trackerProtection: boolean;
  malvertisingProtection: boolean;
  customRules: boolean;
}

export interface AdBlockStats {
  enabled: boolean;
  totalLists: number;
  totalRules: number;
  blockedCount: number;
  allowedCount: number;
  lists: FilterListMetadata[];
}

export interface DetailedBlockStats {
  enabled: boolean;
  features: ShieldFeatures;
  totalLists: number;
  totalRules: number;
  blockedCount: number;
  allowedCount: number;
  byCategory: {
    ad: number;
    tracker: number;
    malvertising: number;
    custom: number;
  };
  topDomains: { domain: string; count: number; category: string }[];
  estimatedBandwidthSavedBytes: number;
  estimatedTimeSavedMs: number;
  lists: FilterListMetadata[];
}

export interface CustomRuleItem {
  id: string;
  raw: string;
  type: "block" | "exception";
  category?: string;
  enabled?: boolean;
}

interface AdBlockState {
  enabled: boolean;
  features: ShieldFeatures;
  stats: AdBlockStats | null;
  detailedStats: DetailedBlockStats | null;
  customRules: CustomRuleItem[];
  requests: AdBlockLogEntry[];
  filter: "all" | "blocked" | "allowed";
  categoryFilter: "all" | "ad" | "tracker" | "malvertising" | "custom";
  searchQuery: string;
  isInitialized: boolean;
  isUpdating: boolean;
  lastUpdated?: number;
  allowlistedDomains: string[];

  init: () => Promise<void>;
  toggleEnabled: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  toggleFeature: (feature: keyof ShieldFeatures) => Promise<void>;
  setFeature: (feature: keyof ShieldFeatures, enabled: boolean) => Promise<void>;
  toggleList: (listId: string) => Promise<void>;
  addUserRule: (rawRule: string) => Promise<{ ok: boolean; error?: string }>;
  removeUserRule: (ruleId: string) => Promise<void>;
  toggleCustomRule: (ruleId: string, enabled?: boolean) => Promise<void>;
  importRules: (rawContent: string) => Promise<{ imported: number; errors: string[] }>;
  exportRules: () => Promise<string>;
  quickAllowDomain: (domain: string) => Promise<void>;
  quickBlockDomain: (domain: string) => Promise<void>;
  isSiteProtected: (urlOrDomain: string) => boolean;
  toggleSiteProtection: (urlOrDomain: string) => Promise<boolean>;
  getBlockedCountForDomain: (urlOrDomain: string) => number;
  clearLogs: () => Promise<void>;
  updateLists: () => Promise<void>;
  fetchDetailedStats: () => Promise<void>;
  fetchCustomRules: () => Promise<void>;
  setFilter: (filter: "all" | "blocked" | "allowed") => void;
  setCategoryFilter: (cat: "all" | "ad" | "tracker" | "malvertising" | "custom") => void;
  setSearchQuery: (query: string) => void;
}

function extractDomain(urlOrDomain: string): string {
  if (!urlOrDomain) return "";
  try {
    if (urlOrDomain.startsWith("http://") || urlOrDomain.startsWith("https://")) {
      return new URL(urlOrDomain).hostname.toLowerCase();
    }
    return urlOrDomain.toLowerCase().replace(/:\d+$/, "");
  } catch {
    return urlOrDomain.toLowerCase();
  }
}

export const useAdBlockStore = create<AdBlockState>((set, get) => ({
  enabled: true,
  features: {
    adBlock: true,
    trackerProtection: true,
    malvertisingProtection: true,
    customRules: true,
  },
  stats: null,
  detailedStats: null,
  customRules: [],
  requests: [],
  filter: "all",
  categoryFilter: "all",
  searchQuery: "",
  isInitialized: false,
  isUpdating: false,
  lastUpdated: undefined,
  allowlistedDomains: [],

  init: async () => {
    if (get().isInitialized) return;
    set({ isInitialized: true });

    const forgeAdblock = (window as any).forge?.adblock;
    if (!forgeAdblock) {
      // Mock / fallback if running in standalone browser without electron
      set({
        stats: {
          enabled: true,
          totalLists: 4,
          totalRules: 120,
          blockedCount: 0,
          allowedCount: 0,
          lists: [
            { id: "easylist", name: "EasyList Core", category: "ad", description: "Blocks advertising networks", enabled: true, rulesCount: 52, hitsCount: 0 },
            { id: "easyprivacy", name: "EasyPrivacy", category: "tracker", description: "Blocks trackers and analytics", enabled: true, rulesCount: 32, hitsCount: 0 },
            { id: "malvertising", name: "Malvertising & Threats", category: "malvertising", description: "Cryptominers & threats", enabled: true, rulesCount: 26, hitsCount: 0 },
            { id: "user", name: "User Rules", category: "custom", description: "Custom user rules", enabled: true, rulesCount: 0, hitsCount: 0 },
          ],
        },
      });
      return;
    }

    try {
      const state = await forgeAdblock.getState();
      if (state) {
        set({
          enabled: state.enabled,
          features: state.features || get().features,
          stats: state.stats,
          detailedStats: state.detailedStats || null,
          customRules: state.customRules || [],
          requests: state.recentLogs || [],
          isUpdating: state.updaterStatus?.isUpdating || false,
          lastUpdated: state.updaterStatus?.lastUpdated,
        });
      }

      // Listen for real-time entries
      forgeAdblock.onRequestEntry((entry: AdBlockLogEntry) => {
        set((prev) => {
          const updated = [entry, ...prev.requests].slice(0, 250);
          const currentStats = prev.stats;
          const newStats = currentStats
            ? {
                ...currentStats,
                blockedCount: entry.status === "blocked" ? currentStats.blockedCount + 1 : currentStats.blockedCount,
                allowedCount: entry.status === "allowed" ? currentStats.allowedCount + 1 : currentStats.allowedCount,
              }
            : null;

          return { requests: updated, stats: newStats };
        });
      });

      // Listen for list/state updates
      forgeAdblock.onStateChanged((stateData: any) => {
        set((prev) => ({
          enabled: stateData.enabled !== undefined ? stateData.enabled : prev.enabled,
          features: stateData.features || prev.features,
          stats: stateData.stats || prev.stats,
          detailedStats: stateData.detailedStats || prev.detailedStats,
        }));
      });

      // Listen for background remote list updates
      if (forgeAdblock.onListsUpdated) {
        forgeAdblock.onListsUpdated((statusData: any) => {
          set({
            isUpdating: Boolean(statusData?.isUpdating),
            lastUpdated: statusData?.lastUpdated || get().lastUpdated,
          });
        });
      }

      // Listen for clear logs
      forgeAdblock.onLogsCleared(() => {
        set((prev) => ({
          requests: [],
          stats: prev.stats ? { ...prev.stats, blockedCount: 0, allowedCount: 0 } : null,
          detailedStats: prev.detailedStats
            ? {
                ...prev.detailedStats,
                blockedCount: 0,
                allowedCount: 0,
                byCategory: { ad: 0, tracker: 0, malvertising: 0, custom: 0 },
                topDomains: [],
                estimatedBandwidthSavedBytes: 0,
                estimatedTimeSavedMs: 0,
              }
            : null,
        }));
      });
    } catch (err) {
      console.warn("Failed to initialize AdBlock store:", err);
    }
  },

  toggleEnabled: async () => {
    const forgeAdblock = (window as any).forge?.adblock;
    const current = get().enabled;
    const next = !current;

    if (forgeAdblock?.setEnabled) {
      await forgeAdblock.setEnabled(next);
    }
    set({ enabled: next });
  },

  setEnabled: async (enabled: boolean) => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (forgeAdblock?.setEnabled) {
      await forgeAdblock.setEnabled(enabled);
    }
    set({ enabled });
  },

  toggleFeature: async (feature: keyof ShieldFeatures) => {
    const forgeAdblock = (window as any).forge?.adblock;
    const currentFeatures = get().features;
    const nextValue = !currentFeatures[feature];
    const nextFeatures = { ...currentFeatures, [feature]: nextValue };

    set({ features: nextFeatures });
    if (forgeAdblock?.setFeature) {
      await forgeAdblock.setFeature(feature, nextValue);
    }
  },

  setFeature: async (feature: keyof ShieldFeatures, enabled: boolean) => {
    const forgeAdblock = (window as any).forge?.adblock;
    const nextFeatures = { ...get().features, [feature]: enabled };

    set({ features: nextFeatures });
    if (forgeAdblock?.setFeature) {
      await forgeAdblock.setFeature(feature, enabled);
    }
  },

  isSiteProtected: (urlOrDomain: string) => {
    if (!get().enabled) return false;
    const domain = extractDomain(urlOrDomain);
    if (!domain) return get().enabled;
    return !get().allowlistedDomains.includes(domain);
  },

  toggleSiteProtection: async (urlOrDomain: string) => {
    const domain = extractDomain(urlOrDomain);
    if (!domain) return get().enabled;

    const currentAllowlisted = get().allowlistedDomains;
    const isCurrentlyAllowlisted = currentAllowlisted.includes(domain);

    if (isCurrentlyAllowlisted) {
      // Re-enable protection for this site
      const nextAllowlisted = currentAllowlisted.filter((d) => d !== domain);
      set({ allowlistedDomains: nextAllowlisted });
      await get().quickBlockDomain(domain);
      return true;
    } else {
      // Disable protection for this site
      set({ allowlistedDomains: [...currentAllowlisted, domain] });
      await get().quickAllowDomain(domain);
      return false;
    }
  },

  getBlockedCountForDomain: (urlOrDomain: string) => {
    const domain = extractDomain(urlOrDomain);
    if (!domain) return 0;
    return get().requests.filter(
      (r) => r.status === "blocked" && (r.domain === domain || r.domain.endsWith(`.${domain}`))
    ).length;
  },

  toggleList: async (listId: string) => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (forgeAdblock?.toggleList) {
      await forgeAdblock.toggleList(listId);
    }
    set((prev) => {
      if (!prev.stats) return {};
      const updatedLists = prev.stats.lists.map((l) =>
        l.id === listId ? { ...l, enabled: !l.enabled } : l
      );
      return { stats: { ...prev.stats, lists: updatedLists } };
    });
  },

  fetchCustomRules: async () => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (forgeAdblock?.getCustomRules) {
      const rules = await forgeAdblock.getCustomRules();
      set({ customRules: rules || [] });
    }
  },

  addUserRule: async (rawRule: string) => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (!forgeAdblock?.addUserRule) {
      return { ok: false, error: "Electron bridge not available" };
    }
    const res = await forgeAdblock.addUserRule(rawRule);
    if (res.ok) {
      await get().fetchCustomRules();
    }
    return res;
  },

  removeUserRule: async (ruleId: string) => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (forgeAdblock?.removeUserRule) {
      await forgeAdblock.removeUserRule(ruleId);
      set((prev) => ({
        customRules: prev.customRules.filter((r) => r.id !== ruleId),
      }));
    }
  },

  toggleCustomRule: async (ruleId: string, enabled?: boolean) => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (forgeAdblock?.toggleCustomRule) {
      await forgeAdblock.toggleCustomRule(ruleId, enabled);
      await get().fetchCustomRules();
    }
  },

  importRules: async (rawContent: string) => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (!forgeAdblock?.importRules) {
      return { imported: 0, errors: ["Electron bridge not available"] };
    }
    const res = await forgeAdblock.importRules(rawContent);
    await get().fetchCustomRules();
    return res;
  },

  exportRules: async () => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (!forgeAdblock?.exportRules) return "";
    return await forgeAdblock.exportRules();
  },

  quickAllowDomain: async (domain: string) => {
    if (!domain) return;
    const ruleStr = `@@||${domain}^`;
    await get().addUserRule(ruleStr);
  },

  quickBlockDomain: async (domain: string) => {
    if (!domain) return;
    const ruleStr = `||${domain}^`;
    await get().addUserRule(ruleStr);
  },

  clearLogs: async () => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (forgeAdblock?.clearLogs) {
      await forgeAdblock.clearLogs();
    }
    set((prev) => ({
      requests: [],
      stats: prev.stats ? { ...prev.stats, blockedCount: 0, allowedCount: 0 } : null,
      detailedStats: prev.detailedStats
        ? {
            ...prev.detailedStats,
            blockedCount: 0,
            allowedCount: 0,
            byCategory: { ad: 0, tracker: 0, malvertising: 0, custom: 0 },
            topDomains: [],
            estimatedBandwidthSavedBytes: 0,
            estimatedTimeSavedMs: 0,
          }
        : null,
    }));
  },

  updateLists: async () => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (!forgeAdblock?.updateLists) return;
    set({ isUpdating: true });
    try {
      const res = await forgeAdblock.updateLists();
      set({
        isUpdating: false,
        lastUpdated: res?.lastUpdated || Date.now(),
      });
    } catch {
      set({ isUpdating: false });
    }
  },

  fetchDetailedStats: async () => {
    const forgeAdblock = (window as any).forge?.adblock;
    if (forgeAdblock?.getDetailedStats) {
      const stats = await forgeAdblock.getDetailedStats();
      if (stats) set({ detailedStats: stats });
    }
  },

  setFilter: (filter) => set({ filter }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
