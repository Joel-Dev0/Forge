import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeState {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
  initTheme: () => () => void;
}

const STORAGE_KEY = "forge_theme_mode";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return getSystemTheme();
  return mode;
}

function applyThemeToDocument(resolved: ResolvedTheme, mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-mode", mode);

  // Notify Electron IPC if available
  (window as any).electron?.setTheme?.(mode);
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialMode: ThemeMode =
    typeof window !== "undefined"
      ? (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system"
      : "system";
  const initialResolved = resolveTheme(initialMode);

  applyThemeToDocument(initialResolved, initialMode);

  return {
    themeMode: initialMode,
    resolvedTheme: initialResolved,

    setThemeMode: (mode: ThemeMode) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, mode);
      }
      const resolved = resolveTheme(mode);
      applyThemeToDocument(resolved, mode);
      set({ themeMode: mode, resolvedTheme: resolved });
    },

    initTheme: () => {
      const mode = get().themeMode;
      const resolved = resolveTheme(mode);
      applyThemeToDocument(resolved, mode);
      set({ resolvedTheme: resolved });

      if (typeof window === "undefined") return () => {};

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemChange = (e: MediaQueryListEvent) => {
        if (get().themeMode === "system") {
          const newResolved: ResolvedTheme = e.matches ? "dark" : "light";
          applyThemeToDocument(newResolved, "system");
          set({ resolvedTheme: newResolved });
        }
      };

      mediaQuery.addEventListener("change", handleSystemChange);
      return () => mediaQuery.removeEventListener("change", handleSystemChange);
    },
  };
});
