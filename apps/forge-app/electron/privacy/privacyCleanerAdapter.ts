import { ipcMain, session, type BrowserWindow } from "electron";
import { PrivacyManager } from "./privacyManager.js";
import { PrivacyScheduler } from "./privacyScheduler.js";
import type {
  CleanupPolicy,
  CleanupResult,
  CleanupTargets,
  CookieRule,
  PrivacyStats,
} from "./types.js";

let getWin: (() => BrowserWindow | null) | null = null;
let privacyManager: PrivacyManager | null = null;
let privacyScheduler: PrivacyScheduler | null = null;

function broadcastEvent(channel: string, data?: any) {
  if (!getWin) return;
  const win = getWin();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

export function initPrivacyCleanerAdapter(
  mainWindowGetter: () => BrowserWindow | null,
  options?: {
    clearRecentDownloads?: () => void;
    getRecentDownloadsCount?: () => number;
  }
) {
  getWin = mainWindowGetter;
  privacyManager = new PrivacyManager();

  const getSessions = () => ({
    forgeSession: session.fromPartition("persist:forge"),
    defaultSession: session.defaultSession,
  });

  privacyScheduler = new PrivacyScheduler(privacyManager, getSessions, {
    onCleanupCompleted: (result: CleanupResult) => {
      broadcastEvent("privacy:cleanup-completed", result);
    },
    onPolicyChanged: (policy: CleanupPolicy) => {
      broadcastEvent("privacy:policy-changed", policy);
    },
    hooks: {
      onClearHistory: () => {
        broadcastEvent("privacy:clear-history-requested");
      },
      onClearDownloads: () => {
        if (options?.clearRecentDownloads) {
          options.clearRecentDownloads();
        }
        broadcastEvent("privacy:clear-downloads-requested");
      },
    },
  });

  // IPC: Get Storage & Privacy Telemetry Stats
  ipcMain.handle("privacy:get-stats", async (_event, historyCount = 0) => {
    if (!privacyManager) return null;
    const { forgeSession } = getSessions();
    const downloadsCount = options?.getRecentDownloadsCount ? options.getRecentDownloadsCount() : 0;
    const stats = await privacyManager.getStorageStats(forgeSession, historyCount, downloadsCount);
    return stats;
  });

  // IPC: Get Current Policy & Schedule
  ipcMain.handle("privacy:get-policy", () => {
    if (!privacyScheduler) return null;
    return privacyScheduler.getPolicy();
  });

  // IPC: Update Policy
  ipcMain.handle("privacy:update-policy", (_event, partial: Partial<CleanupPolicy>) => {
    if (!privacyScheduler) return null;
    const updated = privacyScheduler.updatePolicy(partial);
    return updated;
  });

  // IPC: Execute Immediate Manual Cleanup
  ipcMain.handle(
    "privacy:clean-now",
    async (
      _event,
      overrideTargets?: CleanupTargets,
      overrideCookieRule?: CookieRule
    ): Promise<CleanupResult> => {
      if (!privacyManager || !privacyScheduler) {
        throw new Error("Privacy cleaner subsystem is not initialized");
      }

      const policy = privacyScheduler.getPolicy();
      const targets = overrideTargets || policy.targets;
      const cookieRule = overrideCookieRule || policy.cookieRule;
      const { forgeSession, defaultSession } = getSessions();

      const result = await privacyManager.executeCleanup(
        forgeSession,
        defaultSession,
        targets,
        cookieRule,
        {
          onClearHistory: () => {
            broadcastEvent("privacy:clear-history-requested");
          },
          onClearDownloads: () => {
            if (options?.clearRecentDownloads) {
              options.clearRecentDownloads();
            }
            broadcastEvent("privacy:clear-downloads-requested");
          },
        }
      );

      broadcastEvent("privacy:cleanup-completed", result);
      return result;
    }
  );

  // IPC: Clean Trackers Only
  ipcMain.handle("privacy:clean-trackers-only", async () => {
    if (!privacyManager) return { removed: 0 };
    const { forgeSession } = getSessions();
    const res = await privacyManager.cleanTrackersOnly(forgeSession);
    broadcastEvent("privacy:stats-updated");
    return res;
  });

  // IPC: Add Protected Domain Exception
  ipcMain.handle("privacy:add-protected-domain", (_event, domain: string) => {
    if (!privacyScheduler || !domain) return null;
    const policy = privacyScheduler.getPolicy();
    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!cleanDomain) return policy;

    const set = new Set(policy.cookieRule.protectedDomains);
    set.add(cleanDomain);
    const updated = privacyScheduler.updatePolicy({
      cookieRule: {
        ...policy.cookieRule,
        protectedDomains: Array.from(set),
      },
    });
    return updated;
  });

  // IPC: Remove Protected Domain Exception
  ipcMain.handle("privacy:remove-protected-domain", (_event, domain: string) => {
    if (!privacyScheduler || !domain) return null;
    const policy = privacyScheduler.getPolicy();
    const cleanDomain = domain.toLowerCase().trim();
    const updatedList = policy.cookieRule.protectedDomains.filter((d) => d.toLowerCase() !== cleanDomain);

    const updated = privacyScheduler.updatePolicy({
      cookieRule: {
        ...policy.cookieRule,
        protectedDomains: updatedList,
      },
    });
    return updated;
  });
}
