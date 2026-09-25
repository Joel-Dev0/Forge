import { create } from "zustand";

export type SessionMode = "normal" | "private" | "tor";

export interface Session {
  id: string; // "default", "personal", "work", "admin", "finance", "private", "tor", or custom ID
  name: string;
  icon: string; // Lucide icon identifier
  color: string; // Hex badge/accent color
  createdAt: number;
  lastUsedAt: number;
  mode?: SessionMode; // "normal" | "private" | "tor"
  temporary?: boolean; // true for private and tor sessions (RAM-only, destroyed on close)
  settings: {
    defaultSearchEngine?: string;
    userAgent?: string;
    adblockLevel?: "strict" | "standard";
  };
  browserData: {
    cacheBytes?: number;
    cookieCount?: number;
  };
  partition: string; // "persist:..." for normal sessions, or "private_..." / "tor_..." for in-memory sessions
}

interface SessionsState {
  sessions: Session[];
  activeSessionId: string;
  isSessionModalOpen: boolean;
  setSessionModalOpen: (open: boolean) => void;
  createSession: (name: string, color: string, icon?: string, settings?: Session["settings"], mode?: SessionMode) => string;
  createPrivateSession: (mode: "private" | "tor", name?: string) => Promise<Session>;
  updateSession: (id: string, patch: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  touchSession: (id: string) => void;
  clearSessionData: (id: string, types?: ("cache" | "cookies" | "storage")[]) => Promise<void>;
  getSession: (id?: string) => Session;
}

const STORAGE_KEY = "forge_sessions_v1";

export const BUILTIN_SESSIONS: Session[] = [
  {
    id: "default",
    name: "General",
    icon: "Globe",
    color: "#FF6B00",
    createdAt: 1700000000000,
    lastUsedAt: Date.now(),
    mode: "normal",
    temporary: false,
    settings: { adblockLevel: "standard" },
    browserData: {},
    partition: "persist:forge",
  },
  {
    id: "personal",
    name: "Personal",
    icon: "User",
    color: "#3B82F6",
    createdAt: 1700000000000,
    lastUsedAt: Date.now(),
    mode: "normal",
    temporary: false,
    settings: { adblockLevel: "standard" },
    browserData: {},
    partition: "persist:session_personal",
  },
  {
    id: "work",
    name: "Work",
    icon: "Briefcase",
    color: "#10B981",
    createdAt: 1700000000000,
    lastUsedAt: Date.now(),
    mode: "normal",
    temporary: false,
    settings: { adblockLevel: "standard" },
    browserData: {},
    partition: "persist:session_work",
  },
  {
    id: "admin",
    name: "Admin / Dev",
    icon: "ShieldAlert",
    color: "#EF4444",
    createdAt: 1700000000000,
    lastUsedAt: Date.now(),
    mode: "normal",
    temporary: false,
    settings: { adblockLevel: "strict" },
    browserData: {},
    partition: "persist:session_admin",
  },
  {
    id: "finance",
    name: "Banking & Finance",
    icon: "Landmark",
    color: "#F59E0B",
    createdAt: 1700000000000,
    lastUsedAt: Date.now(),
    mode: "normal",
    temporary: false,
    settings: { adblockLevel: "strict" },
    browserData: {},
    partition: "persist:session_finance",
  },
  {
    id: "private",
    name: "Private Window",
    icon: "EyeOff",
    color: "#A855F7", // Purple/Violet
    createdAt: 1700000000000,
    lastUsedAt: Date.now(),
    mode: "private",
    temporary: true,
    settings: { adblockLevel: "strict" },
    browserData: {},
    partition: "private_session_default", // in-memory only (no "persist:" prefix)
  },
  {
    id: "tor",
    name: "Tor Mode",
    icon: "Shield",
    color: "#EAB308", // Amber / Gold Onion
    createdAt: 1700000000000,
    lastUsedAt: Date.now(),
    mode: "tor",
    temporary: true,
    settings: { adblockLevel: "strict" },
    browserData: {},
    partition: "tor_session_default", // in-memory only + SOCKS5 routed
  },
];

const isIncognito =
  typeof window !== "undefined" &&
  Boolean(
    window.location.search.includes("incognito") ||
    window.location.search.includes("private")
  );

function loadSavedSessions(): { sessions: Session[]; activeSessionId: string } {
  if (isIncognito) {
    return { sessions: BUILTIN_SESSIONS, activeSessionId: "private" };
  }
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { sessions: BUILTIN_SESSIONS, activeSessionId: "default" };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: BUILTIN_SESSIONS, activeSessionId: "default" };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
      // Keep persistent sessions and ensure builtin private and tor are present
      const persistent = parsed.sessions.filter((s: Session) => !s.temporary);
      const builtins = BUILTIN_SESSIONS.filter((b) => !persistent.some((p: Session) => p.id === b.id));
      const sessions = [...persistent, ...builtins];
      return {
        sessions,
        activeSessionId: parsed.activeSessionId || "default",
      };
    }
  } catch {}
  return { sessions: BUILTIN_SESSIONS, activeSessionId: "default" };
}

function persistSessions(sessions: Session[], activeSessionId: string) {
  if (isIncognito) return;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      // Never persist temporary private or tor sessions across restarts
      const persistentSessions = sessions.filter((s) => !s.temporary);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions: persistentSessions, activeSessionId }));
    }
  } catch {}
}

const initial = loadSavedSessions();

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: initial.sessions,
  activeSessionId: initial.activeSessionId,
  isSessionModalOpen: false,

  setSessionModalOpen(open) {
    set({ isSessionModalOpen: open });
  },

  createSession(name, color, icon = "Box", settings = {}, mode = "normal") {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSession: Session = {
      id,
      name: name.trim() || "New Container",
      icon,
      color,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      mode,
      temporary: mode !== "normal",
      settings,
      browserData: {},
      partition: mode === "normal" ? `persist:${id}` : `${mode}_session_${id}`,
    };

    const nextSessions = [...get().sessions, newSession];
    set({ sessions: nextSessions, activeSessionId: id });
    persistSessions(nextSessions, id);
    return id;
  },

  async createPrivateSession(mode: "private" | "tor", name?: string) {
    let created: any = null;
    try {
      if ((window as any).forge?.privacy?.createSession) {
        created = await (window as any).forge.privacy.createSession(mode, name);
      }
    } catch {}

    const randomSuffix = Math.random().toString(36).slice(2, 6);
    const id = created?.id || `${mode}_${Date.now()}_${randomSuffix}`;
    const partition = created?.partition || `${mode}_session_${Date.now()}_${randomSuffix}`;
    const defaultName = mode === "tor" ? "Tor Mode" : "Private Window";
    const color = mode === "tor" ? "#EAB308" : "#A855F7";
    const icon = mode === "tor" ? "Shield" : "EyeOff";

    const newSession: Session = {
      id,
      name: name || defaultName,
      icon,
      color,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      mode,
      temporary: true,
      settings: { adblockLevel: "strict" },
      browserData: {},
      partition,
    };

    const nextSessions = [...get().sessions.filter((s) => s.id !== id), newSession];
    set({ sessions: nextSessions, activeSessionId: id });
    return newSession;
  },

  updateSession(id, patch) {
    if (id === "default" && patch.id) delete patch.id; // protect default id
    const nextSessions = get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));
    set({ sessions: nextSessions });
    persistSessions(nextSessions, get().activeSessionId);
  },

  deleteSession(id) {
    if (id === "default" || id === "private" || id === "tor") return; // cannot delete builtins
    const session = get().sessions.find((s) => s.id === id);
    const filtered = get().sessions.filter((s) => s.id !== id);
    const nextActive = get().activeSessionId === id ? "default" : get().activeSessionId;

    try {
      if (session?.temporary) {
        (window as any).forge?.privacy?.destroySession?.(id);
      } else {
        const partition = session?.partition || `persist:${id}`;
        (window as any).forge?.sessions?.clearData?.(partition, ["cache", "cookies", "storage"]);
      }
    } catch {}

    set({ sessions: filtered, activeSessionId: nextActive });
    persistSessions(filtered, nextActive);
  },

  setActiveSession(id) {
    const target = get().sessions.find((s) => s.id === id);
    if (!target) return;
    const nextSessions = get().sessions.map((s) =>
      s.id === id ? { ...s, lastUsedAt: Date.now() } : s
    );
    set({ sessions: nextSessions, activeSessionId: id });
    persistSessions(nextSessions, id);
  },

  touchSession(id) {
    const nextSessions = get().sessions.map((s) =>
      s.id === id ? { ...s, lastUsedAt: Date.now() } : s
    );
    set({ sessions: nextSessions });
    persistSessions(nextSessions, get().activeSessionId);
  },

  async clearSessionData(id, types = ["cache", "cookies", "storage"]) {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return;
    try {
      if (session.temporary) {
        await (window as any).forge?.privacy?.destroySession?.(session.id);
      } else if ((window as any).forge?.sessions?.clearData) {
        await (window as any).forge.sessions.clearData(session.partition, types);
      }
    } catch (err) {
      console.error("[SessionsStore] Failed to clear session data:", err);
    }
  },

  getSession(id) {
    const currentId = id || get().activeSessionId;
    const found = get().sessions.find((s) => s.id === currentId);
    if (found) return found;

    if (currentId === "private" || currentId?.startsWith("private_")) {
      return BUILTIN_SESSIONS.find((b) => b.id === "private") || BUILTIN_SESSIONS[0];
    }
    if (currentId === "tor" || currentId?.startsWith("tor_")) {
      return BUILTIN_SESSIONS.find((b) => b.id === "tor") || BUILTIN_SESSIONS[0];
    }

    return get().sessions[0] || BUILTIN_SESSIONS[0];
  },
}));
