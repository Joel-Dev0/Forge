import type { NetworkProvider } from "../providers/NetworkProvider.ts";
import { DirectProvider } from "../providers/DirectProvider.ts";
import { ProxyProvider } from "../providers/ProxyProvider.ts";
import { WireGuardProvider } from "../providers/WireGuardProvider.ts";
import type {
  NetworkMode,
  NetworkStatus,
  ProxyConfig,
  WireGuardConfig,
  NetworkLocationInfo,
  ConnectionTestResult,
} from "../types/NetworkConfig.ts";

export type StatusChangeListener = (status: NetworkStatus) => void;

export class NetworkManager {
  private providers: Map<NetworkMode, NetworkProvider> = new Map();
  private activeMode: NetworkMode = "direct";
  private listeners: Set<StatusChangeListener> = new Set();
  private cachedLocation?: NetworkLocationInfo;

  constructor() {
    this.providers.set("direct", new DirectProvider());
    this.providers.set("proxy", new ProxyProvider());
    this.providers.set("wireguard", new WireGuardProvider());
  }

  registerProvider(mode: NetworkMode, provider: NetworkProvider): void {
    this.providers.set(mode, provider);
  }

  getProvider(mode: NetworkMode): NetworkProvider | undefined {
    return this.providers.get(mode);
  }

  getActiveProvider(): NetworkProvider {
    const provider = this.providers.get(this.activeMode);
    if (!provider) {
      const fallback = new DirectProvider();
      this.providers.set("direct", fallback);
      this.activeMode = "direct";
      return fallback;
    }
    return provider;
  }

  getActiveMode(): NetworkMode {
    return this.activeMode;
  }

  getProxyProvider(): ProxyProvider {
    return this.providers.get("proxy") as ProxyProvider;
  }

  getDirectProvider(): DirectProvider {
    return this.providers.get("direct") as DirectProvider;
  }

  getWireGuardProvider(): WireGuardProvider {
    return this.providers.get("wireguard") as WireGuardProvider;
  }

  async switchProvider(
    mode: NetworkMode,
    config?: Partial<ProxyConfig> | WireGuardConfig
  ): Promise<NetworkStatus> {
    const previous = this.getActiveProvider();
    if (previous.mode !== mode) {
      await previous.disconnect().catch(() => {});
    }

    this.activeMode = mode;
    const current = this.getActiveProvider();

    if (mode === "proxy" && config && current instanceof ProxyProvider) {
      current.setConfig(config as Partial<ProxyConfig>);
    } else if (mode === "wireguard" && config && current instanceof WireGuardProvider) {
      current.setConfig(config as WireGuardConfig);
    }

    try {
      await current.connect();
    } catch (err: any) {
      const status = await current.getStatus();
      this.notifyStatus(status);
      throw err;
    }

    const status = await current.getStatus();
    this.notifyStatus(status);
    return status;
  }

  async disconnect(): Promise<NetworkStatus> {
    const current = this.getActiveProvider();
    await current.disconnect();

    // Revert to direct connection
    this.activeMode = "direct";
    const direct = this.getActiveProvider();
    await direct.connect();

    const status = await direct.getStatus();
    this.notifyStatus(status);
    return status;
  }

  async getStatus(): Promise<NetworkStatus> {
    const current = this.getActiveProvider();
    const status = await current.getStatus();
    if (!status.location && this.cachedLocation) {
      status.location = this.cachedLocation;
    }
    return status;
  }

  /**
   * Resolves public IP and location information.
   * Can accept a custom fetcher (e.g. Electron net.fetch or session-bound fetch)
   */
  async resolveLocation(
    customFetch?: (url: string) => Promise<any>
  ): Promise<NetworkLocationInfo> {
    const fetcher = customFetch || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
    if (!fetcher) {
      return { ip: "127.0.0.1", country: "Local" };
    }

    // Try ipwho.is first, then ipapi.co
    try {
      const res = await fetcher("https://ipwho.is/");
      const data = typeof res.json === "function" ? await res.json() : res;

      if (data && data.ip) {
        const info: NetworkLocationInfo = {
          ip: data.ip,
          country: data.country,
          countryCode: data.country_code,
          region: data.region,
          city: data.city,
          isp: data.connection?.isp || data.isp,
          timezone: data.timezone?.id || data.timezone,
        };
        this.cachedLocation = info;
        this.updateLocationOnProviders(info);
        return info;
      }
    } catch {
      // Fallback
    }

    try {
      const res = await fetcher("https://api.ipify.org?format=json");
      const data = typeof res.json === "function" ? await res.json() : res;
      if (data && data.ip) {
        const info: NetworkLocationInfo = {
          ip: data.ip,
          country: "Detected",
        };
        this.cachedLocation = info;
        this.updateLocationOnProviders(info);
        return info;
      }
    } catch {
      // Fallback
    }

    const fallbackInfo: NetworkLocationInfo = {
      ip: "Unknown",
      country: "Unknown",
    };
    return fallbackInfo;
  }

  private updateLocationOnProviders(info: NetworkLocationInfo): void {
    for (const provider of this.providers.values()) {
      if ("setLocation" in provider && typeof (provider as any).setLocation === "function") {
        (provider as any).setLocation(info);
      }
    }
  }

  /**
   * Tests connection latency and responsiveness (Phase 2 preview feature)
   */
  async testConnection(
    targetUrl: string = "https://www.google.com/generate_204",
    customFetch?: (url: string) => Promise<any>
  ): Promise<ConnectionTestResult> {
    const fetcher = customFetch || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
    if (!fetcher) {
      return { success: false, latencyMs: -1, error: "Network fetch not available" };
    }

    const start = performance.now();
    try {
      const res = await fetcher(targetUrl);
      const elapsed = Math.round(performance.now() - start);
      const status = typeof res.status === "number" ? res.status : 200;
      return {
        success: status >= 200 && status < 400,
        statusCode: status,
        latencyMs: elapsed,
      };
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      return {
        success: false,
        latencyMs: elapsed,
        error: err.message || "Connection failed",
      };
    }
  }

  onStatusChange(listener: StatusChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyStatus(status: NetworkStatus): void {
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (err) {
        console.error("[NetworkManager] Error notifying listener:", err);
      }
    }
  }
}
