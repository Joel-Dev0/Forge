import { WireGuardProvider } from "../providers/WireGuardProvider.ts";
import { WireGuardConfigParser } from "./WireGuardConfigParser.ts";
import { DEFAULT_VPN_LOCATIONS, createConfigForLocation } from "./VpnLocationRegistry.ts";
import type {
  WireGuardConfig,
  VpnProfile,
  VpnLocation,
  VpnStatus,
} from "../types/NetworkConfig.ts";

export type VpnStatusChangeListener = (status: VpnStatus) => void;

export class VpnManager {
  private wireguard: WireGuardProvider;
  private profiles: Map<string, VpnProfile> = new Map();
  private locations: VpnLocation[] = [...DEFAULT_VPN_LOCATIONS];
  private activeProfileId?: string;
  private selectedLocationId: string = "loc-us-east";

  private killSwitchEnabled: boolean = false;
  private listeners: Set<VpnStatusChangeListener> = new Set();

  constructor() {
    this.wireguard = new WireGuardProvider();
    this.initializeDefaultProfiles();
  }

  private initializeDefaultProfiles(): void {
    // Generate initial profiles for built-in locations
    for (const loc of this.locations) {
      const config = createConfigForLocation(loc);
      const profile: VpnProfile = {
        id: `profile-${loc.id}`,
        name: `${loc.name} (${loc.city})`,
        config,
        locationId: loc.id,
        providerName: "Forge Secure Gateway",
        createdAt: Date.now(),
      };
      this.profiles.set(profile.id, profile);
    }
    this.activeProfileId = `profile-loc-us-east`;
    const active = this.profiles.get(this.activeProfileId);
    if (active) {
      this.wireguard.setConfig(active.config);
    }
  }

  getWireGuardProvider(): WireGuardProvider {
    return this.wireguard;
  }

  getProfiles(): VpnProfile[] {
    return Array.from(this.profiles.values());
  }

  getLocations(): VpnLocation[] {
    return [...this.locations];
  }

  getSelectedLocation(): VpnLocation | undefined {
    return this.locations.find((l) => l.id === this.selectedLocationId);
  }

  getActiveProfile(): VpnProfile | undefined {
    if (this.activeProfileId) {
      return this.profiles.get(this.activeProfileId);
    }
    return undefined;
  }

  /**
   * Toggle or set the Kill Switch feature
   */
  setKillSwitch(enabled: boolean): VpnStatus {
    this.killSwitchEnabled = enabled;
    const status = this.getStatus();
    this.notifyStatus(status);
    return status;
  }

  /**
   * Import a standard WireGuard configuration file (.conf)
   */
  importConfig(rawText: string, customName?: string): VpnProfile {
    const config = WireGuardConfigParser.parse(rawText);
    const profileId = `custom-${Date.now()}`;
    const name = customName?.trim() || `WireGuard Server (${config.endpoint})`;

    const profile: VpnProfile = {
      id: profileId,
      name,
      config,
      providerName: "Custom Provider",
      createdAt: Date.now(),
    };

    this.profiles.set(profile.id, profile);
    this.activeProfileId = profile.id;
    this.wireguard.setConfig(config);

    this.notifyStatus(this.getStatus());
    return profile;
  }

  /**
   * Export a profile as standard WireGuard .conf format
   */
  exportConfig(profileId?: string): string {
    const id = profileId || this.activeProfileId;
    const profile = id ? this.profiles.get(id) : undefined;
    if (!profile) {
      throw new Error(`Profile '${id}' not found`);
    }
    return WireGuardConfigParser.serialize(profile.config);
  }

  /**
   * Select a server location
   */
  async selectLocation(locationId: string): Promise<VpnStatus> {
    const loc = this.locations.find((l) => l.id === locationId);
    if (!loc) {
      throw new Error(`Location '${locationId}' not found`);
    }

    this.selectedLocationId = locationId;
    let targetProfile = Array.from(this.profiles.values()).find(
      (p) => p.locationId === locationId
    );

    if (!targetProfile) {
      const config = createConfigForLocation(loc);
      targetProfile = {
        id: `profile-${loc.id}`,
        name: `${loc.name} (${loc.city})`,
        config,
        locationId: loc.id,
        providerName: "Forge Secure Gateway",
        createdAt: Date.now(),
      };
      this.profiles.set(targetProfile.id, targetProfile);
    }

    this.activeProfileId = targetProfile.id;
    this.wireguard.setConfig(targetProfile.config);

    // If currently connected, reconnect to the new location seamlessly
    const currentStatus = await this.wireguard.getStatus();
    if (currentStatus.state === "connected") {
      await this.disconnect();
      return this.connect();
    }

    const status = this.getStatus();
    this.notifyStatus(status);
    return status;
  }

  /**
   * Connect to the VPN (using selected profile or custom config)
   */
  async connect(profileIdOrConfig?: string | WireGuardConfig): Promise<VpnStatus> {
    if (typeof profileIdOrConfig === "string") {
      const profile = this.profiles.get(profileIdOrConfig);
      if (!profile) {
        throw new Error(`Profile '${profileIdOrConfig}' not found`);
      }
      this.activeProfileId = profile.id;
      this.wireguard.setConfig(profile.config);
    } else if (profileIdOrConfig && typeof profileIdOrConfig === "object") {
      this.wireguard.setConfig(profileIdOrConfig);
    } else {
      const active = this.getActiveProfile();
      if (active) {
        this.wireguard.setConfig(active.config);
      }
    }

    this.notifyStatus(this.getStatus());

    try {
      await this.wireguard.connect();
      const status = this.getStatus();
      this.notifyStatus(status);
      return status;
    } catch (err: any) {
      const status = this.getStatus();
      this.notifyStatus(status);
      throw err;
    }
  }

  /**
   * Disconnect the VPN tunnel
   */
  async disconnect(): Promise<VpnStatus> {
    await this.wireguard.disconnect();
    const status = this.getStatus();
    this.notifyStatus(status);
    return status;
  }

  saveProfile(profile: Partial<VpnProfile> & { id?: string }): VpnProfile {
    const id = profile.id || `profile-${Date.now()}`;
    const existing = this.profiles.get(id);

    const updated: VpnProfile = {
      id,
      name: profile.name || existing?.name || "WireGuard Profile",
      config: profile.config || existing?.config || createConfigForLocation(this.locations[0]),
      locationId: profile.locationId || existing?.locationId,
      providerName: profile.providerName || existing?.providerName || "Custom",
      createdAt: existing?.createdAt || Date.now(),
      lastUsedAt: Date.now(),
    };

    this.profiles.set(id, updated);
    this.notifyStatus(this.getStatus());
    return updated;
  }

  deleteProfile(profileId: string): boolean {
    if (this.activeProfileId === profileId) {
      const remaining = Array.from(this.profiles.keys()).filter((k) => k !== profileId);
      this.activeProfileId = remaining[0];
      if (this.activeProfileId) {
        const p = this.profiles.get(this.activeProfileId);
        if (p) this.wireguard.setConfig(p.config);
      }
    }
    const res = this.profiles.delete(profileId);
    this.notifyStatus(this.getStatus());
    return res;
  }

  getStatus(): VpnStatus {
    const metrics = this.wireguard.getMetrics();
    const activeProfile = this.getActiveProfile();
    const activeLocation = this.getSelectedLocation();

    // Query synchronous status fields from wireguard
    const currentConfig = this.wireguard.getConfig();
    let state = "disconnected";
    try {
      // Direct access from provider status
      state = (this.wireguard as any).state || "disconnected";
    } catch {}

    const isConnected = state === "connected";
    const killSwitchEngaged = this.killSwitchEnabled && !isConnected;

    return {
      state: state as any,
      connectedSince: (this.wireguard as any).connectedSince,
      activeProfile,
      activeLocation,
      endpoint: currentConfig?.endpoint,
      bytesReceived: metrics.bytesReceived,
      bytesSent: metrics.bytesSent,
      lastHandshake: metrics.lastHandshake,
      killSwitchEnabled: this.killSwitchEnabled,
      killSwitchEngaged,
      lastError: (this.wireguard as any).lastError,
    };
  }

  onVpnStatusChange(listener: VpnStatusChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyStatus(status: VpnStatus): void {
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (err) {
        console.error("[VpnManager] Error notifying listener:", err);
      }
    }
  }
}
