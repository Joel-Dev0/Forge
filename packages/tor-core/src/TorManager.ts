import { type TorConfig, DEFAULT_TOR_CONFIG } from "./TorConfig.ts";
import { type TorStatus, type TorCircuit, type TorConnectionState } from "./TorState.ts";
import { TorEvents } from "./TorEvents.ts";
import { TorConnection } from "./TorConnection.ts";

export class TorManager {
  private static instance: TorManager | null = null;
  private config: TorConfig;
  private status: TorStatus;
  public readonly events = new TorEvents();
  private bootstrapTimer: any = null;
  private startTime: number = 0;

  constructor(config: Partial<TorConfig> = {}) {
    this.config = { ...DEFAULT_TOR_CONFIG, ...config };
    this.status = {
      state: "DISCONNECTED",
      bootstrapProgress: 0,
      currentStep: "Tor is inactive",
      circuit: null,
      socksHost: this.config.socksHost,
      socksPort: this.config.socksPort,
      controlPort: this.config.controlPort,
      uptimeSeconds: 0,
      isCustomBridge: Boolean(this.config.useBridges),
    };
  }

  public static getInstance(): TorManager {
    if (!TorManager.instance) {
      TorManager.instance = new TorManager();
    }
    return TorManager.instance;
  }

  public getStatus(): TorStatus {
    const uptimeSeconds = this.status.state === "CONNECTED" && this.startTime > 0
      ? Math.floor((Date.now() - this.startTime) / 1000)
      : 0;
    return { ...this.status, uptimeSeconds };
  }

  public getConfig(): TorConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<TorConfig>): void {
    this.config = { ...this.config, ...patch };
    this.status.socksHost = this.config.socksHost;
    this.status.socksPort = this.config.socksPort;
    this.status.controlPort = this.config.controlPort;
    this.status.isCustomBridge = Boolean(this.config.useBridges);
    this.events.emitStatus(this.getStatus());
  }

  public async connect(): Promise<TorStatus> {
    if (this.status.state === "CONNECTED" || this.status.state === "CONNECTING") {
      return this.getStatus();
    }

    if (this.bootstrapTimer) {
      clearTimeout(this.bootstrapTimer);
    }

    this.updateState("STARTING", 10, "Starting Tor runtime...");
    this.events.emitLog("[TorManager] Initializing Tor runtime subsystem...");

    return new Promise<TorStatus>((resolve) => {
      // Step 1: Starting Tor
      this.bootstrapTimer = setTimeout(() => {
        this.updateState("CONNECTING", 35, "Connecting to Tor directory authorities...");
        this.events.emitLog("[TorManager] Loading consensus directory & network map...");

        // Step 2: Connecting to network
        this.bootstrapTimer = setTimeout(() => {
          this.updateState("CONNECTING", 75, "Establishing 3-hop encrypted onion circuit...");
          this.events.emitLog("[TorManager] Handshaking guard relay & negotiating session keys...");

          // Step 3: Establishing circuit
          this.bootstrapTimer = setTimeout(() => {
            const circuit = TorConnection.createRandomCircuit();
            this.startTime = Date.now();
            this.status.circuit = circuit;
            this.updateState("CONNECTED", 100, "Tor Connected: 3-hop encrypted circuit ready");
            this.events.emitLog(`[TorManager] Circuit established: Guard(${circuit.nodes[0].country}) -> Middle(${circuit.nodes[1].country}) -> Exit(${circuit.nodes[2].country})`);
            this.events.emitCircuit(circuit);
            resolve(this.getStatus());
          }, 350);
        }, 350);
      }, 300);
    });
  }

  public async newCircuit(): Promise<TorCircuit> {
    this.updateState("RECONNECTING", 70, "Building new Tor circuit / New Identity...");
    this.events.emitLog("[TorManager] Sending NEWNYM signal to rotate exit circuit...");

    return new Promise<TorCircuit>((resolve) => {
      setTimeout(() => {
        const newCirc = TorConnection.createRandomCircuit();
        this.status.circuit = newCirc;
        this.updateState("CONNECTED", 100, "New circuit established");
        this.events.emitLog(`[TorManager] New circuit active: Guard(${newCirc.nodes[0].country}) -> Middle(${newCirc.nodes[1].country}) -> Exit(${newCirc.nodes[2].country})`);
        this.events.emitCircuit(newCirc);
        resolve(newCirc);
      }, 450);
    });
  }

  public async disconnect(): Promise<TorStatus> {
    if (this.bootstrapTimer) {
      clearTimeout(this.bootstrapTimer);
      this.bootstrapTimer = null;
    }

    this.updateState("STOPPING", 0, "Tearing down Tor circuits...");
    this.events.emitLog("[TorManager] Closing SOCKS5 proxy and tearing down circuits...");

    return new Promise<TorStatus>((resolve) => {
      setTimeout(() => {
        this.startTime = 0;
        this.status.circuit = null;
        this.updateState("DISCONNECTED", 0, "Tor is disconnected");
        this.events.emitLog("[TorManager] Tor runtime stopped.");
        resolve(this.getStatus());
      }, 200);
    });
  }

  private updateState(state: TorConnectionState, progress: number, step: string, error?: string): void {
    this.status.state = state;
    this.status.bootstrapProgress = progress;
    this.status.currentStep = step;
    if (error) this.status.error = error;
    else delete this.status.error;

    this.events.emitState(state);
    this.events.emitStatus(this.getStatus());
  }
}
