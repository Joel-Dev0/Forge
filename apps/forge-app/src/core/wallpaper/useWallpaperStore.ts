import { create } from "zustand";

export interface WallpaperPreset {
  id: string;
  name: string;
  category: "dark" | "cyberpunk" | "space" | "minimal" | "nature";
  url: string;
  thumbnail: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: "default-glow",
    name: "Forge Ember",
    category: "minimal",
    url: "", // Default ambient dark background with glow
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80&auto=format&fit=crop",
  },
  {
    id: "cyber-matrix",
    name: "Cyber Grid",
    category: "cyberpunk",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&q=85&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&q=80&auto=format&fit=crop",
  },
  {
    id: "deep-space",
    name: "Cosmic Nebula",
    category: "space",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1920&q=85&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=300&q=80&auto=format&fit=crop",
  },
  {
    id: "tokyo-night",
    name: "Tokyo Cyber",
    category: "cyberpunk",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&q=85&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&q=80&auto=format&fit=crop",
  },
  {
    id: "abstract-mesh",
    name: "Obsidian Wave",
    category: "minimal",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&q=85&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80&auto=format&fit=crop",
  },
  {
    id: "terminal-code",
    name: "Hex & Neon",
    category: "cyberpunk",
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=85&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=300&q=80&auto=format&fit=crop",
  },
  {
    id: "mountain-stars",
    name: "Alpine Night",
    category: "space",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=85&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&q=80&auto=format&fit=crop",
  },
  {
    id: "dark-carbon",
    name: "Dark Studio",
    category: "minimal",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1920&q=85&auto=format&fit=crop",
    thumbnail: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300&q=80&auto=format&fit=crop",
  },
];

export type WallpaperType = "preset" | "custom-url" | "custom-file" | "none";

export interface WallpaperConfig {
  type: WallpaperType;
  presetId?: string;
  customUrl?: string;
  dimOpacity: number; // 0 to 90 (percent darkness)
  blurPx: number; // 0 to 25 (pixels blur)
}

interface WallpaperState {
  config: WallpaperConfig;
  customImageDataUrl: string | null;
  activeUrl: string | null;
  setPreset: (presetId: string) => void;
  setCustomUrl: (url: string) => void;
  setCustomFile: (dataUrl: string) => Promise<void>;
  setDimOpacity: (opacity: number) => void;
  setBlurPx: (blur: number) => void;
  resetToDefault: () => Promise<void>;
  loadWallpaper: () => Promise<void>;
}

const STORAGE_KEY = "forge_wallpaper_config_v1";
const IDB_NAME = "forge_browser_db";
const IDB_STORE = "wallpapers";

// Simple IndexedDB helper to store custom wallpaper images safely
function openWallpaperDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveCustomImageToIDB(dataUrl: string): Promise<void> {
  try {
    const db = await openWallpaperDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    store.put(dataUrl, "custom_wallpaper");
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Failed to store custom wallpaper in IndexedDB:", err);
  }
}

async function getCustomImageFromIDB(): Promise<string | null> {
  try {
    const db = await openWallpaperDB();
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.get("custom_wallpaper");
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function deleteCustomImageFromIDB(): Promise<void> {
  try {
    const db = await openWallpaperDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    store.delete("custom_wallpaper");
  } catch {
    // ignore
  }
}

const DEFAULT_CONFIG: WallpaperConfig = {
  type: "preset",
  presetId: "default-glow",
  dimOpacity: 45,
  blurPx: 0,
};

export const useWallpaperStore = create<WallpaperState>((set, get) => ({
  config: DEFAULT_CONFIG,
  customImageDataUrl: null,
  activeUrl: null,

  setPreset: (presetId: string) => {
    const preset = WALLPAPER_PRESETS.find((p) => p.id === presetId);
    const newConfig: WallpaperConfig = {
      ...get().config,
      type: "preset",
      presetId,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    set({
      config: newConfig,
      activeUrl: preset?.url || null,
    });
  },

  setCustomUrl: (url: string) => {
    const newConfig: WallpaperConfig = {
      ...get().config,
      type: "custom-url",
      customUrl: url,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    set({
      config: newConfig,
      activeUrl: url,
    });
  },

  setCustomFile: async (dataUrl: string) => {
    await saveCustomImageToIDB(dataUrl);
    const newConfig: WallpaperConfig = {
      ...get().config,
      type: "custom-file",
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    set({
      config: newConfig,
      customImageDataUrl: dataUrl,
      activeUrl: dataUrl,
    });
  },

  setDimOpacity: (dimOpacity: number) => {
    const clamped = Math.max(0, Math.min(90, Math.round(dimOpacity)));
    const newConfig: WallpaperConfig = {
      ...get().config,
      dimOpacity: clamped,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    set({ config: newConfig });
  },

  setBlurPx: (blurPx: number) => {
    const clamped = Math.max(0, Math.min(30, Math.round(blurPx)));
    const newConfig: WallpaperConfig = {
      ...get().config,
      blurPx: clamped,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    }
    set({ config: newConfig });
  },

  resetToDefault: async () => {
    await deleteCustomImageFromIDB();
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
    }
    set({
      config: DEFAULT_CONFIG,
      customImageDataUrl: null,
      activeUrl: null,
    });
  },

  loadWallpaper: async () => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(STORAGE_KEY);
      let parsed = raw ? (JSON.parse(raw) as WallpaperConfig) : DEFAULT_CONFIG;

      let activeUrl: string | null = null;
      let customImageDataUrl: string | null = null;

      if (parsed.type === "preset") {
        const preset = WALLPAPER_PRESETS.find((p) => p.id === parsed.presetId);
        activeUrl = preset?.url || null;
      } else if (parsed.type === "custom-url") {
        activeUrl = parsed.customUrl || null;
      } else if (parsed.type === "custom-file") {
        customImageDataUrl = await getCustomImageFromIDB();
        activeUrl = customImageDataUrl;
      }

      set({
        config: parsed,
        customImageDataUrl,
        activeUrl,
      });
    } catch (e) {
      console.error("Failed to load wallpaper configuration:", e);
    }
  },
}));
