export type { NetworkProvider } from "./providers/NetworkProvider.ts";
export { DirectProvider } from "./providers/DirectProvider.ts";
export { ProxyProvider } from "./providers/ProxyProvider.ts";
export { WireGuardProvider } from "./providers/WireGuardProvider.ts";

export { NetworkManager } from "./manager/NetworkManager.ts";
export type { StatusChangeListener } from "./manager/NetworkManager.ts";

export { VpnManager } from "./vpn/VpnManager.ts";
export type { VpnStatusChangeListener } from "./vpn/VpnManager.ts";
export { WireGuardConfigParser } from "./vpn/WireGuardConfigParser.ts";
export { DEFAULT_VPN_LOCATIONS, createConfigForLocation } from "./vpn/VpnLocationRegistry.ts";

export type {
  NetworkMode,
  ConnectionState,
  ProxyProtocol,
  ProxyConfig,
  ProxyProfile,
  WireGuardConfig,
  VpnProfile,
  VpnLocation,
  VpnStatus,
  NetworkLocationInfo,
  NetworkStatus,
  ConnectionTestResult,
} from "./types/NetworkConfig.ts";
