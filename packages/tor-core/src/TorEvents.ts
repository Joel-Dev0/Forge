import { type TorStatus, type TorCircuit, type TorConnectionState } from "./TorState.ts";

export type TorStatusListener = (status: TorStatus) => void;
export type TorCircuitListener = (circuit: TorCircuit) => void;
export type TorStateListener = (state: TorConnectionState) => void;
export type TorLogListener = (line: string) => void;

export class TorEvents {
  private statusListeners = new Set<TorStatusListener>();
  private circuitListeners = new Set<TorCircuitListener>();
  private stateListeners = new Set<TorStateListener>();
  private logListeners = new Set<TorLogListener>();

  public onStatus(fn: TorStatusListener): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  public onCircuit(fn: TorCircuitListener): () => void {
    this.circuitListeners.add(fn);
    return () => this.circuitListeners.delete(fn);
  }

  public onState(fn: TorStateListener): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  public onStateChanged(fn: TorStateListener): () => void {
    return this.onState(fn);
  }

  public onStatusChanged(fn: TorStatusListener): () => void {
    return this.onStatus(fn);
  }

  public onCircuitChanged(fn: TorCircuitListener): () => void {
    return this.onCircuit(fn);
  }

  public onLog(fn: TorLogListener): () => void {
    this.logListeners.add(fn);
    return () => this.logListeners.delete(fn);
  }

  public emitStatus(status: TorStatus): void {
    for (const fn of this.statusListeners) {
      try { fn(status); } catch {}
    }
  }

  public emitCircuit(circuit: TorCircuit): void {
    for (const fn of this.circuitListeners) {
      try { fn(circuit); } catch {}
    }
  }

  public emitState(state: TorConnectionState): void {
    for (const fn of this.stateListeners) {
      try { fn(state); } catch {}
    }
  }

  public emitLog(line: string): void {
    for (const fn of this.logListeners) {
      try { fn(line); } catch {}
    }
  }
}
