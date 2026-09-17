import { create } from "zustand";

export interface DownloadItem {
  id: string;
  filename: string;
  path: string;
  size: number;
  receivedBytes: number;
  state: "progressing" | "completed" | "cancelled" | "interrupted";
  startTime: number;
  url: string;
}

interface DownloadsState {
  items: DownloadItem[];
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  addItem: (item: DownloadItem) => void;
  updateItem: (item: DownloadItem) => void;
  clearAll: () => void;
  openFolder: () => void;
  openFile: (path: string) => void;
  showInFolder: (path: string) => void;
}

export const useDownloadsStore = create<DownloadsState>((set) => ({
  items: [],
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  addItem: (item) =>
    set((s) => {
      const exists = s.items.some((i) => i.id === item.id);
      if (exists) {
        return { items: s.items.map((i) => (i.id === item.id ? item : i)) };
      }
      return { items: [item, ...s.items] };
    }),
  updateItem: (item) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === item.id ? item : i)),
    })),
  clearAll: () => {
    (window as any).forge?.downloads?.clearHistory?.();
    set({ items: [] });
  },
  openFolder: () => {
    (window as any).forge?.downloads?.openFolder?.();
  },
  openFile: (filePath: string) => {
    (window as any).forge?.downloads?.openFile?.(filePath);
  },
  showInFolder: (filePath: string) => {
    (window as any).forge?.downloads?.showInFolder?.(filePath);
  },
}));
