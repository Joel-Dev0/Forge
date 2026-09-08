import { create } from "zustand";

export type NetworkMode = "direct" | "proxy" | "wireguard";
export type ConnectionState = "connected" | "disconnected" | "connecting" | "disconnecting" | "error";
export type ProxyProtocol = "http" | "https" | "socks5";

export interface ProxyConfig {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  bypassRules?: string[];
}

export interface NetworkLocationInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  timezone?: string;
}

export interface ProxyProfile {
  id: string;
  name: string;
  config: ProxyConfig;
  createdAt: number;
}

interface SecureNetworkState {
  mode: NetworkMode;
  state: ConnectionState;
  proxyConfig: ProxyConfig;
  location: NetworkLocationInfo;
  connectedSince?: number;
  lastError: string | null;
  isConnecting: boolean;
  isRefreshingIp: boolean;
  isTestingConnection: boolean;
  testResult: {
    success: boolean;
    latencyMs: number;
    statusCode?: number;
    error?: string;
  } | null;
  profiles: ProxyProfile[];
  activeProfileId: string | null;

  setMode: (mode: NetworkMode) => void;
  updateProxyConfig: (partial: Partial<ProxyConfig>) => void;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  refreshIp: () => Promise<void>;
  testConnection: (url?: string) => Promise<void>;
  saveProfile: (name: string) => void;
  applyProfile: (profileId: string) => void;
  deleteProfile: (profileId: string) => void;
  init: () => void;
}

const STORAGE_KEY_PROFILES = "forge:secure-network:profiles";
const STORAGE_KEY_CONFIG = "forge:secure-network:last-proxy-config";

function loadSavedProfiles(): ProxyProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    {
      id: "default-tor",
      name: "Tor SOCKS5 Proxy",
      config: {
        protocol: "socks5",
        host: "127.0.0.1",
        port: 9050,
        bypassRules: ["<local>", "localhost", "127.0.0.1"],
      },
      createdAt: Date.now(),
    },
    {
      id: "default-local-http",
      name: "Local HTTP Proxy",
      config: {
        protocol: "http",
        host: "127.0.0.1",
        port: 8080,
        bypassRules: ["<local>", "localhost", "127.0.0.1"],
      },
      createdAt: Date.now(),
    },
  ];
}

function loadSavedProxyConfig(): ProxyConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    protocol: "http",
    host: "127.0.0.1",
    port: 8080,
    bypassRules: ["<local>", "localhost", "127.0.0.1"],
  };
}

let isInitialized = false;

export const useSecureNetworkStore = create<SecureNetworkState>((set, get) => ({
  mode: "direct",
  state: "connected",
  proxyConfig: loadSavedProxyConfig(),
  location: {
    ip: "Detecting...",
    country: "Local Network",
  },
  connectedSince: undefined,
  lastError: null,
  isConnecting: false,
  isRefreshingIp: false,
  isTestingConnection: false,
  testResult: null,
  profiles: loadSavedProfiles(),
  activeProfileId: null,

  setMode: (mode: NetworkMode) => {
    set({ mode, lastError: null, testResult: null });
  },

  updateProxyConfig: (partial: Partial<ProxyConfig>) => {
    const updated = { ...get().proxyConfig, ...partial };
    set({ proxyConfig: updated, lastError: null });
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
    } catch {}
  },

  connect: async () => {
    const { mode, proxyConfig } = get();
    const bridge = (window as any).forge?.secureNetwork;
    if (!bridge) {
      set({ state: "connected", lastError: null });
      return true;
    }

    set({ isConnecting: true, lastError: null });

    try {
      const res = await bridge.connect({
        mode,
        config: mode === "proxy" ? proxyConfig : undefined,
      });

      if (res && res.ok) {
        set({
          state: "connected",
          connectedSince: Date.now(),
          isConnecting: false,
          lastError: null,
        });
        get().refreshIp().catch(() => {});
        return true;
      } else {
        const errMsg = res?.error || "Connection failed";
        set({
          state: "error",
          isConnecting: false,
          lastError: errMsg,
        });
        return false;
      }
    } catch (err: any) {
      set({
        state: "error",
        isConnecting: false,
        lastError: err.message || "Failed to connect",
      });
      return false;
    }
  },

  disconnect: async () => {
    const bridge = (window as any).forge?.secureNetwork;
    set({ isConnecting: true, lastError: null });

    if (!bridge) {
      set({
        mode: "direct",
        state: "connected",
        isConnecting: false,
        connectedSince: Date.now(),
      });
      return true;
    }

    try {
      const res = await bridge.disconnect();
      if (res && res.ok) {
        set({
          mode: "direct",
          state: "connected",
          connectedSince: Date.now(),
          isConnecting: false,
          lastError: null,
        });
        get().refreshIp().catch(() => {});
        return true;
      } else {
        set({
          isConnecting: false,
          lastError: res?.error || "Disconnect failed",
        });
        return false;
      }
    } catch (err: any) {
      set({
        isConnecting: false,
        lastError: err.message || "Failed to disconnect",
      });
      return false;
    }
  },

  refreshIp: async () => {
    const bridge = (window as any).forge?.secureNetwork;
    set({ isRefreshingIp: true });

    if (bridge?.refreshIp) {
      try {
        const res = await bridge.refreshIp();
        if (res && res.ok && res.location) {
          set({ location: res.location, isRefreshingIp: false });
          return;
        }
      } catch {}
    }

    // Fallback in browser environment
    try {
      const resp = await fetch("https://ipwho.is/");
      const data = await resp.json();
      if (data && data.ip) {
        set({
          location: {
            ip: data.ip,
            country: data.country,
            countryCode: data.country_code,
            city: data.city,
            region: data.region,
            isp: data.connection?.isp || data.isp,
            timezone: data.timezone?.id || data.timezone,
          },
          isRefreshingIp: false,
        });
        return;
      }
    } catch {}

    set({ isRefreshingIp: false });
  },

  testConnection: async (url?: string) => {
    const bridge = (window as any).forge?.secureNetwork;
    set({ isTestingConnection: true, testResult: null });

    if (bridge?.testConnection) {
      try {
        const res = await bridge.testConnection(url);
        if (res && res.ok) {
          set({ testResult: res.result, isTestingConnection: false });
          return;
        }
      } catch {}
    }

    // Fallback client-side test
    const target = url || "https://www.google.com/generate_204";
    const start = performance.now();
    try {
      await fetch(target, { mode: "no-cors" });
      const elapsed = Math.round(performance.now() - start);
      set({
        testResult: {
          success: true,
          latencyMs: elapsed,
        },
        isTestingConnection: false,
      });
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      set({
        testResult: {
          success: false,
          latencyMs: elapsed,
          error: err.message || "Connection failed",
        },
        isTestingConnection: false,
      });
    }
  },

  saveProfile: (name: string) => {
    const { proxyConfig, profiles } = get();
    const newProfile: ProxyProfile = {
      id: "profile-" + Date.now(),
      name: name.trim() || `Proxy ${profiles.length + 1}`,
      config: { ...proxyConfig },
      createdAt: Date.now(),
    };
    const updated = [newProfile, ...profiles];
    set({ profiles: updated, activeProfileId: newProfile.id });
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
    } catch {}
  },

  applyProfile: (profileId: string) => {
    const profile = get().profiles.find((p) => p.id === profileId);
    if (profile) {
      set({
        mode: "proxy",
        proxyConfig: { ...profile.config },
        activeProfileId: profileId,
      });
    }
  },

  deleteProfile: (profileId: string) => {
    const updated = get().profiles.filter((p) => p.id !== profileId);
    set({
      profiles: updated,
      activeProfileId: get().activeProfileId === profileId ? null : get().activeProfileId,
    });
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
    } catch {}
  },

  init: () => {
    if (isInitialized) return;
    isInitialized = true;

    const bridge = (window as any).forge?.secureNetwork;
    if (bridge) {
      bridge.getStatus().then((status: any) => {
        if (status) {
          set({
            mode: status.mode || "direct",
            state: status.state || "connected",
            location: status.location || get().location,
            connectedSince: status.connectedSince,
            lastError: status.lastError || null,
          });
        }
      }).catch(() => {});

      bridge.onStatusChanged((status: any) => {
        if (status) {
          set((prev) => ({
            mode: status.mode || prev.mode,
            state: status.state || prev.state,
            location: status.location || prev.location,
            connectedSince: status.connectedSince ?? prev.connectedSince,
            lastError: status.lastError !== undefined ? status.lastError : prev.lastError,
          }));
        }
      });
    }

    get().refreshIp().catch(() => {});
  },
}));
