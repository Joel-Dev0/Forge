import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  CheckCircle2,
  FolderOpen,
  File,
  ExternalLink,
  X,
  ArrowDown,
  Clock,
  Sparkles,
  FileText,
  FileArchive,
  FileCode,
  Image as ImageIcon,
} from "lucide-react";
import { useDownloadsStore, type DownloadItem } from "../../core/downloads/useDownloadsStore";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico"].includes(ext)) {
    return <ImageIcon size={15} className="text-amber-400" />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <FileArchive size={15} className="text-emerald-400" />;
  }
  if (["ts", "tsx", "js", "jsx", "html", "css", "json", "py"].includes(ext)) {
    return <FileCode size={15} className="text-blue-400" />;
  }
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext)) {
    return <FileText size={15} className="text-purple-400" />;
  }
  return <File size={15} className="text-zinc-400" />;
}

export function DownloadsToolbarButton() {
  const {
    items,
    activeDownload,
    showFlyout,
    setShowFlyout,
    dismissFlyout,
    setIsOpen: openModal,
    openFile,
    showInFolder,
  } = useDownloadsStore();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close flyout when clicking outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        dismissFlyout();
      }
    };
    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, [dismissFlyout]);

  // Synchronize with store's showFlyout (opens flyout automatically when download starts)
  useEffect(() => {
    if (showFlyout) {
      setIsOpen(true);
    }
  }, [showFlyout]);

  const latestItem = items[0] || activeDownload;
  const isDownloading = latestItem?.state === "progressing";
  const isRecentlyCompleted =
    latestItem?.state === "completed" && Date.now() - latestItem.startTime < 15000;

  // Calculate percentage
  const percent =
    latestItem && latestItem.size > 0
      ? Math.min(100, Math.round((latestItem.receivedBytes / latestItem.size) * 100))
      : isDownloading
      ? 60
      : 100;

  // SVG circular progress calculation (radius = 9, circumference = 2 * PI * 9 ~= 56.54)
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* ═══ Main Toolbar Button with Circular Progress Ring ═══ */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) dismissFlyout();
        }}
        title={`Downloads (Ctrl + J)${isDownloading ? ` — ${percent}%` : ""}`}
        className={`relative w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
          isDownloading
            ? "bg-[#FF6B00]/15 text-[#FF6B00] shadow-sm shadow-[#FF6B00]/20"
            : isRecentlyCompleted
            ? "bg-emerald-500/15 text-emerald-400"
            : isOpen
            ? "bg-[var(--forge-hover)] text-[var(--forge-text)]"
            : "text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)] hover:text-[var(--forge-text)]"
        }`}
      >
        {isDownloading ? (
          <div className="relative w-5 h-5 flex items-center justify-center">
            {/* SVG Circular Progress Ring */}
            <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r={radius}
                className="stroke-zinc-700/60 fill-none"
                strokeWidth="2.5"
              />
              <circle
                cx="12"
                cy="12"
                r={radius}
                className="stroke-[#FF6B00] fill-none transition-all duration-200"
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center animate-bounce">
              <ArrowDown size={10} className="text-[#FF6B00]" />
            </div>
          </div>
        ) : isRecentlyCompleted ? (
          <div className="relative flex items-center justify-center">
            <CheckCircle2 size={14} className="text-emerald-400 animate-in zoom-in duration-200" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
        ) : (
          <Download size={14} />
        )}

        {/* Small badge if items exist */}
        {items.length > 0 && !isDownloading && !isRecentlyCompleted && (
          <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-[#FF6B00]/70" />
        )}
      </button>

      {/* ═══ Download Progress Flyout / Popover Card ═══ */}
      {isOpen && (
        <div className="absolute right-0 top-9 z-[10070] w-80 bg-[#1e1e1e]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden font-sans select-none animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150 ring-1 ring-black/60">
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center">
                <Download size={11} />
              </div>
              <span className="text-xs font-semibold text-white">Downloads</span>
              {isDownloading && (
                <span className="text-[10px] font-mono text-[#FF6B00] bg-[#FF6B00]/15 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                  {percent}%
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  dismissFlyout();
                  openModal(true);
                }}
                className="text-[11px] text-zinc-400 hover:text-white transition-colors hover:underline cursor-pointer"
              >
                View all
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  dismissFlyout();
                }}
                className="w-5 h-5 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Body: List of Recent Downloads */}
          <div className="p-2 space-y-2 max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-6 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                <Download size={24} className="text-zinc-600" />
                <span>No downloads yet</span>
              </div>
            ) : (
              items.slice(0, 4).map((item) => {
                const itemPercent =
                  item.size > 0
                    ? Math.min(100, Math.round((item.receivedBytes / item.size) * 100))
                    : item.state === "completed"
                    ? 100
                    : 50;

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-white/[0.04] border border-white/5 hover:border-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center shrink-0">
                        {getFileIcon(item.filename)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-medium text-white truncate" title={item.filename}>
                            {item.filename}
                          </p>
                          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                            {formatBytes(item.size || item.receivedBytes)}
                          </span>
                        </div>

                        {/* Progress or status badge */}
                        {item.state === "progressing" ? (
                          <div className="mt-1.5 space-y-1">
                            {/* Animated Gradient Progress Bar */}
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#FF6B00] via-amber-400 to-[#FF6B00] rounded-full transition-all duration-300 relative overflow-hidden"
                                style={{ width: `${itemPercent}%` }}
                              >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                              <span>Downloading...</span>
                              <span className="text-[#FF6B00] font-semibold">{itemPercent}%</span>
                            </div>
                          </div>
                        ) : item.state === "completed" ? (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={10} />
                              Completed
                            </span>
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => showInFolder(item.path)}
                                title="Show in folder"
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              >
                                <FolderOpen size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openFile(item.path)}
                                title="Open file"
                                className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              >
                                <ExternalLink size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] text-rose-400">
                            Failed / Interrupted
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-3 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="text-[10px] text-zinc-500 font-mono">Press Ctrl + J for full history</span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                dismissFlyout();
                openModal(true);
              }}
              className="text-[#FF6B00] hover:text-[#ff8533] font-medium transition-colors cursor-pointer"
            >
              Open Manager &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
