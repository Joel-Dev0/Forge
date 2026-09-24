import React, { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Copy,
  ExternalLink,
  Search,
  Languages,
  Volume2,
  Image as ImageIcon,
  Download,
  Share2,
  Printer,
  Code2,
  Sparkles,
  Bookmark,
  Columns,
  Shield,
  Scissors,
  ClipboardPaste,
  Undo2,
  Redo2,
  Check,
  Plus,
  Eye,
} from "lucide-react";

export interface BrowserContextParams {
  x: number;
  y: number;
  selectionText?: string;
  linkURL?: string;
  srcURL?: string;
  mediaType?: "none" | "image" | "video" | "audio" | "canvas";
  isEditable?: boolean;
  pageURL?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

interface Props {
  params: BrowserContextParams;
  onClose: () => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onReload?: () => void;
  onOpenNewTab?: (url?: string) => void;
  onOpenInSplit?: (url: string) => void;
  onBookmarkPage?: () => void;
  onFindInPage?: () => void;
  onPrint?: () => void;
  onViewSource?: (url: string) => void;
  onInspectElement?: (x: number, y: number) => void;
  onCopyText?: (text: string) => void;
  onSearchSelection?: (query: string) => void;
  onTranslateSelection?: (text: string) => void;
  onReadAloud?: (text: string) => void;
  onDownloadUrl?: (url: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  onToggleDarkMode?: () => void;
}

export function BrowserContextMenu({
  params,
  onClose,
  onGoBack,
  onGoForward,
  onReload,
  onOpenNewTab,
  onOpenInSplit,
  onBookmarkPage,
  onFindInPage,
  onPrint,
  onViewSource,
  onInspectElement,
  onCopyText,
  onSearchSelection,
  onTranslateSelection,
  onReadAloud,
  onDownloadUrl,
  onUndo,
  onRedo,
  onCut,
  onPaste,
  onSelectAll,
  onToggleDarkMode,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust menu coordinates so it doesn't overflow screen boundaries
  const menuWidth = 260;
  const menuHeight = 380;
  const adjustedX = Math.max(10, Math.min(params.x, window.innerWidth - menuWidth - 12));
  const adjustedY = Math.max(10, Math.min(params.y, window.innerHeight - menuHeight - 12));

  const hasSelection = Boolean(params.selectionText && params.selectionText.trim().length > 0);
  const truncatedSelection = hasSelection
    ? params.selectionText!.trim().length > 22
      ? params.selectionText!.trim().substring(0, 22) + "..."
      : params.selectionText!.trim()
    : "";

  const isLink = Boolean(params.linkURL && params.linkURL.trim().length > 0);
  const isImage = Boolean(params.mediaType === "image" || (params.srcURL && !isLink));

  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (action) action();
    } catch (err) {
      console.warn("Browser context action failed:", err);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-[10080] w-[260px] bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-1.5 text-xs text-white font-sans select-none animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/60"
    >
      {/* ═══ Top Quick Navigation Bar ═══ */}
      <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-white/10">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={params.canGoBack === false}
            onClick={(e) => handleAction(e, onGoBack)}
            title="Back (Alt + ←)"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowLeft size={14} />
          </button>

          <button
            type="button"
            disabled={params.canGoForward === false}
            onClick={(e) => handleAction(e, onGoForward)}
            title="Forward (Alt + →)"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowRight size={14} />
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, onReload)}
            title="Reload (Ctrl + R)"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => handleAction(e, onBookmarkPage)}
            title="Bookmark this page (Ctrl + D)"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <Bookmark size={14} />
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onOpenNewTab?.())}
            title="New Tab (Ctrl + T)"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* ═══ Link Context Actions ═══ */}
      {isLink && (
        <div className="mb-1 border-b border-white/10 pb-1">
          <button
            type="button"
            onClick={(e) => handleAction(e, () => onOpenNewTab?.(params.linkURL))}
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-[#FF6B00]/20 hover:text-[#FF6B00] text-zinc-200 transition-colors cursor-pointer"
          >
            <ExternalLink size={13} className="shrink-0" />
            <span className="truncate">Open Link in New Tab</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onOpenInSplit?.(params.linkURL!))}
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <Columns size={13} className="shrink-0" />
            <span>Open Link in Split View</span>
          </button>

          <button
            type="button"
            onClick={(e) =>
              handleAction(e, () => {
                if (params.linkURL) {
                  navigator.clipboard.writeText(params.linkURL);
                  onCopyText?.(params.linkURL);
                }
              })
            }
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <Copy size={13} className="shrink-0" />
            <span>Copy Link Address</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => params.linkURL && onDownloadUrl?.(params.linkURL))}
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <Download size={13} className="shrink-0" />
            <span>Save Link As...</span>
          </button>
        </div>
      )}

      {/* ═══ Image / Media Context Actions ═══ */}
      {isImage && (
        <div className="mb-1 border-b border-white/10 pb-1">
          <button
            type="button"
            onClick={(e) => handleAction(e, () => onOpenNewTab?.(params.srcURL))}
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <ImageIcon size={13} className="shrink-0" />
            <span>Open Image in New Tab</span>
          </button>

          <button
            type="button"
            onClick={(e) =>
              handleAction(e, () => {
                if (params.srcURL) {
                  navigator.clipboard.writeText(params.srcURL);
                  onCopyText?.(params.srcURL);
                }
              })
            }
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <Copy size={13} className="shrink-0" />
            <span>Copy Image Address</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => params.srcURL && onDownloadUrl?.(params.srcURL))}
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <Download size={13} className="shrink-0" />
            <span>Save Image As...</span>
          </button>
        </div>
      )}

      {/* ═══ Text Selection Actions ═══ */}
      {hasSelection && (
        <div className="mb-1 border-b border-white/10 pb-1">
          <button
            type="button"
            onClick={(e) =>
              handleAction(e, () => {
                if (params.selectionText) {
                  navigator.clipboard.writeText(params.selectionText);
                  onCopyText?.(params.selectionText);
                }
              })
            }
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Copy size={13} className="shrink-0" />
              <span>Copy</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Ctrl+C</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => params.selectionText && onSearchSelection?.(params.selectionText))}
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-[#FF6B00]/20 hover:text-[#FF6B00] text-zinc-200 transition-colors cursor-pointer"
          >
            <Search size={13} className="shrink-0" />
            <span className="truncate">Search Google for &ldquo;{truncatedSelection}&rdquo;</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => params.selectionText && onTranslateSelection?.(params.selectionText))}
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <Languages size={13} className="shrink-0" />
            <span>Translate with Google</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => params.selectionText && onReadAloud?.(params.selectionText))}
            className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <Volume2 size={13} className="shrink-0" />
            <span>Read Aloud</span>
          </button>
        </div>
      )}

      {/* ═══ Editable Input Actions (Undo, Redo, Cut, Paste) ═══ */}
      {params.isEditable && (
        <div className="mb-1 border-b border-white/10 pb-1">
          <button
            type="button"
            onClick={(e) => handleAction(e, onUndo)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Undo2 size={13} />
              <span>Undo</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Ctrl+Z</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, onRedo)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Redo2 size={13} />
              <span>Redo</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Ctrl+Y</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, onCut)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Scissors size={13} />
              <span>Cut</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Ctrl+X</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, onPaste)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ClipboardPaste size={13} />
              <span>Paste</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Ctrl+V</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, onSelectAll)}
            className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Check size={13} />
              <span>Select All</span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">Ctrl+A</span>
          </button>
        </div>
      )}

      {/* ═══ Standard Browser Page Actions ═══ */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={(e) => handleAction(e, onFindInPage)}
          className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search size={13} />
            <span>Find in Page...</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">Ctrl+F</span>
        </button>

        <button
          type="button"
          onClick={(e) => handleAction(e, onPrint)}
          className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Printer size={13} />
            <span>Print...</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">Ctrl+P</span>
        </button>

        <button
          type="button"
          onClick={(e) => handleAction(e, onToggleDarkMode)}
          className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
        >
          <Sparkles size={13} className="text-amber-400" />
          <span>Toggle Night Mode</span>
        </button>

        <div className="my-1 border-t border-white/10" />

        {/* Developer & Inspection Tools */}
        <button
          type="button"
          onClick={(e) => handleAction(e, () => params.pageURL && onViewSource?.(params.pageURL))}
          className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Code2 size={13} />
            <span>View Page Source</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">Ctrl+U</span>
        </button>

        <button
          type="button"
          onClick={(e) => handleAction(e, () => onInspectElement?.(params.x, params.y))}
          className="w-full px-2.5 py-1.5 flex items-center justify-between rounded-lg hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer font-medium"
        >
          <div className="flex items-center gap-2">
            <Eye size={13} className="text-blue-400" />
            <span>Inspect Element</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">F12</span>
        </button>
      </div>
    </div>
  );
}
