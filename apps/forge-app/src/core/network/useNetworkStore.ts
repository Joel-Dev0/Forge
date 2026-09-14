import { create } from "zustand";

export type FilterCategory = "all" | "fetch" | "doc" | "js" | "css" | "img" | "other";

interface NetworkState {
  entries: NetworkEntry[];
  selectedId: string | null;
  filterType: FilterCategory;
  searchQuery: string;
  isRecording: boolean;
  detailTab: "headers" | "payload" | "response" | "timing";

  initNetworkListener: () => () => void;
  addOrUpdateEntry: (entry: NetworkEntry) => void;
  addOrUpdateBatch: (entries: NetworkEntry[]) => void;
  setSelectedId: (id: string | null) => void;
  setFilterType: (filter: FilterCategory) => void;
  setSearchQuery: (query: string) => void;
  setDetailTab: (tab: "headers" | "payload" | "response" | "timing") => void;
  toggleRecording: () => void;
  clearEntries: () => void;
  fetchResponseBody: (id: string) => Promise<void>;
}

export function matchesFilter(entry: NetworkEntry, filter: FilterCategory): boolean {
  if (filter === "all") return true;
  const t = entry.resourceType;
  if (filter === "fetch") return t === "fetch" || t === "xhr";
  if (filter === "doc") return t === "document";
  if (filter === "js") return t === "script";
  if (filter === "css") return t === "stylesheet";
  if (filter === "img") return t === "image" || t === "media";
  if (filter === "other") return !["fetch", "xhr", "document", "script", "stylesheet", "image", "media"].includes(t);
  return true;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  entries: [],
  selectedId: null,
  filterType: "all",
  searchQuery: "",
  isRecording: true,
  detailTab: "headers",

  initNetworkListener: () => {
    const forgeNet = (window as any).forge?.network;
    if (!forgeNet?.onEntry) return () => {};

    const unsubEntry = forgeNet.onBatch
      ? forgeNet.onBatch((batch: NetworkEntry[]) => {
          if (!get().isRecording) return;
          get().addOrUpdateBatch(batch);
        })
      : forgeNet.onEntry((entryOrBatch: any) => {
          if (!get().isRecording) return;
          if (Array.isArray(entryOrBatch)) {
            get().addOrUpdateBatch(entryOrBatch);
          } else {
            get().addOrUpdateEntry(entryOrBatch);
          }
        });

    const unsubClear = forgeNet.onClear?.(() => {
      set({ entries: [], selectedId: null });
    });

    return () => {
      unsubEntry?.();
      unsubClear?.();
    };
  },

  addOrUpdateEntry: (entry) => {
    get().addOrUpdateBatch([entry]);
  },

  addOrUpdateBatch: (items) => {
    if (!items.length) return;
    set((state) => {
      const entryMap = new Map<string, number>();
      state.entries.forEach((e, i) => entryMap.set(e.id, i));
      const next = [...state.entries];

      for (const item of items) {
        const idx = entryMap.get(item.id);
        if (idx !== undefined) {
          next[idx] = { ...next[idx], ...item };
        } else {
          entryMap.set(item.id, next.length);
          next.push(item);
        }
      }

      return { entries: next.slice(-500) };
    });
  },

  setSelectedId: (selectedId) => set({ selectedId }),
  setFilterType: (filterType) => set({ filterType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDetailTab: (detailTab) => set({ detailTab }),
  toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),

  clearEntries: () => {
    (window as any).forge?.network?.clear?.();
    set({ entries: [], selectedId: null });
  },

  fetchResponseBody: async (id) => {
    try {
      const body = await (window as any).forge?.network?.getResponseBody?.(id);
      if (body) {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, responseBody: body, hasResponseBody: true } : e
          ),
        }));
      }
    } catch {}
  },
}));
