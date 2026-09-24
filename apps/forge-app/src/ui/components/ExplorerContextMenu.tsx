import React, { useEffect, useRef } from "react";
import {
  Code2,
  FolderOpen,
  Terminal,
  Copy,
  ExternalLink,
  Edit2,
  Trash2,
  FilePlus,
  FolderPlus,
  Search,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { TreeNode } from "./ideExplorerData";

interface Props {
  node: TreeNode;
  x: number;
  y: number;
  onClose: () => void;
  onPreviewCode?: (node: TreeNode) => void;
  onOpenInSystem?: (node: TreeNode) => void;
  onOpenInVsCode?: (node: TreeNode) => void;
  onRevealInExplorer?: (node: TreeNode) => void;
  onOpenInTerminal?: (node: TreeNode) => void;
  onCopyPath?: (node: TreeNode, relative?: boolean) => void;
  onNewFile?: (parentNode: TreeNode) => void;
  onNewFolder?: (parentNode: TreeNode) => void;
  onRename?: (node: TreeNode) => void;
  onDelete?: (node: TreeNode) => void;
  onToggleExpand?: (node: TreeNode) => void;
  onSearchInFolder?: (node: TreeNode) => void;
  isExpanded?: boolean;
}

export function ExplorerContextMenu({
  node,
  x,
  y,
  onClose,
  onPreviewCode,
  onOpenInSystem,
  onOpenInVsCode,
  onRevealInExplorer,
  onOpenInTerminal,
  onCopyPath,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onToggleExpand,
  onSearchInFolder,
  isExpanded,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
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

  // Adjust menu position so it stays fully inside the viewport
  const menuWidth = 230;
  const menuHeight = node.isFolder ? 310 : 340;
  const adjustedX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 12));
  const adjustedY = Math.max(10, Math.min(y, window.innerHeight - menuHeight - 12));

  const handleAction = (e: React.MouseEvent, action?: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (action) action();
    } catch (err) {
      console.warn("Context menu action failed:", err);
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
      className="fixed z-[10060] w-[230px] bg-[#252526] border border-[#454545] rounded-md shadow-2xl py-1 text-xs text-[#cccccc] font-sans select-none animate-in fade-in zoom-in-95 duration-75 ring-1 ring-black/40"
    >
      {/* Header with target name */}
      <div className="px-3 py-1 mb-1 border-b border-[#333333] flex items-center justify-between text-[11px] text-zinc-400">
        <span className="truncate font-semibold text-white/90 max-w-[150px]">
          {node.name}
        </span>
        <span className="text-[10px] uppercase font-mono text-zinc-500">
          {node.isFolder ? "Folder" : node.type || "File"}
        </span>
      </div>

      {node.isFolder ? (
        /* ═══ Folder Actions ═══ */
        <>
          <button
            type="button"
            onClick={(e) => handleAction(e, () => onNewFile?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <FilePlus size={13} className="text-zinc-400 group-hover:text-white" />
              <span>New File...</span>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onNewFolder?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <FolderPlus size={13} className="text-zinc-400 group-hover:text-white" />
              <span>New Folder...</span>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onSearchInFolder?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Find in Folder...</span>
            </div>
            <span className="text-[10px] text-zinc-500 group-hover:text-blue-200 font-mono">
              ⇧⌥F
            </span>
          </button>

          <div className="my-1 border-t border-[#333333]" />

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onRevealInExplorer?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Reveal in File Explorer</span>
            </div>
            <span className="text-[10px] text-zinc-500 group-hover:text-blue-200 font-mono">
              ⇧⌥R
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onOpenInTerminal?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Open in Integrated Terminal</span>
            </div>
          </button>

          <div className="my-1 border-t border-[#333333]" />

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onCopyPath?.(node, true))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Copy size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Copy Relative Path</span>
            </div>
            <span className="text-[10px] text-zinc-500 group-hover:text-blue-200 font-mono">
              ⇧⌥C
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onCopyPath?.(node, false))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Copy size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Copy Absolute Path</span>
            </div>
          </button>

          <div className="my-1 border-t border-[#333333]" />

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onToggleExpand?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown size={13} className="text-zinc-400 group-hover:text-white" />
              ) : (
                <ChevronRight size={13} className="text-zinc-400 group-hover:text-white" />
              )}
              <span>{isExpanded ? "Collapse Folder" : "Expand Folder"}</span>
            </div>
          </button>

          {node.id !== "root-forge" && (
            <>
              <div className="my-1 border-t border-[#333333]" />
              <button
                type="button"
                onClick={(e) => handleAction(e, () => onRename?.(node))}
                className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Edit2 size={13} className="text-zinc-400 group-hover:text-white" />
                  <span>Rename...</span>
                </div>
                <span className="text-[10px] text-zinc-500 group-hover:text-blue-200 font-mono">
                  F2
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => handleAction(e, () => onDelete?.(node))}
                className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-rose-900/60 text-rose-300 hover:text-white transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={13} className="text-rose-400 group-hover:text-white" />
                  <span>Delete Folder</span>
                </div>
                <span className="text-[10px] text-rose-400/70 group-hover:text-white font-mono">
                  Del
                </span>
              </button>
            </>
          )}
        </>
      ) : (
        /* ═══ File Actions ═══ */
        <>
          <button
            type="button"
            onClick={(e) => handleAction(e, () => onPreviewCode?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group font-medium"
          >
            <div className="flex items-center gap-2">
              <Eye size={13} className="text-blue-400 group-hover:text-white" />
              <span>Preview Code</span>
            </div>
            <span className="text-[10px] text-zinc-500 group-hover:text-blue-200 font-mono">
              Enter
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onOpenInVsCode?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Code2 size={13} className="text-[#3178c6] group-hover:text-white" />
              <span>Open in VS Code</span>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onOpenInSystem?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <ExternalLink size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Open in System Editor</span>
            </div>
          </button>

          <div className="my-1 border-t border-[#333333]" />

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onRevealInExplorer?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Reveal in File Explorer</span>
            </div>
            <span className="text-[10px] text-zinc-500 group-hover:text-blue-200 font-mono">
              ⇧⌥R
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onOpenInTerminal?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Open in Integrated Terminal</span>
            </div>
          </button>

          <div className="my-1 border-t border-[#333333]" />

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onCopyPath?.(node, true))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Copy size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Copy Relative Path</span>
            </div>
            <span className="text-[10px] text-zinc-500 group-hover:text-blue-200 font-mono">
              ⇧⌥C
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onCopyPath?.(node, false))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Copy size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Copy Absolute Path</span>
            </div>
          </button>

          <div className="my-1 border-t border-[#333333]" />

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onRename?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Edit2 size={13} className="text-zinc-400 group-hover:text-white" />
              <span>Rename...</span>
            </div>
            <span className="text-[10px] text-zinc-500 group-hover:text-blue-200 font-mono">
              F2
            </span>
          </button>

          <button
            type="button"
            onClick={(e) => handleAction(e, () => onDelete?.(node))}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left hover:bg-rose-900/60 text-rose-300 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Trash2 size={13} className="text-rose-400 group-hover:text-white" />
              <span>Delete File</span>
            </div>
            <span className="text-[10px] text-rose-400/70 group-hover:text-white font-mono">
              Del
            </span>
          </button>
        </>
      )}
    </div>
  );
}
