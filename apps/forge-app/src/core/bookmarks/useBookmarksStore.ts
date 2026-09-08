import { create } from "zustand";

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

interface BookmarksState {
  bookmarks: Bookmark[];
  addBookmark: (title: string, url: string) => void;
  removeBookmark: (url: string) => void;
  isBookmarked: (url: string) => boolean;
}

const STORAGE_KEY = "forge_bookmarks_v1";

function loadInitialBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {}
}

export const useBookmarksStore = create<BookmarksState>((set, get) => {
  const initial = loadInitialBookmarks();

  return {
    bookmarks: initial,

    addBookmark(title, url) {
      if (get().isBookmarked(url)) return;
      const bm: Bookmark = { id: `bm-${Date.now()}`, title: title || url, url, createdAt: Date.now() };
      set((s) => {
        const next = [...s.bookmarks, bm];
        saveBookmarks(next);
        return { bookmarks: next };
      });
    },

    removeBookmark(url) {
      set((s) => {
        const next = s.bookmarks.filter((b) => b.url !== url);
        saveBookmarks(next);
        return { bookmarks: next };
      });
    },

    isBookmarked(url) {
      return get().bookmarks.some((b) => b.url === url);
    },
  };
});
