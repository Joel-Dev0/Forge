import { type BrowsingMode, type PrivacyPolicy, getPrivacyPolicyForMode } from "./PrivacyPolicy.ts";

export interface PrivateSessionConfig {
  id?: string;
  mode: "private" | "tor";
  name?: string;
  customPartition?: string;
}

export class PrivateSession {
  public readonly id: string;
  public readonly mode: "private" | "tor";
  public readonly name: string;
  public readonly partition: string;
  public readonly createdAt: number;
  public readonly policy: PrivacyPolicy;
  public readonly temporary: boolean = true;
  public activeTabCount: number = 0;
  public isDestroyed: boolean = false;

  constructor(config: PrivateSessionConfig) {
    this.mode = config.mode;
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const timestamp = Date.now();
    this.id = config.id || `${this.mode}_${timestamp}_${randomSuffix}`;
    this.name = config.name || (this.mode === "tor" ? "Tor Private Window" : "Private Window");
    
    // In Electron/Chromium, any partition WITHOUT "persist:" prefix is purely in-memory!
    // Example: "private_session_17000000_abc" or "tor_session_17000000_abc"
    this.partition = config.customPartition || `${this.mode}_session_${timestamp}_${randomSuffix}`;
    this.createdAt = timestamp;
    this.policy = getPrivacyPolicyForMode(this.mode);
  }

  public registerTab(): void {
    if (this.isDestroyed) {
      throw new Error(`Cannot register tab in destroyed private session ${this.id}`);
    }
    this.activeTabCount++;
  }

  public unregisterTab(): number {
    this.activeTabCount = Math.max(0, this.activeTabCount - 1);
    return this.activeTabCount;
  }

  public markDestroyed(): void {
    this.isDestroyed = true;
    this.activeTabCount = 0;
  }
}
