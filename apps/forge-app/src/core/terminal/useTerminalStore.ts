import { create } from "zustand";

export type ShellMode = "powershell" | "cmd" | "browser-js";

interface TerminalState {
  shellMode: ShellMode;
  cwd: string;
  isExecuting: boolean;
  history: string[];

  setShellMode: (mode: ShellMode) => void;
  setCwd: (cwd: string) => void;
  initCwd: () => Promise<void>;
  execSystemCommand: (command: string) => Promise<{ stdout: string; stderr: string; cwd: string; exitCode: number }>;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  shellMode: "powershell",
  cwd: "C:\\Users",
  isExecuting: false,
  history: [],

  setShellMode: (shellMode) => set({ shellMode }),
  setCwd: (cwd) => set({ cwd }),

  initCwd: async () => {
    try {
      const forgeTerm = (window as any).forge?.terminal;
      if (forgeTerm?.getCwd) {
        const cwd = await forgeTerm.getCwd();
        if (cwd) set({ cwd });
      }
    } catch {}
  },

  execSystemCommand: async (command) => {
    const { shellMode } = get();
    set({ isExecuting: true });

    try {
      const forgeTerm = (window as any).forge?.terminal;
      if (!forgeTerm?.exec) {
        return {
          stdout: "",
          stderr: "System terminal is only available in the Electron desktop environment.",
          cwd: get().cwd,
          exitCode: 1,
        };
      }

      const shellType = shellMode === "cmd" ? "cmd" : "powershell";
      const result = await forgeTerm.exec(command, shellType);

      if (result.cwd) {
        set({ cwd: result.cwd });
      }

      return result;
    } catch (err: any) {
      return {
        stdout: "",
        stderr: err.message || String(err),
        cwd: get().cwd,
        exitCode: 1,
      };
    } finally {
      set({ isExecuting: false });
    }
  },
}));