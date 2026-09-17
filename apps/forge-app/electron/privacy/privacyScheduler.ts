import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import {
  DEFAULT_CLEANUP_POLICY,
  type CleanupInterval,
  type CleanupPolicy,
  type CleanupResult,
  type CleanupTargets,
} from "./types.js";
import type { PrivacyManager } from "./privacyManager.js";
import type { Session } from "electron";

export class PrivacyScheduler {
  private policy: CleanupPolicy;
  private timer: NodeJS.Timeout | null = null;
  private policyFilePath: string;
  private privacyManager: PrivacyManager;
  private getSessions: () => { forgeSession: Session; defaultSession: Session | null };
  private onCleanupCompleted?: (result: CleanupResult) => void;
  private onPolicyChanged?: (policy: CleanupPolicy) => void;
  private hooks?: {
    onClearHistory?: () => void;
    onClearDownloads?: () => void;
  };

  constructor(
    privacyManager: PrivacyManager,
    getSessions: () => { forgeSession: Session; defaultSession: Session | null },
    callbacks?: {
      onCleanupCompleted?: (result: CleanupResult) => void;
      onPolicyChanged?: (policy: CleanupPolicy) => void;
      hooks?: {
        onClearHistory?: () => void;
        onClearDownloads?: () => void;
      };
    }
  ) {
    this.privacyManager = privacyManager;
    this.getSessions = getSessions;
    this.onCleanupCompleted = callbacks?.onCleanupCompleted;
    this.onPolicyChanged = callbacks?.onPolicyChanged;
    this.hooks = callbacks?.hooks;

    try {
      this.policyFilePath = path.join(app.getPath("userData"), "privacy-policy.json");
    } catch {
      this.policyFilePath = path.join(process.cwd(), "privacy-policy.json");
    }

    this.policy = this.loadPolicy();
    this.startTicker();
  }

  private loadPolicy(): CleanupPolicy {
    try {
      if (fs.existsSync(this.policyFilePath)) {
        const raw = fs.readFileSync(this.policyFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_CLEANUP_POLICY,
          ...parsed,
          targets: {
            ...DEFAULT_CLEANUP_POLICY.targets,
            ...(parsed.targets || {}),
          },
          cookieRule: {
            ...DEFAULT_CLEANUP_POLICY.cookieRule,
            ...(parsed.cookieRule || {}),
          },
        };
      }
    } catch (err) {
      console.warn("[PrivacyScheduler] Error loading policy from disk, using default:", err);
    }
    return { ...DEFAULT_CLEANUP_POLICY };
  }

  private savePolicy() {
    try {
      const dir = path.dirname(this.policyFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.policyFilePath, JSON.stringify(this.policy, null, 2), "utf-8");
    } catch (err) {
      console.error("[PrivacyScheduler] Error saving policy to disk:", err);
    }
  }

  public getPolicy(): CleanupPolicy {
    return { ...this.policy };
  }

  public updatePolicy(partial: Partial<CleanupPolicy>): CleanupPolicy {
    this.policy = {
      ...this.policy,
      ...partial,
      targets: {
        ...this.policy.targets,
        ...(partial.targets || {}),
      },
      cookieRule: {
        ...this.policy.cookieRule,
        ...(partial.cookieRule || {}),
      },
    };

    if (this.policy.enabled && this.policy.interval !== "disabled") {
      this.policy.nextRunTimestamp = this.calculateNextRunTimestamp(
        this.policy.interval,
        this.policy.customIntervalMinutes
      );
    } else {
      this.policy.nextRunTimestamp = undefined;
    }

    this.savePolicy();
    if (this.onPolicyChanged) {
      this.onPolicyChanged(this.getPolicy());
    }
    return this.getPolicy();
  }

  public calculateNextRunTimestamp(
    interval: CleanupInterval,
    customMinutes = 360,
    fromTimestamp = Date.now()
  ): number | undefined {
    let addMs = 0;
    switch (interval) {
      case "1h":
        addMs = 60 * 60 * 1000;
        break;
      case "6h":
        addMs = 6 * 60 * 60 * 1000;
        break;
      case "24h":
        addMs = 24 * 60 * 60 * 1000;
        break;
      case "7d":
        addMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case "custom":
        addMs = Math.max(1, customMinutes) * 60 * 1000;
        break;
      case "disabled":
      default:
        return undefined;
    }
    return fromTimestamp + addMs;
  }

  private startTicker() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Check once a minute for scheduled execution
    this.timer = setInterval(() => {
      this.checkScheduledExecution();
    }, 60 * 1000);
  }

  private async checkScheduledExecution() {
    if (!this.policy.enabled || this.policy.interval === "disabled" || !this.policy.nextRunTimestamp) {
      return;
    }

    const now = Date.now();
    if (now >= this.policy.nextRunTimestamp) {
      console.log("[PrivacyScheduler] Automatic cleanup triggered at:", new Date(now).toISOString());
      
      // Automatic cleanup safeguard: Force critical targets to FALSE for background automations
      const safeTargets: CleanupTargets = {
        ...this.policy.targets,
        sessions: false,
        passwordsAutofill: false,
        permissions: false,
      };

      const { forgeSession, defaultSession } = this.getSessions();
      try {
        const result = await this.privacyManager.executeCleanup(
          forgeSession,
          defaultSession,
          safeTargets,
          this.policy.cookieRule,
          this.hooks
        );

        this.policy.lastRunTimestamp = now;
        this.policy.nextRunTimestamp = this.calculateNextRunTimestamp(
          this.policy.interval,
          this.policy.customIntervalMinutes,
          now
        );
        this.savePolicy();

        if (this.onCleanupCompleted) {
          this.onCleanupCompleted(result);
        }
        if (this.onPolicyChanged) {
          this.onPolicyChanged(this.getPolicy());
        }
      } catch (err) {
        console.error("[PrivacyScheduler] Error executing automated cleanup:", err);
      }
    }
  }

  public destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
