import { create } from "zustand";

export interface Session {
  id: string; // "default", "personal", "work", "admin", "finance", or custom ID
  name: string;
  icon: string; // Lucide icon identifier
  color: string; // Hex badge/accent color
  createdAt: number;
  lastUsedAt: number;
  settings: {
    defaultSearchEngine?: string;
    userAgent?: string;
    adblockLevel?: "strict" | "standard";
  };
  browserData: {
    cacheBytes?: number;
    cookieCount?: number;
  };
  partition: string; // "persist:forge" or "persist:session_<id>"
}

interface SessionsState {
  sessions: Session[];
  activeSessionId: string;
  isSessionModalOpen: boolean;
  setSessionModalOpen: (open: boolean) => void;
  createSession: (name: string, color: string, icon?: string, settings?: Session["settings"]) => string;
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
    settings: { adblockLevel: "strict" },
    browserData: {},
    partition: "persist:session_finance",
  },
];

function loadSavedSessions(): { sessions: Session[]; activeSessionId: string } {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return { sessions: BUILTIN_SESSIONS, activeSessionId: "default" };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: BUILTIN_SESSIONS, activeSessionId: "default" };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
      const hasDefault = parsed.sessions.some((s: any) => s.id === "default");
      const sessions = hasDefault ? parsed.sessions : [BUILTIN_SESSIONS[0], ...parsed.sessions];
      return {
        sessions,
        activeSessionId: parsed.activeSessionId || "default",
      };
    }
  } catch {}
  return { sessions: BUILTIN_SESSIONS, activeSessionId: "default" };
}

function persistSessions(sessions: Session[], activeSessionId: string) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, activeSessionId }));
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

  createSession(name, color, icon = "Box", settings = {}) {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSession: Session = {
      id,
      name: name.trim() || "New Container",
      icon,
      color,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      settings,
      browserData: {},
      partition: `persist:${id}`,
    };

    const nextSessions = [...get().sessions, newSession];
    set({ sessions: nextSessions, activeSessionId: id });
    persistSessions(nextSessions, id);
    return id;
  },

  updateSession(id, patch) {
    if (id === "default" && patch.id) delete patch.id; // protect default id
    const nextSessions = get().sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));
    set({ sessions: nextSessions });
    persistSessions(nextSessions, get().activeSessionId);
  },

  deleteSession(id) {
    if (id === "default") return; // cannot delete default session
    const filtered = get().sessions.filter((s) => s.id !== id);
    const nextActive = get().activeSessionId === id ? "default" : get().activeSessionId;

    try {
      const partition = `persist:${id}`;
      (window as any).forge?.sessions?.clearData?.(partition, ["cache", "cookies", "storage"]);
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
      if ((window as any).forge?.sessions?.clearData) {
        await (window as any).forge.sessions.clearData(session.partition, types);
      }
    } catch (err) {
      console.error("[SessionsStore] Failed to clear session data:", err);
    }
  },

  getSession(id) {
    const currentId = id || get().activeSessionId;
    return get().sessions.find((s) => s.id === currentId) || BUILTIN_SESSIONS[0];
  },
}));
