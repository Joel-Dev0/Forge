import { create } from "zustand";
import {
  type CleanupPolicy,
  type CleanupResult,
  type CleanupTargetKey,
  type CookieRuleMode,
  type PrivacyStats,
  type CleanupInterval,
  DEFAULT_CLEANUP_POLICY,
  CLEANUP_TARGET_DEFINITIONS,
} from "../../../electron/privacy/types";
import { useHistoryStore } from "../history/useHistoryStore";
import { useDownloadsStore } from "../downloads/useDownloadsStore";

export {
  type CleanupPolicy,
  type CleanupResult,
  type CleanupTargetKey,
  type CookieRuleMode,
  type PrivacyStats,
  type CleanupInterval,
  CLEANUP_TARGET_DEFINITIONS,
};

export type PrivacyModalTab = "overview" | "targets" | "exceptions" | "schedule";

interface PrivacyState {
  policy: CleanupPolicy;
  stats: PrivacyStats | null;
  isCleaning: boolean;
  isModalOpen: boolean;
  activeTab: PrivacyModalTab;
  lastResult: CleanupResult | null;
  isDoubleConfirmOpen: boolean;
  pendingExecution: (() => Promise<void>) | null;
  criticalTargetsInPending: CleanupTargetKey[];
  isInitialized: boolean;

  init: () => () => void;
  fetchStats: () => Promise<void>;
  fetchPolicy: () => Promise<void>;
  updatePolicy: (partial: Partial<CleanupPolicy>) => Promise<void>;
  toggleTarget: (key: CleanupTargetKey) => void;
  setTarget: (key: CleanupTargetKey, value: boolean) => void;
  setInterval: (interval: CleanupInterval, customMinutes?: number) => Promise<void>;
  setCookieMode: (mode: CookieRuleMode) => Promise<void>;
  addProtectedDomain: (domain: string) => Promise<void>;
  removeProtectedDomain: (domain: string) => Promise<void>;
  cleanNow: (overrideTargets?: Record<CleanupTargetKey, boolean>) => Promise<void>;
  cleanTrackersOnly: () => Promise<number>;
  openModal: (tab?: PrivacyModalTab) => void;
  closeModal: () => void;
  confirmPendingExecution: () => Promise<void>;
  cancelPendingExecution: () => void;
}

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  policy: { ...DEFAULT_CLEANUP_POLICY },
  stats: null,
  isCleaning: false,
  isModalOpen: false,
  activeTab: "overview",
  lastResult: null,
  isDoubleConfirmOpen: false,
  pendingExecution: null,
  criticalTargetsInPending: [],
  isInitialized: false,

  init: () => {
    if (get().isInitialized) return () => {};
    set({ isInitialized: true });

    const forge = (window as any).forge;
    const unsubs: Array<() => void> = [];

    // Fetch initial state
    get().fetchPolicy();
    get().fetchStats();

    if (forge?.privacy) {
      if (forge.privacy.onStatsUpdated) {
        unsubs.push(
          forge.privacy.onStatsUpdated(() => {
            get().fetchStats();
          })
        );
      }

      if (forge.privacy.onCleanupCompleted) {
        unsubs.push(
          forge.privacy.onCleanupCompleted((result: CleanupResult) => {
            set({ lastResult: result, isCleaning: false });
            get().fetchStats();
          })
        );
      }

      if (forge.privacy.onPolicyChanged) {
        unsubs.push(
          forge.privacy.onPolicyChanged((policy: CleanupPolicy) => {
            set({ policy });
          })
        );
      }

      if (forge.privacy.onClearHistoryRequested) {
        unsubs.push(
          forge.privacy.onClearHistoryRequested(() => {
            useHistoryStore.getState().clearHistory();
          })
        );
      }

      if (forge.privacy.onClearDownloadsRequested) {
        unsubs.push(
          forge.privacy.onClearDownloadsRequested(() => {
            useDownloadsStore.getState().clearAll();
          })
        );
      }
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  },

  fetchStats: async () => {
    const forge = (window as any).forge;
    if (!forge?.privacy?.getStats) return;

    try {
      const historyCount = useHistoryStore.getState().entries.length;
      const stats = await forge.privacy.getStats(historyCount);
      if (stats) {
        set({ stats });
      }
    } catch (err) {
      console.error("[usePrivacyStore] Error fetching stats:", err);
    }
  },

  fetchPolicy: async () => {
    const forge = (window as any).forge;
    if (!forge?.privacy?.getPolicy) return;

    try {
      const policy = await forge.privacy.getPolicy();
      if (policy) {
        set({ policy });
      }
    } catch (err) {
      console.error("[usePrivacyStore] Error fetching policy:", err);
    }
  },

  updatePolicy: async (partial) => {
    const forge = (window as any).forge;
    // Optimistic local update
    set((s) => ({
      policy: {
        ...s.policy,
        ...partial,
        targets: {
          ...s.policy.targets,
          ...(partial.targets || {}),
        },
        cookieRule: {
          ...s.policy.cookieRule,
          ...(partial.cookieRule || {}),
        },
      },
    }));

    if (forge?.privacy?.updatePolicy) {
      try {
        const updated = await forge.privacy.updatePolicy(partial);
        if (updated) {
          set({ policy: updated });
        }
      } catch (err) {
        console.error("[usePrivacyStore] Error updating policy:", err);
      }
    }
  },

  toggleTarget: (key) => {
    const current = get().policy.targets[key];
    get().updatePolicy({
      targets: {
        ...get().policy.targets,
        [key]: !current,
      },
    });
  },

  setTarget: (key, value) => {
    get().updatePolicy({
      targets: {
        ...get().policy.targets,
        [key]: value,
      },
    });
  },

  setInterval: async (interval, customMinutes) => {
    await get().updatePolicy({
      enabled: interval !== "disabled",
      interval,
      customIntervalMinutes: customMinutes ?? get().policy.customIntervalMinutes,
    });
  },

  setCookieMode: async (mode) => {
    await get().updatePolicy({
      cookieRule: {
        ...get().policy.cookieRule,
        mode,
      },
    });
  },

  addProtectedDomain: async (domain) => {
    const forge = (window as any).forge;
    if (forge?.privacy?.addProtectedDomain) {
      try {
        const updated = await forge.privacy.addProtectedDomain(domain);
        if (updated) {
          set({ policy: updated });
        }
      } catch (err) {
        console.error("[usePrivacyStore] Error adding protected domain:", err);
      }
    } else {
      const setList = new Set(get().policy.cookieRule.protectedDomains);
      setList.add(domain.toLowerCase().trim());
      get().updatePolicy({
        cookieRule: {
          ...get().policy.cookieRule,
          protectedDomains: Array.from(setList),
        },
      });
    }
  },

  removeProtectedDomain: async (domain) => {
    const forge = (window as any).forge;
    if (forge?.privacy?.removeProtectedDomain) {
      try {
        const updated = await forge.privacy.removeProtectedDomain(domain);
        if (updated) {
          set({ policy: updated });
        }
      } catch (err) {
        console.error("[usePrivacyStore] Error removing protected domain:", err);
      }
    } else {
      const filtered = get().policy.cookieRule.protectedDomains.filter(
        (d) => d.toLowerCase() !== domain.toLowerCase().trim()
      );
      get().updatePolicy({
        cookieRule: {
          ...get().policy.cookieRule,
          protectedDomains: filtered,
        },
      });
    }
  },

  cleanNow: async (overrideTargets) => {
    const targets = overrideTargets || get().policy.targets;
    const cookieRule = get().policy.cookieRule;

    // Check if any critical targets are selected
    const criticalKeys: CleanupTargetKey[] = ["sessions", "passwordsAutofill", "permissions"];
    const activeCritical = criticalKeys.filter((k) => targets[k]);

    const execute = async () => {
      set({ isCleaning: true, isDoubleConfirmOpen: false, pendingExecution: null });
      const forge = (window as any).forge;
      if (forge?.privacy?.cleanNow) {
        try {
          const result = await forge.privacy.cleanNow(targets, cookieRule);
          set({ lastResult: result, isCleaning: false });
          get().fetchStats();
        } catch (err) {
          console.error("[usePrivacyStore] Clean now error:", err);
          set({ isCleaning: false });
        }
      } else {
        set({ isCleaning: false });
      }
    };

    if (activeCritical.length > 0) {
      // Prompt user with explicit double-confirmation modal for critical data loss safety
      set({
        isDoubleConfirmOpen: true,
        pendingExecution: execute,
        criticalTargetsInPending: activeCritical,
      });
      return;
    }

    await execute();
  },

  confirmPendingExecution: async () => {
    const exec = get().pendingExecution;
    if (exec) {
      await exec();
    }
  },

  cancelPendingExecution: () => {
    set({
      isDoubleConfirmOpen: false,
      pendingExecution: null,
      criticalTargetsInPending: [],
    });
  },

  cleanTrackersOnly: async () => {
    set({ isCleaning: true });
    const forge = (window as any).forge;
    let removed = 0;
    if (forge?.privacy?.cleanTrackersOnly) {
      try {
        const res = await forge.privacy.cleanTrackersOnly();
        removed = res.removed || 0;
        await get().fetchStats();
      } catch (err) {
        console.error("[usePrivacyStore] Error cleaning trackers:", err);
      }
    }
    set({ isCleaning: false });
    return removed;
  },

  openModal: (tab = "overview") => {
    set({ isModalOpen: true, activeTab: tab });
    get().fetchStats();
    get().fetchPolicy();
  },

  closeModal: () => {
    set({ isModalOpen: false, isDoubleConfirmOpen: false, pendingExecution: null });
  },
}));
