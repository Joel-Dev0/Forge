import type { NetworkProvider } from "./NetworkProvider.ts";
import type {
  NetworkMode,
  NetworkStatus,
  ConnectionState,
  WireGuardConfig,
  NetworkLocationInfo,
} from "../types/NetworkConfig.ts";
import { WireGuardConfigParser } from "../vpn/WireGuardConfigParser.ts";

export class WireGuardProvider implements NetworkProvider {
  readonly name = "WireGuard VPN";
  readonly mode: NetworkMode = "wireguard";

  private state: ConnectionState = "disconnected";
  private connectedSince?: number;
  private config?: WireGuardConfig;
  private location?: NetworkLocationInfo;
  private lastError?: string;

  private bytesReceived: number = 0;
  private bytesSent: number = 0;
  private lastHandshake?: number;
  private metricsTimer?: ReturnType<typeof setInterval>;

  constructor(initialConfig?: WireGuardConfig) {
    this.config = initialConfig;
  }

  setConfig(config: WireGuardConfig): void {
    this.config = config;
  }

  getConfig(): WireGuardConfig | undefined {
    return this.config ? { ...this.config } : undefined;
  }

  async connect(): Promise<void> {
    if (!this.config) {
      this.state = "error";
      this.lastError = "No WireGuard configuration provided";
      throw new Error(this.lastError);
    }

    // Validate endpoint
    if (!this.config.endpoint || !this.config.endpoint.trim()) {
      this.state = "error";
      this.lastError = "WireGuard endpoint cannot be empty";
      throw new Error(this.lastError);
    }
    if (!this.config.endpoint.includes(":")) {
      this.state = "error";
      this.lastError = `Invalid endpoint '${this.config.endpoint}'. Expected format host:port (e.g. 198.51.100.1:51820)`;
      throw new Error(this.lastError);
    }

    // Validate private key
    if (!WireGuardConfigParser.isValidKey(this.config.privateKey)) {
      this.state = "error";
      this.lastError = "Invalid WireGuard PrivateKey (expected 32-byte Base64 key)";
      throw new Error(this.lastError);
    }

    // Validate public key
    if (!WireGuardConfigParser.isValidKey(this.config.publicKey)) {
      this.state = "error";
      this.lastError = "Invalid WireGuard PublicKey (expected 32-byte Base64 key)";
      throw new Error(this.lastError);
    }

    this.state = "connecting";
    this.lastError = undefined;

    // Simulate handshake negotiation & connection establishment
    await new Promise((resolve) => setTimeout(resolve, 350));

    this.state = "connected";
    this.connectedSince = Date.now();
    this.lastHandshake = Date.now();
    this.bytesReceived = 1420;
    this.bytesSent = 840;

    // Start background metrics ticker
    this.startMetricsTicker();
  }

  async disconnect(): Promise<void> {
    this.state = "disconnecting";
    this.stopMetricsTicker();
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.state = "disconnected";
    this.connectedSince = undefined;
    this.lastHandshake = undefined;
    this.bytesReceived = 0;
    this.bytesSent = 0;
  }

  async getStatus(): Promise<NetworkStatus> {
    const [host, portStr] = this.config?.endpoint ? this.config.endpoint.split(":") : ["", "51820"];
    const port = parseInt(portStr, 10) || 51820;

    return {
      mode: this.mode,
      state: this.state,
      connectedSince: this.connectedSince,
      activeConfig: this.config
        ? {
            protocol: "wireguard",
            host,
            port,
          }
        : undefined,
      location: this.location,
      lastError: this.lastError,
    };
  }

  async GetStatus(): Promise<NetworkStatus> {
    return this.getStatus();
  }

  setLocation(location: NetworkLocationInfo): void {
    this.location = location;
  }

  getMetrics(): { bytesReceived: number; bytesSent: number; lastHandshake?: number } {
    return {
      bytesReceived: this.bytesReceived,
      bytesSent: this.bytesSent,
      lastHandshake: this.lastHandshake,
    };
  }

  setError(error?: string): void {
    this.lastError = error;
    if (error) {
      this.state = "error";
      this.stopMetricsTicker();
    }
  }

  private startMetricsTicker(): void {
    this.stopMetricsTicker();
    this.metricsTimer = setInterval(() => {
      if (this.state === "connected") {
        // Accumulate realistic browsing throughput increments
        this.bytesReceived += Math.floor(Math.random() * 45000 + 12000);
        this.bytesSent += Math.floor(Math.random() * 8000 + 2000);
      }
    }, 1500);
    // Unref so timer doesn't hold node process open in tests
    const timerAny = this.metricsTimer as any;
    if (timerAny && typeof timerAny.unref === "function") {
      timerAny.unref();
    }
  }

  private stopMetricsTicker(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
  }
}
