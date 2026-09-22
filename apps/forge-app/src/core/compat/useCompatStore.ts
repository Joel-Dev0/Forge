import { create } from "zustand";
import {
  KNOWN_CROSS_ENGINE_RULES,
  runEngineAuditScript,
  type EngineAuditResult,
  type EngineInconsistency,
} from "./crossEngineRules";

export interface SecurityHeaderAudit {
  name: string;
  value?: string;
  status: "enforced" | "relaxed" | "missing" | "warning";
  summary: string;
}

export interface CrashEvent {
  id: string;
  tabId: string;
  url: string;
  timestamp: number;
  reason: string;
  exitCode: number;
}

export interface DeprecationLog {
  id: string;
  timestamp: number;
  message: string;
  source: string;
  line: number;
}

export interface RuntimeVersions {
  chromium: string;
  v8: string;
  node: string;
  electron: string;
}

interface CompatState {
  // 1. Cross-Engine Inconsistencies
  engineReport: EngineAuditResult | null;
  isScanning: boolean;
  activeEnginePreset: "blink" | "gecko" | "webkit";
  setEnginePreset: (preset: "blink" | "gecko" | "webkit") => void;
  runAudit: (webviewEl: any, url: string) => Promise<void>;

  // 2. CORS & Security Constraints
  isCorsBypassActive: boolean;
  bypassPrivateNetworkAccess: boolean;
  securityHeaders: SecurityHeaderAudit[];
  setCORSBypass: (active: boolean) => Promise<void>;
  setCorsBypass: (active: boolean) => Promise<void>;
  setPNAccessBypass: (active: boolean) => void;
  auditPageHeaders: (headers: Record<string, string>) => void;

  // 3. Resource Optimization & Crash Guard
  crashHistory: CrashEvent[];
  crashGuardMode: "auto-restore" | "prompt";
  activeCrash: { tabId: string; url: string; reason: string; timestamp: number } | null;
  setCrashGuardMode: (mode: "auto-restore" | "prompt") => void;
  recordCrash: (tabId: string, url: string, reason: string, exitCode?: number) => void;
  dismissActiveCrash: () => void;
  triggerGarbageCollection: (webContentsId?: number) => Promise<boolean>;

  // 4. Device Emulation Limits & Physical Bridge
  cpuThrottlingRate: number; // 1, 4, 6
  networkCondition: "online" | "fast3g" | "slow3g" | "offline";
  touchEmulationEnabled: boolean;
  localNetworkIp: string;
  setCpuThrottling: (rate: number, webContentsId?: number) => Promise<void>;
  setNetworkCondition: (condition: "online" | "fast3g" | "slow3g" | "offline", webContentsId?: number) => Promise<void>;
  setTouchEmulation: (enabled: boolean, webContentsId?: number) => Promise<void>;
  refreshLocalIp: () => Promise<string>;
  setLocalIp: (ip: string) => void;

  // 5. Upstream Breaking Changes
  runtimeVersions: RuntimeVersions;
  deprecationLogs: DeprecationLog[];
  initVersions: () => Promise<void>;
  addDeprecationLog: (message: string, source?: string, line?: number) => void;
  clearDeprecationLogs: () => void;
}

const STORAGE_KEY = "forge_compat_settings_v1";

function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    isCorsBypassActive: false,
    bypassPrivateNetworkAccess: true,
    crashGuardMode: "auto-restore" as const,
    activeEnginePreset: "blink" as const,
    cpuThrottlingRate: 1,
    networkCondition: "online" as const,
    touchEmulationEnabled: false,
  };
}

const initialSettings = loadSavedSettings();

export const useCompatStore = create<CompatState>((set) => ({
  // 1. Cross-Engine
  engineReport: null,
  isScanning: false,
  activeEnginePreset: initialSettings.activeEnginePreset || "blink",

  setEnginePreset: (preset) => {
    set({ activeEnginePreset: preset });
    try {
      const current = loadSavedSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, activeEnginePreset: preset }));
    } catch {}
  },

  runAudit: async (webviewEl, url) => {
    if (!webviewEl) return;
    set({ isScanning: true });
    try {
      const rawData = await webviewEl.executeJavaScript(runEngineAuditScript);
      if (rawData) {
        const detectedIssuesMap = new Map<string, { count: number; sampleSelector?: string }>();
        for (const it of rawData.detectedIssues || []) {
          detectedIssuesMap.set(it.id, { count: it.occurrenceCount, sampleSelector: it.sampleSelector });
        }

        const issues: Array<EngineInconsistency & { occurrenceCount: number; sampleSelector?: string }> = [];
        let geckoPenalty = 0;
        let webkitPenalty = 0;

        const penalty = (r: EngineInconsistency) =>
          r.severity === "breaking" ? 25 : r.severity === "visual" ? 15 : 5;

        for (const rule of KNOWN_CROSS_ENGINE_RULES) {
          if (detectedIssuesMap.has(rule.id)) {
            const extra = detectedIssuesMap.get(rule.id)!;
            issues.push({
              ...rule,
              occurrenceCount: extra.count,
              sampleSelector: extra.sampleSelector,
            });

            if (rule.affectedEngines.gecko !== "supported") {
              geckoPenalty += penalty(rule);
            }
            if (rule.affectedEngines.webkit !== "supported") {
              webkitPenalty += penalty(rule);
            }
          }
        }

        const report: EngineAuditResult = {
          url,
          timestamp: Date.now(),
          scores: {
            blink: 100,
            gecko: Math.max(10, 100 - geckoPenalty),
            webkit: Math.max(10, 100 - webkitPenalty),
          },
          detectedIssues: issues,
          pageFeatures: {
            totalStyleRules: rawData.totalStyleRules || 0,
            domNodesCount: rawData.domNodesCount || 0,
            usedVendorPrefixes: rawData.usedPrefixes || [],
            modernAPIsUsed: rawData.modernAPIs || [],
          },
        };

        set({ engineReport: report, isScanning: false });
      } else {
        set({ isScanning: false });
      }
    } catch {
      set({ isScanning: false });
    }
  },

  // 2. CORS & Security Constraints
  isCorsBypassActive: initialSettings.isCorsBypassActive || false,
  bypassPrivateNetworkAccess: initialSettings.bypassPrivateNetworkAccess !== false,
  securityHeaders: [],

  setCORSBypass: async (active) => {
    set({ isCorsBypassActive: active });
    try {
      const current = loadSavedSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, isCorsBypassActive: active }));
      await (window as any).forge?.compat?.setCorsBypass?.(active);
    } catch {}
  },

  setCorsBypass: async (active) => {
    set({ isCorsBypassActive: active });
    try {
      const current = loadSavedSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, isCorsBypassActive: active }));
      await (window as any).forge?.compat?.setCorsBypass?.(active);
    } catch {}
  },

  setPNAccessBypass: (active) => {
    set({ bypassPrivateNetworkAccess: active });
    try {
      const current = loadSavedSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, bypassPrivateNetworkAccess: active }));
    } catch {}
  },

  auditPageHeaders: (headers) => {
    const audits: SecurityHeaderAudit[] = [];
    const lower: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      lower[k.toLowerCase()] = v;
    }

    // CORS
    const acao = lower["access-control-allow-origin"];
    if (acao) {
      audits.push({
        name: "Access-Control-Allow-Origin",
        value: acao,
        status: acao === "*" ? "relaxed" : "enforced",
        summary: acao === "*" ? "Wildcard access allowed (*)" : `Origin locked to ${acao}`,
      });
    } else {
      audits.push({
        name: "Access-Control-Allow-Origin",
        status: "missing",
        summary: "No CORS header present (Same-Origin policy strictly enforced by browser)",
      });
    }

    // Content-Security-Policy
    const csp = lower["content-security-policy"];
    if (csp) {
      audits.push({
        name: "Content-Security-Policy",
        value: csp.length > 50 ? csp.substring(0, 50) + "..." : csp,
        status: "enforced",
        summary: "CSP active and enforcing directive restrictions",
      });
    } else {
      audits.push({
        name: "Content-Security-Policy",
        status: "missing",
        summary: "Missing CSP header; inline scripts and framing unconstrained",
      });
    }

    // X-Frame-Options
    const xfo = lower["x-frame-options"];
    if (xfo) {
      audits.push({
        name: "X-Frame-Options",
        value: xfo,
        status: "enforced",
        summary: `Framing restricted to ${xfo}`,
      });
    }

    // HSTS
    const hsts = lower["strict-transport-security"];
    if (hsts) {
      audits.push({
        name: "Strict-Transport-Security (HSTS)",
        value: hsts,
        status: "enforced",
        summary: "Enforces mandatory HTTPS connections",
      });
    }

    set({ securityHeaders: audits });
  },

  // 3. Resource Optimization & Crash Guard
  crashHistory: [],
  crashGuardMode: initialSettings.crashGuardMode || "auto-restore",
  activeCrash: null,

  setCrashGuardMode: (mode) => {
    set({ crashGuardMode: mode });
    try {
      const current = loadSavedSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, crashGuardMode: mode }));
    } catch {}
  },

  recordCrash: (tabId, url, reason, exitCode = 0) => {
    const crashItem: CrashEvent = {
      id: `crash-${Date.now()}`,
      tabId,
      url,
      timestamp: Date.now(),
      reason,
      exitCode,
    };
    set((s) => ({
      crashHistory: [crashItem, ...s.crashHistory.slice(0, 19)],
      activeCrash: { tabId, url, reason, timestamp: Date.now() },
    }));
  },

  dismissActiveCrash: () => set({ activeCrash: null }),

  triggerGarbageCollection: async (webContentsId) => {
    try {
      const res = await (window as any).forge?.compat?.collectGarbage?.(webContentsId);
      return Boolean(res?.success);
    } catch {
      return false;
    }
  },

  // 4. Device Emulation Limits & Physical Bridge
  cpuThrottlingRate: initialSettings.cpuThrottlingRate || 1,
  networkCondition: initialSettings.networkCondition || "online",
  touchEmulationEnabled: initialSettings.touchEmulationEnabled || false,
  localNetworkIp: "127.0.0.1",

  setCpuThrottling: async (rate, webContentsId) => {
    set({ cpuThrottlingRate: rate });
    try {
      const current = loadSavedSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, cpuThrottlingRate: rate }));
      await (window as any).forge?.compat?.setEmulation?.(webContentsId, { cpuThrottlingRate: rate });
    } catch {}
  },

  setNetworkCondition: async (condition, webContentsId) => {
    set({ networkCondition: condition });
    try {
      const current = loadSavedSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, networkCondition: condition }));

      let params = null;
      if (condition === "slow3g") {
        params = { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8 };
      } else if (condition === "fast3g") {
        params = { offline: false, latency: 100, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 };
      } else if (condition === "offline") {
        params = { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 };
      }

      await (window as any).forge?.compat?.setEmulation?.(webContentsId, { networkConditions: params });
    } catch {}
  },

  setTouchEmulation: async (enabled, webContentsId) => {
    set({ touchEmulationEnabled: enabled });
    try {
      const current = loadSavedSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, touchEmulationEnabled: enabled }));
      await (window as any).forge?.compat?.setEmulation?.(webContentsId, { touchEmulation: enabled });
    } catch {}
  },

  refreshLocalIp: async () => {
    try {
      const ip = await (window as any).forge?.compat?.getLocalIp?.();
      if (ip) {
        set({ localNetworkIp: ip });
        return ip;
      }
    } catch {}
    return "127.0.0.1";
  },

  setLocalIp: (ip) => set({ localNetworkIp: ip }),

  // 5. Upstream Breaking Changes
  runtimeVersions: {
    chromium: "132.0.6834.83",
    v8: "13.2.152.26",
    node: "20.18.1",
    electron: "34.0.0",
  },
  deprecationLogs: [],

  initVersions: async () => {
    try {
      const v = await (window as any).forge?.compat?.getVersions?.();
      if (v) set({ runtimeVersions: v });
      const ip = await (window as any).forge?.compat?.getLocalIp?.();
      if (ip) set({ localNetworkIp: ip });
    } catch {}
  },

  addDeprecationLog: (message, source = "guest", line = 1) => {
    const log: DeprecationLog = {
      id: `dep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      message,
      source,
      line,
    };
    set((s) => ({
      deprecationLogs: [log, ...s.deprecationLogs.slice(0, 49)],
    }));
  },

  clearDeprecationLogs: () => set({ deprecationLogs: [] }),
}));
