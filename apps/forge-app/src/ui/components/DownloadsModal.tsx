import { useState, useEffect } from "react";
import {
  Download,
  FolderOpen,
  File,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  X,
  Search,
  HardDriveDownload,
} from "lucide-react";
import { useDownloadsStore, type DownloadItem } from "../../core/downloads/useDownloadsStore";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DownloadsModal() {
  const { items, isOpen, setIsOpen, openFolder, openFile, showInFolder } = useDownloadsStore();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) =>
    item.filename.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none cursor-pointer"
    >
      <div
        className="w-full max-w-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[80vh] ring-1 ring-white/5 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--forge-border)] flex items-center justify-between bg-[var(--forge-surface-elevated)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center">
              <Download size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--forge-text)] flex items-center gap-2">
                Downloads
                <span className="text-xs font-mono font-normal text-[var(--forge-text-muted)] bg-[var(--forge-input)] px-2 py-0.5 rounded-full border border-[var(--forge-border)]">
                  Ctrl + J
                </span>
              </h2>
              <p className="text-xs text-[var(--forge-text-muted)]">
                Files downloaded in this session
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openFolder}
              title="Open Downloads folder in File Explorer"
              className="px-3 py-1.5 rounded-lg bg-[var(--forge-hover)] hover:bg-[#FF6B00]/15 text-xs font-medium text-[var(--forge-text)] hover:text-[#FF6B00] transition-colors flex items-center gap-1.5 border border-[var(--forge-border)] cursor-pointer"
            >
              <FolderOpen size={14} />
              Open Folder
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search / Filter Bar */}
        {items.length > 0 && (
          <div className="px-5 py-2.5 border-b border-[var(--forge-border)] bg-[var(--forge-surface)] flex items-center gap-2">
            <Search size={14} className="text-[var(--forge-text-muted)] shrink-0" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search downloads..."
              className="w-full bg-transparent text-xs text-[var(--forge-text)] outline-none placeholder-[var(--forge-text-muted)]"
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                className="text-xs text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Download Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[var(--forge-text-muted)]">
              <div className="w-14 h-14 rounded-2xl bg-[var(--forge-input)] border border-[var(--forge-border)] flex items-center justify-center mb-3 text-[var(--forge-text-muted)]">
                <HardDriveDownload size={26} />
              </div>
              <p className="text-sm font-medium text-[var(--forge-text)] mb-1">
                {items.length === 0
                  ? "No active downloads in this session"
                  : "No downloads matching filter"}
              </p>
              <p className="text-xs max-w-xs text-[var(--forge-text-muted)] mb-4">
                Files downloaded from any web page will appear here with progress and status.
              </p>
              <button
                onClick={openFolder}
                className="px-4 py-2 rounded-lg bg-[#FF6B00] text-white hover:bg-[#FF8533] text-xs font-semibold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <FolderOpen size={14} /> Open System Downloads Folder
              </button>
            </div>
          ) : (
            filteredItems.map((item: DownloadItem) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[var(--forge-surface-elevated)]/60 border border-[var(--forge-border)] hover:border-[#FF6B00]/40 transition-all flex items-center gap-3 group"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex items-center justify-center shrink-0 text-[#FF6B00]">
                  <File size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p
                      className="text-xs font-medium text-[var(--forge-text)] truncate cursor-pointer hover:text-[#FF6B00]"
                      onClick={() => openFile(item.path)}
                      title={item.filename}
                    >
                      {item.filename}
                    </p>
                    <span className="text-[11px] font-mono text-[var(--forge-text-muted)] shrink-0">
                      {formatBytes(item.size)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[var(--forge-text-muted)]">
                    {item.state === "completed" && (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 size={12} /> Completed
                      </span>
                    )}
                    {item.state === "progressing" && (
                      <span className="flex items-center gap-1 text-[#FF6B00] font-medium animate-pulse">
                        <Clock size={12} /> Downloading... (
                        {formatBytes(item.receivedBytes)} / {formatBytes(item.size)})
                      </span>
                    )}
                    {(item.state === "cancelled" || item.state === "interrupted") && (
                      <span className="flex items-center gap-1 text-red-400 font-medium">
                        <AlertCircle size={12} /> {item.state}
                      </span>
                    )}
                    <span>•</span>
                    <span className="truncate max-w-[200px]" title={item.url}>
                      {item.url}
                    </span>
                  </div>

                  {item.state === "progressing" && item.size > 0 && (
                    <div className="w-full h-1 bg-[var(--forge-input)] rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-[#FF6B00] rounded-full transition-all duration-200"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((item.receivedBytes / item.size) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => showInFolder(item.path)}
                    title="Show in folder"
                    className="p-1.5 rounded-md hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] cursor-pointer"
                  >
                    <FolderOpen size={14} />
                  </button>
                  <button
                    onClick={() => openFile(item.path)}
                    title="Open file"
                    className="p-1.5 rounded-md hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[#FF6B00] cursor-pointer"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/30 flex items-center justify-between text-xs text-[var(--forge-text-muted)]">
          <span>Press <kbd className="font-mono bg-[var(--forge-input)] px-1.5 py-0.5 rounded border border-[var(--forge-border)] text-[var(--forge-text)]">Esc</kbd> to close</span>
          <button
            onClick={openFolder}
            className="text-xs text-[#FF6B00] hover:underline cursor-pointer flex items-center gap-1"
          >
            Show full download history in system folder →
          </button>
        </div>
      </div>
    </div>
  );
}
