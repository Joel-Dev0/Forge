import { create } from "zustand";
import { useTabsStore, type Tab } from "../tabs/useTabsStore";

export interface ProjectWorkspace {
  id: string;
  name: string;
  color: string;
  description?: string;
  tabs: Tab[];
  activeTabId: string;
  envVars: Record<string, string>;
  notes: string;
  createdAt: number;
}

interface WorkspacesState {
  workspaces: ProjectWorkspace[];
  activeWorkspaceId: string;

  createWorkspace: (name: string, color?: string, description?: string) => string;
  switchWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  updateWorkspace: (id: string, patch: Partial<ProjectWorkspace>) => void;
  setEnvVar: (workspaceId: string, key: string, value: string) => void;
  deleteEnvVar: (workspaceId: string, key: string) => void;
  setNotes: (workspaceId: string, notes: string) => void;
  getActiveWorkspace: () => ProjectWorkspace;
}

const STORAGE_KEY = "forge_workspaces_v1";

const DEFAULT_WORKSPACES: ProjectWorkspace[] = [
  {
    id: "ws-default",
    name: "Default Project",
    color: "#FF6B00",
    description: "General browsing & primary workspace",
    tabs: [
      {
        id: "tab-1",
        title: "New Tab",
        url: "about:blank",
        favicon: "",
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
      },
    ],
    activeTabId: "tab-1",
    envVars: {
      API_HOST: "https://api.example.com",
      PORT: "3000",
    },
    notes: "# Project Scratchpad\n- Verify API responses\n- Check performance metrics",
    createdAt: Date.now(),
  },
  {
    id: "ws-client",
    name: "Client Portal",
    color: "#0EA5E9",
    description: "Frontend & API integration testing",
    tabs: [
      {
        id: "tab-client-1",
        title: "GitHub",
        url: "https://github.com",
        favicon: "",
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
      },
    ],
    activeTabId: "tab-client-1",
    envVars: {
      STAGE: "development",
      CLIENT_ID: "forge-dev-001",
    },
    notes: "Client sprint deliverables and review links.",
    createdAt: Date.now(),
  },
];

function loadSavedWorkspaces(): { workspaces: ProjectWorkspace[]; activeWorkspaceId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.workspaces) && parsed.workspaces.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return { workspaces: DEFAULT_WORKSPACES, activeWorkspaceId: DEFAULT_WORKSPACES[0].id };
}

function persistState(workspaces: ProjectWorkspace[], activeWorkspaceId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ workspaces, activeWorkspaceId }));
  } catch {}
}

export const useWorkspacesStore = create<WorkspacesState>((set, get) => {
  const initial = loadSavedWorkspaces();

  return {
    workspaces: initial.workspaces,
    activeWorkspaceId: initial.activeWorkspaceId,

    getActiveWorkspace() {
      const { workspaces, activeWorkspaceId } = get();
      return workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
    },

    createWorkspace(name, color = "#FF6B00", description = "") {
      const id = `ws-${Date.now()}`;
      const newWs: ProjectWorkspace = {
        id,
        name,
        color,
        description,
        tabs: [
          {
            id: `tab-${Date.now()}`,
            title: "New Tab",
            url: "about:blank",
            favicon: "",
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
          },
        ],
        activeTabId: `tab-${Date.now()}`,
        envVars: {},
        notes: "",
        createdAt: Date.now(),
      };

      set((s) => {
        const next = [...s.workspaces, newWs];
        persistState(next, s.activeWorkspaceId);
        return { workspaces: next };
      });

      return id;
    },

    switchWorkspace(targetId) {
      const { workspaces, activeWorkspaceId } = get();
      if (targetId === activeWorkspaceId) return;

      const currentTabsStore = useTabsStore.getState();

      // 1. Snapshot current workspace tabs
      const updatedWorkspaces = workspaces.map((w) =>
        w.id === activeWorkspaceId
          ? {
              ...w,
              tabs: currentTabsStore.tabs,
              activeTabId: currentTabsStore.activeTabId,
            }
          : w
      );

      // 2. Find target workspace
      const target = updatedWorkspaces.find((w) => w.id === targetId);
      if (!target) return;

      // 3. Hydrate TabsStore with target workspace tabs
      useTabsStore.setState({
        tabs: target.tabs.length > 0 ? target.tabs : [
          {
            id: `tab-${Date.now()}`,
            title: "New Tab",
            url: "about:blank",
            favicon: "",
            isLoading: false,
            canGoBack: false,
            canGoForward: false,
          }
        ],
        activeTabId: target.activeTabId || target.tabs[0]?.id || "tab-1",
      });

      set({
        workspaces: updatedWorkspaces,
        activeWorkspaceId: targetId,
      });

      persistState(updatedWorkspaces, targetId);
    },

    deleteWorkspace(id) {
      const { workspaces, activeWorkspaceId } = get();
      if (workspaces.length <= 1) return; // do not delete only workspace

      const nextWorkspaces = workspaces.filter((w) => w.id !== id);
      const nextActiveId = activeWorkspaceId === id ? nextWorkspaces[0].id : activeWorkspaceId;

      if (activeWorkspaceId === id) {
        get().switchWorkspace(nextActiveId);
      } else {
        set({ workspaces: nextWorkspaces });
        persistState(nextWorkspaces, nextActiveId);
      }
    },

    updateWorkspace(id, patch) {
      set((s) => {
        const next = s.workspaces.map((w) => (w.id === id ? { ...w, ...patch } : w));
        persistState(next, s.activeWorkspaceId);
        return { workspaces: next };
      });
    },

    setEnvVar(workspaceId, key, value) {
      set((s) => {
        const next = s.workspaces.map((w) => {
          if (w.id !== workspaceId) return w;
          return {
            ...w,
            envVars: { ...w.envVars, [key]: value },
          };
        });
        persistState(next, s.activeWorkspaceId);
        return { workspaces: next };
      });
    },

    deleteEnvVar(workspaceId, key) {
      set((s) => {
        const next = s.workspaces.map((w) => {
          if (w.id !== workspaceId) return w;
          const envs = { ...w.envVars };
          delete envs[key];
          return { ...w, envVars: envs };
        });
        persistState(next, s.activeWorkspaceId);
        return { workspaces: next };
      });
    },

    setNotes(workspaceId, notes) {
      set((s) => {
        const next = s.workspaces.map((w) => (w.id === workspaceId ? { ...w, notes } : w));
        persistState(next, s.activeWorkspaceId);
        return { workspaces: next };
      });
    },
  };
});