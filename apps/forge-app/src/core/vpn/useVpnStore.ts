import { create } from "zustand";
import type {
  VpnLocation,
  VpnProfile,
  VpnStatus,
  ConnectionState,
} from "@forge/network-core";

interface VpnStoreState {
  state: ConnectionState;
  status: VpnStatus;
  locations: VpnLocation[];
  selectedLocationId: string;
  profiles: VpnProfile[];
  activeProfileId?: string;

  isConnecting: boolean;
  isImporting: boolean;
  isTestingLatency: boolean;
  lastError: string | null;

  init: () => void;
  connect: (profileIdOrConfig?: any) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  selectLocation: (locationId: string) => Promise<boolean>;
  setKillSwitch: (enabled: boolean) => Promise<void>;
  importConfig: (rawText: string, name?: string) => Promise<boolean>;
  exportConfig: (profileId?: string) => Promise<string | null>;
  deleteProfile: (profileId: string) => Promise<boolean>;
  testLatency: (locationId: string) => Promise<number>;
}

const DEFAULT_STATUS: VpnStatus = {
  state: "disconnected",
  bytesReceived: 0,
  bytesSent: 0,
  killSwitchEnabled: false,
  killSwitchEngaged: false,
};

let isInitialized = false;

export const useVpnStore = create<VpnStoreState>((set, get) => ({
  state: "disconnected",
  status: DEFAULT_STATUS,
  locations: [],
  selectedLocationId: "loc-us-east",
  profiles: [],
  activeProfileId: undefined,

  isConnecting: false,
  isImporting: false,
  isTestingLatency: false,
  lastError: null,

  init: () => {
    if (isInitialized) return;
    isInitialized = true;

    const bridge = (window as any).forge?.vpn;
    if (!bridge) return;

    // Load initial locations
    bridge.getLocations().then((locs: VpnLocation[]) => {
      if (locs && locs.length > 0) {
        set({ locations: locs });
      }
    }).catch(() => {});

    // Load initial profiles
    bridge.getProfiles().then((profs: VpnProfile[]) => {
      if (profs && profs.length > 0) {
        set({ profiles: profs });
      }
    }).catch(() => {});

    // Load status
    bridge.getStatus().then((st: VpnStatus) => {
      if (st) {
        set({
          status: st,
          state: st.state,
          selectedLocationId: st.activeLocation?.id || get().selectedLocationId,
          activeProfileId: st.activeProfile?.id,
          lastError: st.lastError || null,
        });
      }
    }).catch(() => {});

    // Listen to status updates
    bridge.onStatusChanged((st: VpnStatus) => {
      if (st) {
        set({
          status: st,
          state: st.state,
          selectedLocationId: st.activeLocation?.id || get().selectedLocationId,
          activeProfileId: st.activeProfile?.id || get().activeProfileId,
          lastError: st.lastError || null,
        });
      }
    });
  },

  connect: async (profileIdOrConfig?: any) => {
    const bridge = (window as any).forge?.vpn;
    set({ isConnecting: true, lastError: null });

    if (!bridge) {
      set({
        state: "connected",
        isConnecting: false,
        status: { ...get().status, state: "connected", connectedSince: Date.now() },
      });
      return true;
    }

    try {
      const res = await bridge.connect(profileIdOrConfig);
      if (res && res.ok) {
        set({
          state: "connected",
          status: res.status || get().status,
          isConnecting: false,
          lastError: null,
        });
        return true;
      } else {
        const err = res?.error || "Failed to establish VPN connection";
        set({
          state: "error",
          status: res?.status || { ...get().status, state: "error", lastError: err },
          isConnecting: false,
          lastError: err,
        });
        return false;
      }
    } catch (err: any) {
      const msg = err.message || "VPN connection failed";
      set({
        state: "error",
        isConnecting: false,
        lastError: msg,
      });
      return false;
    }
  },

  disconnect: async () => {
    const bridge = (window as any).forge?.vpn;
    set({ isConnecting: true, lastError: null });

    if (!bridge) {
      set({
        state: "disconnected",
        isConnecting: false,
        status: { ...get().status, state: "disconnected" },
      });
      return true;
    }

    try {
      const res = await bridge.disconnect();
      set({
        state: "disconnected",
        status: res?.status || { ...get().status, state: "disconnected" },
        isConnecting: false,
        lastError: null,
      });
      return true;
    } catch (err: any) {
      set({
        isConnecting: false,
        lastError: err.message || "Failed to disconnect",
      });
      return false;
    }
  },

  selectLocation: async (locationId: string) => {
    const bridge = (window as any).forge?.vpn;
    set({ selectedLocationId: locationId, lastError: null });

    if (!bridge) return true;

    try {
      const res = await bridge.selectLocation(locationId);
      if (res && res.ok && res.status) {
        set({
          status: res.status,
          state: res.status.state,
          activeProfileId: res.status.activeProfile?.id,
        });
        return true;
      } else if (res?.error) {
        set({ lastError: res.error });
        return false;
      }
      return true;
    } catch (err: any) {
      set({ lastError: err.message });
      return false;
    }
  },

  setKillSwitch: async (enabled: boolean) => {
    const bridge = (window as any).forge?.vpn;
    if (!bridge) {
      set((s) => ({
        status: {
          ...s.status,
          killSwitchEnabled: enabled,
          killSwitchEngaged: enabled && s.state !== "connected",
        },
      }));
      return;
    }

    try {
      const res = await bridge.setKillSwitch(enabled);
      if (res && res.ok && res.status) {
        set({ status: res.status });
      }
    } catch (err: any) {
      console.error("Failed to update Kill Switch:", err);
    }
  },

  importConfig: async (rawText: string, name?: string) => {
    const bridge = (window as any).forge?.vpn;
    set({ isImporting: true, lastError: null });

    if (!bridge) {
      set({ isImporting: false });
      return false;
    }

    try {
      const res = await bridge.importConfig(rawText, name);
      if (res && res.ok && res.profile) {
        set((s) => ({
          profiles: [res.profile, ...s.profiles],
          activeProfileId: res.profile.id,
          isImporting: false,
        }));
        return true;
      } else {
        set({
          isImporting: false,
          lastError: res?.error || "Failed to import configuration",
        });
        return false;
      }
    } catch (err: any) {
      set({
        isImporting: false,
        lastError: err.message || "Failed to import configuration",
      });
      return false;
    }
  },

  exportConfig: async (profileId?: string) => {
    const bridge = (window as any).forge?.vpn;
    if (!bridge) return null;

    try {
      const res = await bridge.exportConfig(profileId);
      if (res && res.ok && res.conf) {
        return res.conf;
      }
      return null;
    } catch {
      return null;
    }
  },

  deleteProfile: async (profileId: string) => {
    const bridge = (window as any).forge?.vpn;
    if (!bridge) return false;

    try {
      const res = await bridge.deleteProfile(profileId);
      if (res && res.ok) {
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== profileId),
          activeProfileId: s.activeProfileId === profileId ? undefined : s.activeProfileId,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  testLatency: async (locationId: string) => {
    const bridge = (window as any).forge?.vpn;
    if (!bridge) return 30;

    set({ isTestingLatency: true });
    try {
      const res = await bridge.testLatency(locationId);
      set({ isTestingLatency: false });
      if (res && res.ok && typeof res.pingMs === "number") {
        set((s) => ({
          locations: s.locations.map((loc) =>
            loc.id === locationId ? { ...loc, pingMs: res.pingMs } : loc
          ),
        }));
        return res.pingMs;
      }
      return 30;
    } catch {
      set({ isTestingLatency: false });
      return 30;
    }
  },
}));
