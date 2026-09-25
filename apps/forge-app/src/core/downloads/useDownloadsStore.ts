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
  isPrivate?: boolean;
}

interface DownloadsState {
  items: DownloadItem[];
  isOpen: boolean;
  activeDownload: DownloadItem | null;
  showFlyout: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setShowFlyout: (show: boolean) => void;
  dismissFlyout: () => void;
  toggleOpen: () => void;
  addItem: (item: DownloadItem) => void;
  updateItem: (item: DownloadItem) => void;
  clearAll: () => void;
  clearPrivateDownloads: () => void;
  openFolder: () => void;
  openFile: (path: string) => void;
  showInFolder: (path: string) => void;
  startDownload: (url: string, preferredFilename?: string) => Promise<void>;
}

let flyoutTimer: ReturnType<typeof setTimeout> | null = null;

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  items: [],
  isOpen: false,
  activeDownload: null,
  showFlyout: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  setShowFlyout: (showFlyout) => set({ showFlyout }),
  dismissFlyout: () => {
    if (flyoutTimer) clearTimeout(flyoutTimer);
    set({ showFlyout: false });
  },
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  addItem: (item) =>
    set((s) => {
      const exists = s.items.some((i) => i.id === item.id);
      const items = exists
        ? s.items.map((i) => (i.id === item.id ? item : i))
        : [item, ...s.items];

      if (flyoutTimer) clearTimeout(flyoutTimer);
      if (item.state === "completed") {
        flyoutTimer = setTimeout(() => {
          set({ showFlyout: false });
        }, 6000);
      }

      return {
        items,
        activeDownload: item,
        showFlyout: true,
      };
    }),
  updateItem: (item) =>
    set((s) => {
      const items = s.items.map((i) => (i.id === item.id ? item : i));
      if (flyoutTimer) clearTimeout(flyoutTimer);
      if (item.state === "completed") {
        flyoutTimer = setTimeout(() => {
          set({ showFlyout: false });
        }, 6000);
      }
      return {
        items,
        activeDownload: item,
        showFlyout: true,
      };
    }),
  clearAll: () => {
    (window as any).forge?.downloads?.clearHistory?.();
    set({ items: [], activeDownload: null, showFlyout: false });
  },
  clearPrivateDownloads: () => {
    set((s) => ({
      items: s.items.filter((i) => !i.isPrivate),
    }));
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

  startDownload: async (url: string, preferredFilename?: string) => {
    if (!url || url === "about:blank") return;

    const forge = (window as any).forge;
    let derivedFilename = preferredFilename;
    if (!derivedFilename) {
      const pathname = url.split("?")[0] || "";
      let base = pathname.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || "";
      if (!base || base === "_" || base === ".") base = "download";
      if (!base.includes(".")) {
        if (url.includes("format=png") || url.includes(".png")) base += ".png";
        else if (url.includes("format=webp") || url.includes(".webp")) base += ".webp";
        else if (url.includes("format=gif") || url.includes(".gif")) base += ".gif";
        else if (url.includes("format=svg") || url.includes(".svg")) base += ".svg";
        else base += ".jpg";
      }
      derivedFilename = base;
    }

    // 1. Electron Native Background Downloader (never navigates page, handles unique names & events)
    if (forge?.downloads?.start) {
      try {
        const res = await forge.downloads.start(url, derivedFilename);
        if (res?.ok) return;
      } catch (err) {
        console.warn("[Forge Downloads] Electron download error, trying web fallback:", err);
      }
    }

    const downloadId = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 2. Web Mode: Only add optimistic placeholder if running in web fallback without Electron
    get().addItem({
      id: downloadId,
      filename: derivedFilename,
      path: derivedFilename,
      size: 0,
      receivedBytes: 0,
      state: "progressing",
      startTime: Date.now(),
      url,
    });

    // 2. Web Mode: Fetch as Blob and trigger blob: download
    try {
      // Simulate rapid progress tick for delightful visual feedback
      setTimeout(() => {
        const cur = get().items.find((i) => i.id === downloadId);
        if (cur && cur.state === "progressing") {
          get().updateItem({ ...cur, receivedBytes: 25000, size: 75000 });
        }
      }, 150);

      const resp = await fetch(url, { mode: "cors" });
      if (resp.ok) {
        const blob = await resp.blob();

        setTimeout(() => {
          const cur = get().items.find((i) => i.id === downloadId);
          if (cur && cur.state === "progressing") {
            get().updateItem({ ...cur, receivedBytes: Math.floor(blob.size * 0.8), size: blob.size });
          }
        }, 300);

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = blobUrl;
        a.download = derivedFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

        setTimeout(() => {
          get().updateItem({
            id: downloadId,
            filename: derivedFilename,
            path: derivedFilename,
            size: blob.size,
            receivedBytes: blob.size,
            state: "completed",
            startTime: Date.now(),
            url,
          });
        }, 500);

        return;
      }
    } catch {
      // CORS blocked direct blob fetch
    }

    // 3. Web Mode Image via Canvas conversion (cross-origin safe for images)
    try {
      const isImg =
        /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(url) || url.startsWith("data:image");
      if (isImg) {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || img.width;
              canvas.height = img.naturalHeight || img.height;
              const ctx = canvas.getContext("2d");
              ctx?.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.style.display = "none";
                  a.href = blobUrl;
                  a.download = derivedFilename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

                  get().updateItem({
                    id: downloadId,
                    filename: derivedFilename,
                    path: derivedFilename,
                    size: blob.size,
                    receivedBytes: blob.size,
                    state: "completed",
                    startTime: Date.now(),
                    url,
                  });
                  resolve();
                } else {
                  reject(new Error("Canvas blob null"));
                }
              });
            } catch (canvasErr) {
              reject(canvasErr);
            }
          };
          img.onerror = () => reject(new Error("Image failed to load into canvas"));
          img.src = url;
        });
        return;
      }
    } catch {
      // Canvas fallback blocked
    }

    // 4. Safe fallback: NEVER navigate the main window away from the app!
    try {
      const { useTabsStore } = await import("../tabs/useTabsStore");
      useTabsStore.getState().openTab(url);
    } catch {
      window.open(url, "_blank");
    }

    get().updateItem({
      id: downloadId,
      filename: derivedFilename,
      path: derivedFilename,
      size: 0,
      receivedBytes: 0,
      state: "completed",
      startTime: Date.now(),
      url,
    });
  },
}));
