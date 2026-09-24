import React, { useState, useEffect } from "react";
import {
  X,
  Copy,
  Check,
  Code2,
  FolderOpen,
  WrapText,
  FileText,
  FileCode,
  FileJson,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { TreeNode, FileType } from "./ideExplorerData";

interface Props {
  node: TreeNode | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInVsCode?: (node: TreeNode) => void;
  onRevealInExplorer?: (node: TreeNode) => void;
}

export function FileCodePreviewModal({
  node,
  isOpen,
  onClose,
  onOpenInVsCode,
  onRevealInExplorer,
}: Props) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load real file content from disk when modal opens for a file
  useEffect(() => {
    if (!isOpen || !node || node.isFolder) {
      setContent("");
      setErrorMsg(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    const loadContent = async () => {
      try {
        const term = (window as any).forge?.terminal;
        if (term?.exec) {
          // Read actual file content using cmd type command
          const res = await term.exec(`type "${node.path}"`, "cmd");
          if (isMounted) {
            if (res?.stdout !== undefined && res.stdout !== null && !res.stderr) {
              setContent(res.stdout);
            } else if (res?.stdout) {
              setContent(res.stdout);
            } else {
              setContent(`// Unable to read file directly\n// Path: ${node.path}\n\n${res?.stderr || "Empty file or permission restricted."}`);
            }
          }
        } else {
          // Browser fallback if running outside Electron
          if (isMounted) {
            setContent(
              `// ${node.name}\n// Absolute Path: ${node.path}\n// Environment: Forge Dev App (Vite Web View)\n\nexport default function ${node.name.replace(/[^a-zA-Z0-9]/g, "_")}() {\n  // File loaded in Forge IDE Native Explorer\n  console.log("Viewing ${node.name}");\n}`
            );
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || "Failed to read file.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [isOpen, node]);

  if (!isOpen || !node) return null;

  const copyCode = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const lines = content.split("\n");
  const lineCount = lines.length;
  const charCount = content.length;

  const renderBadge = (type?: FileType) => {
    switch (type) {
      case "ts":
        return <span className="px-1.5 py-0.5 rounded bg-[#3178c6] text-white text-[10px] font-black font-mono">TS</span>;
      case "tsx":
        return <span className="px-1.5 py-0.5 rounded bg-[#2b7489] text-white text-[10px] font-black font-mono">TSX</span>;
      case "json":
        return <FileJson size={16} className="text-[#cbcb41]" />;
      case "css":
        return <span className="px-1.5 py-0.5 rounded bg-[#42a5f5] text-white text-[10px] font-bold font-mono"># CSS</span>;
      case "html":
        return <FileCode size={16} className="text-[#e44d26]" />;
      case "md":
        return <FileText size={16} className="text-[#42a5f5]" />;
      case "yaml":
        return <FileText size={16} className="text-[#cb171e]" />;
      case "js":
        return <span className="px-1.5 py-0.5 rounded bg-[#f7df1e] text-black text-[10px] font-black font-mono">JS</span>;
      default:
        return <Code2 size={16} className="text-zinc-400" />;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10070] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-100 select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[80vh] bg-[#1e1e1e] border border-[#3c3c3c] shadow-2xl rounded-xl overflow-hidden flex flex-col cursor-default ring-1 ring-white/10"
      >
        {/* Modal Header */}
        <div className="h-11 px-4 border-b border-[#2d2d2d] bg-[#252526] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            {renderBadge(node.type)}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate font-mono">
                {node.name}
              </span>
              <span className="text-[10px] text-zinc-400 truncate max-w-md" title={node.path}>
                {node.path}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Word wrap button */}
            <button
              type="button"
              onClick={() => setWordWrap((prev) => !prev)}
              title={wordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                wordWrap ? "bg-white/15 text-white" : "hover:bg-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              <WrapText size={14} />
            </button>

            {/* Copy button */}
            <button
              type="button"
              onClick={copyCode}
              title="Copy All Code"
              className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* VS Code button */}
            <button
              type="button"
              onClick={() => onOpenInVsCode?.(node)}
              title="Open with Visual Studio Code"
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#007acc]/20 hover:bg-[#007acc]/30 text-blue-300 border border-[#007acc]/30 text-xs transition-colors cursor-pointer"
            >
              <Code2 size={13} />
              <span>VS Code</span>
            </button>

            {/* Reveal in explorer button */}
            <button
              type="button"
              onClick={() => onRevealInExplorer?.(node)}
              title="Show in File Explorer"
              className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <FolderOpen size={14} />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded hover:bg-rose-600/30 text-zinc-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Code Viewer Body */}
        <div className="flex-1 overflow-auto bg-[#181818] p-2 flex text-xs font-mono select-text relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#181818]/80 z-10 gap-2 text-zinc-400">
              <Loader2 size={18} className="animate-spin text-blue-400" />
              <span>Reading file content...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-4 text-rose-400">{errorMsg}</div>
          ) : (
            <div className="flex w-full min-w-max">
              {/* Line numbers gutter */}
              <div className="select-none pr-4 pl-2 text-right text-zinc-600 border-r border-[#2a2a2a] shrink-0 font-mono">
                {lines.map((_, idx) => (
                  <div key={idx} className="leading-5 h-5 text-[11px]">
                    {idx + 1}
                  </div>
                ))}
              </div>

              {/* Code lines */}
              <div
                className={`pl-4 flex-1 text-zinc-200 leading-5 text-[12px] font-mono ${
                  wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
                }`}
              >
                {lines.map((line, idx) => (
                  <div key={idx} className="h-5 leading-5 hover:bg-white/5 rounded-xs px-1">
                    {line || "\u00A0"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Status Bar */}
        <div className="h-7 px-4 border-t border-[#2d2d2d] bg-[#252526] flex items-center justify-between text-[11px] text-zinc-400 font-sans shrink-0">
          <div className="flex items-center gap-3">
            <span>{lineCount} lines</span>
            <span>{charCount} characters</span>
            <span className="text-zinc-500 font-mono">{node.type?.toUpperCase() || "FILE"}</span>
          </div>

          <div className="flex items-center gap-2">
            <span>UTF-8</span>
            <span>LF</span>
          </div>
        </div>
      </div>
    </div>
  );
}
