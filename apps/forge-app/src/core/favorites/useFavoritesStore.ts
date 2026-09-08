import { create } from "zustand";

export interface FavoriteFolder {
  id: string;
  name: string;
  color?: string;
}

export interface FavoriteItem {
  id: string;
  title: string;
  url: string;
  folderId?: string;
  tags: string[];
  pinned?: boolean;
  notes?: string;
  createdAt: number;
}

interface FavoritesState {
  folders: FavoriteFolder[];
  items: FavoriteItem[];
  searchQuery: string;
  selectedFolderId: string | null;
  selectedTag: string | null;

  addFavorite: (data: { title: string; url: string; folderId?: string; tags?: string[]; notes?: string; pinned?: boolean }) => void;
  removeFavorite: (idOrUrl: string) => void;
  updateFavorite: (id: string, patch: Partial<FavoriteItem>) => void;
  togglePin: (id: string) => void;
  createFolder: (name: string, color?: string) => string;
  deleteFolder: (folderId: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedFolderId: (folderId: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
  isFavorited: (url: string) => boolean;
  exportFavorites: () => string;
  importFavorites: (jsonData: string) => boolean;
}

const STORAGE_KEY = "forge_favorites_v1";

const DEFAULT_FOLDERS: FavoriteFolder[] = [
  { id: "dev", name: "Development", color: "#FF6B00" },
  { id: "design", name: "Design & UI", color: "#A855F7" },
  { id: "tools", name: "APIs & Tools", color: "#3B82F6" },
  { id: "research", name: "Docs & Research", color: "#10B981" },
];

const DEFAULT_ITEMS: FavoriteItem[] = [
  {
    id: "fav-1",
    title: "GitHub",
    url: "https://github.com",
    folderId: "dev",
    tags: ["code", "git", "repos"],
    pinned: true,
    createdAt: Date.now(),
  },
  {
    id: "fav-2",
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    folderId: "research",
    tags: ["docs", "web", "javascript", "css"],
    pinned: true,
    createdAt: Date.now(),
  },
  {
    id: "fav-3",
    title: "Tailwind CSS",
    url: "https://tailwindcss.com",
    folderId: "design",
    tags: ["css", "styling", "ui"],
    pinned: false,
    createdAt: Date.now(),
  },
  {
    id: "fav-4",
    title: "JSONPlaceholder API",
    url: "https://jsonplaceholder.typicode.com",
    folderId: "tools",
    tags: ["api", "testing", "rest"],
    pinned: false,
    createdAt: Date.now(),
  },
];

function loadInitialState(): { folders: FavoriteFolder[]; items: FavoriteItem[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.items) && Array.isArray(parsed.folders)) {
        return parsed;
      }
    }
  } catch {}
  return { folders: DEFAULT_FOLDERS, items: DEFAULT_ITEMS };
}

function saveState(folders: FavoriteFolder[], items: FavoriteItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ folders, items }));
  } catch {}
}

let favCounter = Date.now();

export const useFavoritesStore = create<FavoritesState>((set, get) => {
  const initial = loadInitialState();

  return {
    folders: initial.folders,
    items: initial.items,
    searchQuery: "",
    selectedFolderId: null,
    selectedTag: null,

    addFavorite(data) {
      const existing = get().items.find((i) => i.url === data.url);
      if (existing) {
        get().updateFavorite(existing.id, data);
        return;
      }

      const item: FavoriteItem = {
        id: `fav-${++favCounter}`,
        title: data.title || data.url,
        url: data.url,
        folderId: data.folderId || undefined,
        tags: data.tags || [],
        notes: data.notes || "",
        pinned: data.pinned || false,
        createdAt: Date.now(),
      };

      set((s) => {
        const next = [item, ...s.items];
        saveState(s.folders, next);
        return { items: next };
      });
    },

    removeFavorite(idOrUrl) {
      set((s) => {
        const next = s.items.filter((i) => i.id !== idOrUrl && i.url !== idOrUrl);
        saveState(s.folders, next);
        return { items: next };
      });
    },

    updateFavorite(id, patch) {
      set((s) => {
        const next = s.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
        saveState(s.folders, next);
        return { items: next };
      });
    },

    togglePin(id) {
      set((s) => {
        const next = s.items.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i));
        saveState(s.folders, next);
        return { items: next };
      });
    },

    createFolder(name, color = "#FF6B00") {
      const folderId = `folder-${Date.now()}`;
      const folder: FavoriteFolder = { id: folderId, name, color };
      set((s) => {
        const nextFolders = [...s.folders, folder];
        saveState(nextFolders, s.items);
        return { folders: nextFolders };
      });
      return folderId;
    },

    deleteFolder(folderId) {
      set((s) => {
        const nextFolders = s.folders.filter((f) => f.id !== folderId);
        const nextItems = s.items.map((i) => (i.folderId === folderId ? { ...i, folderId: undefined } : i));
        saveState(nextFolders, nextItems);
        return {
          folders: nextFolders,
          items: nextItems,
          selectedFolderId: s.selectedFolderId === folderId ? null : s.selectedFolderId,
        };
      });
    },

    setSearchQuery(searchQuery) {
      set({ searchQuery });
    },

    setSelectedFolderId(selectedFolderId) {
      set({ selectedFolderId });
    },

    setSelectedTag(selectedTag) {
      set({ selectedTag });
    },

    isFavorited(url) {
      return get().items.some((i) => i.url === url);
    },

    exportFavorites() {
      const data = {
        app: "Forge",
        version: "1.0",
        exportedAt: new Date().toISOString(),
        folders: get().folders,
        items: get().items,
      };
      return JSON.stringify(data, null, 2);
    },

    importFavorites(jsonData) {
      try {
        const data = JSON.parse(jsonData);
        if (Array.isArray(data.items)) {
          const newFolders = Array.isArray(data.folders) ? data.folders : get().folders;
          set({ folders: newFolders, items: data.items });
          saveState(newFolders, data.items);
          return true;
        }
      } catch {}
      return false;
    },
  };
});