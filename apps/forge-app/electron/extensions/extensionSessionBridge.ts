/**
 * Extension Session Bridge
 *
 * Replaces the hardcoded NAMED_PARTITIONS array in extensionManager.ts
 * with a dynamic registry that automatically tracks all active sessions.
 *
 * Integrates with SessionManager — whenever a partition is configured,
 * it registers here. Extensions are loaded into eligible sessions.
 *
 * Private and Tor sessions are excluded by design: extensions should
 * not run in those contexts for privacy/security reasons.
 */

import { session, type Session as ElectronSession } from "electron";

export interface SessionRegistration {
  partition: string;
  session: ElectronSession;
  registeredAt: number;
  extensionsLoaded: Set<string>; // extension IDs loaded into this session
}

class ExtensionSessionBridge {
  private sessions = new Map<string, SessionRegistration>();
  private static instance: ExtensionSessionBridge;

  static getInstance(): ExtensionSessionBridge {
    if (!ExtensionSessionBridge.instance) {
      ExtensionSessionBridge.instance = new ExtensionSessionBridge();
    }
    return ExtensionSessionBridge.instance;
  }

  /**
   * Register a session partition as eligible for extensions.
   * Called by SessionManager when a partition is configured,
   * and by the extension system on startup for default partitions.
   */
  registerSession(partition: string, ses: ElectronSession): void {
    if (this.isExcludedPartition(partition)) {
      return;
    }

    if (this.sessions.has(partition)) {
      return; // Already registered
    }

    this.sessions.set(partition, {
      partition,
      session: ses,
      registeredAt: Date.now(),
      extensionsLoaded: new Set(),
    });

    console.log(`[ExtensionSessionBridge] Registered partition: ${partition}`);
  }

  /**
   * Unregister a session partition (e.g. when session is destroyed).
   */
  unregisterSession(partition: string): void {
    if (this.sessions.delete(partition)) {
      console.log(`[ExtensionSessionBridge] Unregistered partition: ${partition}`);
    }
  }

  /**
   * Get all sessions that are eligible for extension loading.
   * Excludes private, tor, and non-persistent sessions.
   */
  getExtensionEligibleSessions(): Map<string, SessionRegistration> {
    return new Map(this.sessions);
  }

  /**
   * Get a specific session registration by partition name.
   */
  getSession(partition: string): SessionRegistration | undefined {
    return this.sessions.get(partition);
  }

  /**
   * Load an extension directory into ALL eligible sessions.
   * Returns a map of partition → success/failure.
   */
  async loadExtensionIntoAll(
    extDir: string,
    extId: string
  ): Promise<Map<string, { success: boolean; error?: string }>> {
    const results = new Map<string, { success: boolean; error?: string }>();

    // Always include default session
    try {
      await session.defaultSession.loadExtension(extDir, { allowFileAccess: true });
      results.set("default", { success: true });
    } catch (err: any) {
      results.set("default", { success: false, error: err?.message });
    }

    // Load into every registered partition
    for (const [partition, reg] of this.sessions) {
      try {
        await reg.session.loadExtension(extDir, { allowFileAccess: true });
        reg.extensionsLoaded.add(extId);
        results.set(partition, { success: true });
      } catch (err: any) {
        results.set(partition, { success: false, error: err?.message });
      }
    }

    return results;
  }

  /**
   * Remove an extension from ALL registered sessions.
   */
  removeExtensionFromAll(extId: string): void {
    try {
      session.defaultSession.removeExtension(extId);
    } catch {}

    for (const [, reg] of this.sessions) {
      try {
        reg.session.removeExtension(extId);
        reg.extensionsLoaded.delete(extId);
      } catch {}
    }
  }

  /**
   * When a new session is created dynamically (e.g. user creates a new Local Session),
   * register it and load all currently installed extensions into it.
   *
   * @param partition - The partition name
   * @param ses - The Electron session
   * @param installedExtDirs - Map of extId → directory path for all installed extensions
   */
  async onNewSessionCreated(
    partition: string,
    ses: ElectronSession,
    installedExtDirs: Map<string, string>
  ): Promise<void> {
    if (this.isExcludedPartition(partition)) return;

    this.registerSession(partition, ses);

    const reg = this.sessions.get(partition);
    if (!reg) return;

    // Load all currently installed extensions into the new session
    for (const [extId, extDir] of installedExtDirs) {
      try {
        await ses.loadExtension(extDir, { allowFileAccess: true });
        reg.extensionsLoaded.add(extId);
      } catch (err: any) {
        console.warn(`[ExtensionSessionBridge] Failed to load ${extId} into ${partition}:`, err?.message);
      }
    }
  }

  /**
   * Get a summary of all sessions and their loaded extensions.
   * Used by the diagnostics system.
   */
  getSummary(): {
    partition: string;
    registeredAt: number;
    extensionCount: number;
    extensionIds: string[];
  }[] {
    const result: {
      partition: string;
      registeredAt: number;
      extensionCount: number;
      extensionIds: string[];
    }[] = [];

    for (const [partition, reg] of this.sessions) {
      result.push({
        partition,
        registeredAt: reg.registeredAt,
        extensionCount: reg.extensionsLoaded.size,
        extensionIds: Array.from(reg.extensionsLoaded),
      });
    }

    return result;
  }

  /**
   * Check if a partition should be excluded from extension loading.
   * Private and Tor sessions are excluded for privacy/security.
   */
  private isExcludedPartition(partition: string): boolean {
    if (partition.startsWith("private_") || partition.startsWith("tor_")) return true;
    if (!partition.startsWith("persist:")) return true;
    return false;
  }
}

export { ExtensionSessionBridge };
