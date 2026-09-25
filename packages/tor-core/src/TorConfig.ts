export interface TorConfig {
  socksHost: string;
  socksPort: number;
  controlPort: number;
  dataDir?: string;
  torBinaryPath?: string;
  useBridges: boolean;
  bridgeType?: "obfs4" | "meek-azure" | "snowflake";
  customBridges?: string[];
  autoConnectOnTorTab: boolean;
}

export const DEFAULT_TOR_CONFIG: TorConfig = {
  socksHost: "127.0.0.1",
  socksPort: 9050,
  controlPort: 9051,
  useBridges: false,
  autoConnectOnTorTab: true,
};
