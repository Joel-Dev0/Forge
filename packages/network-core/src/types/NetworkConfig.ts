export type NetworkMode = "direct" | "proxy" | "wireguard";

export type ConnectionState = "connected" | "disconnected" | "connecting" | "disconnecting" | "error";

export type ProxyProtocol = "http" | "https" | "socks5" | "socks4";

export interface ProxyConfig {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  bypassRules?: string[];
}

export interface ProxyProfile {
  id: string;
  name: string;
  config: ProxyConfig;
  createdAt: number;
  lastUsedAt?: number;
}

export interface WireGuardConfig {
  endpoint: string;
  publicKey: string;
  privateKey: string;
  address: string;
  dns?: string[];
  allowedIps?: string[];
  presharedKey?: string;
  persistentKeepalive?: number;
  mtu?: number;
}

export interface VpnLocation {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  city: string;
  endpoint: string;
  flag: string;
  pingMs?: number;
  load?: number; // 0-100%
  isRecommended?: boolean;
}

export interface VpnProfile {
  id: string;
  name: string;
  config: WireGuardConfig;
  locationId?: string;
  providerName?: string;
  createdAt: number;
  lastUsedAt?: number;
}

export interface VpnStatus {
  state: ConnectionState;
  connectedSince?: number;
  activeProfile?: VpnProfile;
  activeLocation?: VpnLocation;
  endpoint?: string;
  bytesReceived: number;
  bytesSent: number;
  lastHandshake?: number;
  killSwitchEnabled: boolean;
  killSwitchEngaged: boolean;
  lastError?: string;
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

export interface NetworkStatus {
  mode: NetworkMode;
  state: ConnectionState;
  connectedSince?: number;
  activeConfig?: {
    protocol?: string;
    host?: string;
    port?: number;
  };
  location?: NetworkLocationInfo;
  lastError?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  statusCode?: number;
  resolvedIp?: string;
  error?: string;
}
