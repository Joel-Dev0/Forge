import type { NetworkMode, NetworkStatus } from "../types/NetworkConfig.ts";

export interface NetworkProvider {
  readonly name: string;
  readonly mode: NetworkMode;

  /**
   * Connect to or activate the network provider
   */
  connect(): Promise<void>;

  /**
   * Disconnect or restore default state
   */
  disconnect(): Promise<void>;

  /**
   * Retrieve the current network status
   */
  getStatus(): Promise<NetworkStatus>;

  /**
   * Capitalized alias for conceptual specification compatibility
   */
  GetStatus?(): Promise<NetworkStatus>;
}
