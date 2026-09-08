import { create } from "zustand";

interface NavigationState {
  urlBarValue: string;
  setUrlBarValue: (v: string) => void;
  navigate: (url: string) => string;
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "about:blank";
  // If it looks like a URL already, add https if missing
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) {
    return `https://${trimmed}`;
  }
  // Otherwise treat as a search query
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  urlBarValue: "about:blank",

  setUrlBarValue(v) {
    set({ urlBarValue: v });
  },

  navigate(raw) {
    const url = normalizeUrl(raw);
    set({ urlBarValue: url });
    return url;
  },
}));
