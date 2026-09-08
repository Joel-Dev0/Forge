import type { NetworkProvider } from "./NetworkProvider.ts";
import type {
  NetworkMode,
  NetworkStatus,
  ConnectionState,
  ProxyConfig,
  NetworkLocationInfo,
} from "../types/NetworkConfig.ts";

export class ProxyProvider implements NetworkProvider {
  readonly name = "Proxy Provider";
  readonly mode: NetworkMode = "proxy";

  private state: ConnectionState = "disconnected";
  private connectedSince?: number;
  private config: ProxyConfig;
  private location?: NetworkLocationInfo;
  private lastError?: string;

  constructor(initialConfig?: Partial<ProxyConfig>) {
    this.config = {
      protocol: initialConfig?.protocol ?? "http",
      host: initialConfig?.host !== undefined ? initialConfig.host : "127.0.0.1",
      port: initialConfig?.port !== undefined ? initialConfig.port : 8080,
      username: initialConfig?.username,
      password: initialConfig?.password,
      bypassRules: initialConfig?.bypassRules ?? ["<local>", "localhost", "127.0.0.1"],
    };
  }

  setConfig(config: Partial<ProxyConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  getConfig(): ProxyConfig {
    return { ...this.config };
  }

  /**
   * Translates current proxy configuration to Electron session.setProxy parameters
   */
  toElectronProxyRules(): { proxyRules: string; proxyBypassRules: string } {
    const { protocol, host, port, bypassRules } = this.config;
    const cleanHost = host.trim().replace(/^https?:\/\//i, "").replace(/^socks[45]:\/\//i, "");

    let proxyRules = "";
    switch (protocol) {
      case "http":
        // For general HTTP proxies, apply to both http and https traffic
        proxyRules = `http://${cleanHost}:${port};https://${cleanHost}:${port}`;
        break;
      case "https":
        proxyRules = `https://${cleanHost}:${port}`;
        break;
      case "socks5":
        proxyRules = `socks5://${cleanHost}:${port}`;
        break;
      case "socks4":
        proxyRules = `socks4://${cleanHost}:${port}`;
        break;
      default:
        proxyRules = `http://${cleanHost}:${port}`;
        break;
    }

    const bypassList = bypassRules && bypassRules.length > 0
      ? Array.from(new Set(["<local>", ...bypassRules])).join(";")
      : "<local>;localhost;127.0.0.1";

    return {
      proxyRules,
      proxyBypassRules: bypassList,
    };
  }

  async connect(): Promise<void> {
    if (!this.config.host || !this.config.host.trim()) {
      this.state = "error";
      this.lastError = "Proxy host cannot be empty";
      throw new Error(this.lastError);
    }

    if (!this.config.port || this.config.port <= 0 || this.config.port > 65535) {
      this.state = "error";
      this.lastError = `Invalid proxy port: ${this.config.port}`;
      throw new Error(this.lastError);
    }

    this.state = "connected";
    this.connectedSince = Date.now();
    this.lastError = undefined;
  }

  async disconnect(): Promise<void> {
    this.state = "disconnected";
    this.connectedSince = undefined;
  }

  async getStatus(): Promise<NetworkStatus> {
    return {
      mode: this.mode,
      state: this.state,
      connectedSince: this.connectedSince,
      activeConfig: {
        protocol: this.config.protocol,
        host: this.config.host,
        port: this.config.port,
      },
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

  setError(error?: string): void {
    this.lastError = error;
    if (error) this.state = "error";
  }
}
