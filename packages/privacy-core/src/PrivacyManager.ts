import { PrivateSession, type PrivateSessionConfig } from "./PrivateSession.ts";
import { type BrowsingMode } from "./PrivacyPolicy.ts";

export type SessionCleanupHandler = (partition: string) => Promise<void>;

export class PrivacyManager {
  private static instance: PrivacyManager | null = null;
  private sessions: Map<string, PrivateSession> = new Map();
  private cleanupHandler: SessionCleanupHandler | null = null;

  public static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  public setCleanupHandler(handler: SessionCleanupHandler): void {
    this.cleanupHandler = handler;
  }

  public createPrivateSession(mode: "private" | "tor", name?: string): PrivateSession {
    const session = new PrivateSession({ mode, name });
    this.sessions.set(session.id, session);
    return session;
  }

  public getSession(id: string): PrivateSession | undefined {
    return this.sessions.get(id);
  }

  public getSessionByPartition(partition: string): PrivateSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.partition === partition) return session;
    }
    return undefined;
  }

  public getAllSessions(): PrivateSession[] {
    return Array.from(this.sessions.values()).filter((s) => !s.isDestroyed);
  }

  public getActiveSessionsByMode(mode: BrowsingMode): PrivateSession[] {
    return this.getAllSessions().filter((s) => s.mode === mode);
  }

  public registerTab(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.registerTab();
    }
  }

  public async unregisterTab(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const remaining = session.unregisterTab();
    // If no more tabs are using this private session, automatically destroy temporary storage
    if (remaining === 0) {
      await this.destroySession(sessionId);
      return true;
    }
    return false;
  }

  public async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.isDestroyed) return;

    session.markDestroyed();
    this.sessions.delete(sessionId);

    if (this.cleanupHandler) {
      try {
        await this.cleanupHandler(session.partition);
      } catch (err) {
        console.warn(`[PrivacyManager] Error cleaning up partition ${session.partition}:`, err);
      }
    }
  }

  public async destroyAll(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    for (const id of sessionIds) {
      await this.destroySession(id);
    }
  }
}
