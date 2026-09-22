import { create } from "zustand";
import { type ProjectManifest, type ProjectEcosystem } from "./projectScanner";
import { useTabsStore } from "../tabs/useTabsStore";
import { useTerminalStore } from "../terminal/useTerminalStore";

export interface RunningProcess {
  projectPath: string;
  scriptName: string;
  command: string;
  status: "running" | "stopped" | "error";
  logs: string[];
  detectedPort?: number;
  startTime: number;
}

interface ProjectsState {
  projects: ProjectManifest[];
  selectedProjectPath: string | null;
  activeEcosystemFilter: "all" | ProjectEcosystem;
  runningProcesses: Record<string, RunningProcess>; // key = `${projectPath}:${scriptName}`
  isDashboardOpen: boolean;

  setDashboardOpen: (open: boolean) => void;
  setSelectedProject: (path: string | null) => void;
  setEcosystemFilter: (filter: "all" | ProjectEcosystem) => void;

  // Actions
  scanWorkspace: () => Promise<void>;
  addProjectManually: (project: ProjectManifest) => void;
  runProjectScript: (projectPath: string, scriptName: string) => Promise<void>;
  stopProjectScript: (projectPath: string, scriptName: string) => void;
  bindPortToBrowserTab: (port: number, title?: string) => void;
}

const STORAGE_KEY = "forge_detected_projects_v1";

const DEFAULT_PROJECTS: ProjectManifest[] = [
  {
    name: "Forge (Monorepo)",
    version: "1.0.0",
    ecosystem: "node",
    framework: "Vite + Next.js",
    packageManager: "pnpm",
    scripts: {
      dev: "pnpm --filter forge-app dev",
      build: "pnpm --filter forge-app build",
      lint: "pnpm lint",
      site: "pnpm --filter forge-site dev",
    },
    path: "C:\\Users\\josed\\Documents\\Rerpositories\\Forge",
    gitBranch: "main",
    isGitDirty: false,
    activePort: 5173,
  },
  {
    name: "SafeLedger Core",
    version: "0.8.4",
    ecosystem: "rust",
    framework: "Actix-Web",
    packageManager: "cargo",
    scripts: {
      dev: "cargo run",
      build: "cargo build --release",
      test: "cargo test",
    },
    path: "C:\\Users\\josed\\Documents\\Repositories\\SafeLedger",
    gitBranch: "feature/auth-v2",
    isGitDirty: true,
    activePort: 8080,
  },
  {
    name: "DataPipeline Agent",
    version: "2.1.0",
    ecosystem: "python",
    framework: "FastAPI",
    packageManager: "poetry",
    scripts: {
      dev: "poetry run uvicorn app:main --port 8000 --reload",
      test: "poetry run pytest",
    },
    path: "C:\\Users\\josed\\Documents\\Repositories\\DataPipeline",
    gitBranch: "develop",
    isGitDirty: false,
    activePort: 8000,
  },
];

function loadSavedProjects(): ProjectManifest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PROJECTS;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: loadSavedProjects(),
  selectedProjectPath: DEFAULT_PROJECTS[0].path,
  activeEcosystemFilter: "all",
  runningProcesses: {},
  isDashboardOpen: false,

  setDashboardOpen: (open) => set({ isDashboardOpen: open }),
  setSelectedProject: (path) => set({ selectedProjectPath: path }),
  setEcosystemFilter: (filter) => set({ activeEcosystemFilter: filter }),

  scanWorkspace: async () => {
    // In production Electron, scans default workspace folders
    try {
      const bridge = (window as any).forge?.terminal;
      if (bridge?.exec) {
        // Query git status for existing projects
        for (const prj of get().projects) {
          bridge.exec("git rev-parse --abbrev-ref HEAD", "powershell").then((res: any) => {
            if (res?.stdout) {
              const branch = res.stdout.trim();
              set((s) => ({
                projects: s.projects.map((p) => (p.path === prj.path ? { ...p, gitBranch: branch } : p)),
              }));
            }
          }).catch(() => {});
        }
      }
    } catch {}
  },

  addProjectManually: (project) => {
    set((s) => {
      const exists = s.projects.some((p) => p.path === project.path);
      const updated = exists
        ? s.projects.map((p) => (p.path === project.path ? project : p))
        : [...s.projects, project];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { projects: updated, selectedProjectPath: project.path };
    });
  },

  runProjectScript: async (projectPath, scriptName) => {
    const project = get().projects.find((p) => p.path === projectPath);
    if (!project) return;

    const command = project.scripts[scriptName] || `${project.packageManager} run ${scriptName}`;
    const procKey = `${projectPath}:${scriptName}`;

    set((s) => ({
      runningProcesses: {
        ...s.runningProcesses,
        [procKey]: {
          projectPath,
          scriptName,
          command,
          status: "running",
          logs: [`[Forge Runner] Spawning '${command}' in ${projectPath}...`],
          startTime: Date.now(),
        },
      },
    }));

    // Execute via terminal store or bridge
    try {
      const termStore = useTerminalStore.getState();
      termStore.setCwd(projectPath);

      const execPromise = termStore.execSystemCommand(command);

      // Simulate live log arrival and port extraction
      const portRegex = /(?:localhost|127\.0\.0\.1|port)\s*[:= ]\s*(\d{4,5})/i;

      execPromise.then((res) => {
        const fullOutput = `${res.stdout}\n${res.stderr}`;
        const match = fullOutput.match(portRegex);
        const detectedPort = match ? parseInt(match[1], 10) : undefined;

        set((s) => {
          const current = s.runningProcesses[procKey];
          if (!current) return s;
          return {
            runningProcesses: {
              ...s.runningProcesses,
              [procKey]: {
                ...current,
                status: res.exitCode === 0 ? "stopped" : "error",
                logs: [...current.logs, res.stdout, res.stderr].filter(Boolean),
                detectedPort: detectedPort || current.detectedPort,
              },
            },
          };
        });

        if (detectedPort) {
          set((s) => ({
            projects: s.projects.map((p) =>
              p.path === projectPath ? { ...p, activePort: detectedPort } : p
            ),
          }));
        }
      });
    } catch (err: any) {
      set((s) => {
        const current = s.runningProcesses[procKey];
        if (!current) return s;
        return {
          runningProcesses: {
            ...s.runningProcesses,
            [procKey]: {
              ...current,
              status: "error",
              logs: [...current.logs, `Execution error: ${err.message}`],
            },
          },
        };
      });
    }
  },

  stopProjectScript: (projectPath, scriptName) => {
    const procKey = `${projectPath}:${scriptName}`;
    set((s) => {
      const current = s.runningProcesses[procKey];
      if (!current) return s;
      return {
        runningProcesses: {
          ...s.runningProcesses,
          [procKey]: {
            ...current,
            status: "stopped",
            logs: [...current.logs, "[Forge Runner] Process terminated by user."],
          },
        },
      };
    });
  },

  bindPortToBrowserTab: (port, title) => {
    const url = `http://localhost:${port}`;
    useTabsStore.getState().openTab(url);
    if (title) {
      const activeTabId = useTabsStore.getState().activeTabId;
      if (activeTabId) {
        useTabsStore.getState().updateTab(activeTabId, { title });
      }
    }
  },
}));
