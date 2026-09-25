export type TorConnectionState =
  | "DISCONNECTED"
  | "STARTING"
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "STOPPING"
  | "ERROR";

export interface TorCircuitNode {
  name: string;
  ip: string;
  country: string;
  countryCode: string;
  type: "guard" | "relay" | "exit";
  fingerprint: string;
}

export interface TorCircuit {
  id: string;
  nodes: TorCircuitNode[];
  establishedAt: number;
  buildDurationMs: number;
}

export interface TorStatus {
  state: TorConnectionState;
  bootstrapProgress: number; // 0 - 100
  currentStep: string;
  circuit: TorCircuit | null;
  socksHost: string;
  socksPort: number;
  controlPort: number;
  error?: string;
  uptimeSeconds: number;
  isCustomBridge: boolean;
}
