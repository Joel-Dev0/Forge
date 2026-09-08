import type { NetworkProvider } from "./NetworkProvider.ts";
import type {
  NetworkMode,
  NetworkStatus,
  ConnectionState,
  NetworkLocationInfo,
} from "../types/NetworkConfig.ts";

export class DirectProvider implements NetworkProvider {
  readonly name = "Direct Connection";
  readonly mode: NetworkMode = "direct";

  private state: ConnectionState = "connected";
  private connectedSince: number = Date.now();
  private location?: NetworkLocationInfo;
  private lastError?: string;

  constructor(initialLocation?: NetworkLocationInfo) {
    this.location = initialLocation;
  }

  async connect(): Promise<void> {
    this.state = "connected";
    this.connectedSince = Date.now();
    this.lastError = undefined;
  }

  async disconnect(): Promise<void> {
    this.state = "disconnected";
  }

  async getStatus(): Promise<NetworkStatus> {
    return {
      mode: this.mode,
      state: this.state,
      connectedSince: this.connectedSince,
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
