import { create } from "zustand";

export interface LocalhostAlias {
  port: number;
  alias: string;
  environment: "local" | "staging" | "dev" | "mock" | "production";
  color: string; // Hex color for badge
}

interface LocalhostAliasesState {
  aliases: Record<number, LocalhostAlias>;
  isModalOpen: boolean;

  setModalOpen: (open: boolean) => void;
  setAlias: (port: number, alias: string, env?: LocalhostAlias["environment"], color?: string) => void;
  removeAlias: (port: number) => void;
  getAliasForUrl: (url: string) => LocalhostAlias | null;
}

const STORAGE_KEY = "forge_localhost_aliases_v1";

const DEFAULT_ALIASES: Record<number, LocalhostAlias> = {
  3000: { port: 3000, alias: "SafeLedger - Local", environment: "local", color: "#10B981" },
  5173: { port: 5173, alias: "SafeLedger - Staging", environment: "staging", color: "#F59E0B" },
  8080: { port: 8080, alias: "Auth Core - Local", environment: "local", color: "#3B82F6" },
  8000: { port: 8000, alias: "Data Pipeline", environment: "dev", color: "#06B6D4" },
  4200: { port: 4200, alias: "Admin Console", environment: "dev", color: "#8B5CF6" },
};

function loadSavedAliases(): Record<number, LocalhostAlias> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_ALIASES;
}

export const useLocalhostAliasesStore = create<LocalhostAliasesState>((set, get) => ({
  aliases: loadSavedAliases(),
  isModalOpen: false,

  setModalOpen: (open) => set({ isModalOpen: open }),

  setAlias: (port, alias, env = "local", color = "#10B981") => {
    set((s) => {
      const updated = {
        ...s.aliases,
        [port]: { port, alias, environment: env, color },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { aliases: updated };
    });
  },

  removeAlias: (port) => {
    set((s) => {
      const copy = { ...s.aliases };
      delete copy[port];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
      } catch {}
      return { aliases: copy };
    });
  },

  getAliasForUrl: (url: string) => {
    if (!url) return null;
    const match = url.match(/^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1):(\d+)/i);
    if (match) {
      const port = parseInt(match[1], 10);
      return get().aliases[port] || null;
    }
    return null;
  },
}));
