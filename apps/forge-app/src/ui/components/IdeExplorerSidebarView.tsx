import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Play,
  Globe,
  RotateCw,
  MoreHorizontal,
  MinusSquare,
  PlusSquare,
  Search,
  X,
  Code2,
  FileJson,
  Image as ImageIcon,
  Check,
  Copy,
  FolderTree,
  Eye,
} from "lucide-react";
import { useProjectsStore } from "../../core/projects/useProjectsStore";
import { useTerminalStore } from "../../core/terminal/useTerminalStore";
import {
  type TreeNode,
  type FileType,
  buildRepositoryTree,
  ALL_FORGE_FILES,
  isValidFilePath,
} from "./ideExplorerData";
import { ExplorerContextMenu } from "./ExplorerContextMenu";
import { FileCodePreviewModal } from "./FileCodePreviewModal";

export type { TreeNode, FileType };
export { ALL_FORGE_FILES };

export const COMPLETE_FORGE_TREE = buildRepositoryTree();

interface Props {
  onNavigate?: (url: string) => void;
  onOpenModal?: () => void;
}

interface ContextMenuState {
  node: TreeNode;
  x: number;
  y: number;
}

export function IdeExplorerSidebarView({ onNavigate, onOpenModal }: Props) {
  const {
    runningProcesses,
    runProjectScript,
    bindPortToBrowserTab,
  } = useProjectsStore();

  const [projectTree, setProjectTree] = useState<TreeNode>(() => buildRepositoryTree());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Code preview modal state
  const [previewFile, setPreviewFile] = useState<TreeNode | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Quick toast feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((current) => (current === msg ? null : current)), 2600);
  };

  // Initially expanded folder IDs matching the user's reference screenshot:
  // Forge -> apps -> forge-app -> src -> core -> focus
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    new Set([
      "root-forge",
      "folder-apps",
      "folder-apps/forge-app",
      "folder-apps/forge-app/src",
      "folder-apps/forge-app/src/core",
      "folder-apps/forge-app/src/core/focus",
    ])
  );

  // Pre-select useFocusPlayerStore.ts as in the reference screenshot
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>({
    id: "file-apps/forge-app/src/core/focus/useFocusPlayerStore.ts",
    name: "useFocusPlayerStore.ts",
    path: "C:\\Users\\josed\\Documents\\Rerpositories\\Forge\\apps\\forge-app\\src\\core\\focus\\useFocusPlayerStore.ts",
    isFolder: false,
    type: "ts",
  });

  const [searchFilter, setSearchFilter] = useState("");
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // Dynamically sync with live git files if Electron terminal bridge is available
  const refreshGitStatus = async () => {
    setIsRefreshing(true);
    try {
      const term = (window as any).forge?.terminal;
      if (term?.exec) {
        // Use cmd shell to avoid PowerShell profile banner outputs
        const [lsRes, statusRes] = await Promise.all([
          term.exec("git ls-files", "cmd").catch(() => null),
          term.exec("git status -s", "cmd").catch(() => null),
        ]);

        let paths = ALL_FORGE_FILES;
        if (lsRes?.stdout) {
          const parsed = lsRes.stdout
            .trim()
            .split(/\r?\n/)
            .map((l: string) => l.trim())
            .filter((l: string) => isValidFilePath(l));
          if (parsed.length > 30) {
            paths = Array.from(new Set([...parsed, ...ALL_FORGE_FILES]));
          }
        }

        let modifiedPaths: string[] = [
          "apps/forge-app/src/ui/components/IdeExplorerSidebarView.tsx",
        ];
        if (statusRes?.stdout) {
          const lines = statusRes.stdout.split(/\r?\n/);
          const detected = lines
            .map((l: string) => l.replace(/^[ MADRCU?!]{1,2}\s+/, "").trim())
            .filter((l: string) => isValidFilePath(l));
          if (detected.length > 0) modifiedPaths = detected;
        }

        setProjectTree(buildRepositoryTree(paths, modifiedPaths));
      }
    } catch (e) {
      console.warn("Git explorer sync failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshGitStatus();
  }, []);

  const toggleFolder = (id: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collapseAll = () => {
    setExpandedFolderIds(new Set(["root-forge"]));
  };

  const expandAll = () => {
    const allFolderIds: string[] = [];
    const collect = (node: TreeNode) => {
      if (node.isFolder) {
        allFolderIds.push(node.id);
        if (node.children) node.children.forEach(collect);
      }
    };
    collect(projectTree);
    setExpandedFolderIds(new Set(allFolderIds));
  };

  // Filter tree based on search
  const filteredTree = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return projectTree;

    const filterNode = (node: TreeNode): TreeNode | null => {
      if (node.isFolder) {
        const matchingChildren = (node.children || [])
          .map(filterNode)
          .filter((n): n is TreeNode => n !== null);

        if (matchingChildren.length > 0 || node.name.toLowerCase().includes(q)) {
          return { ...node, children: matchingChildren };
        }
        return null;
      }
      return node.name.toLowerCase().includes(q) ? node : null;
    };

    return filterNode(projectTree) || { ...projectTree, children: [] };
  }, [searchFilter, projectTree]);

  // When searching, auto-expand all folders containing matches
  useEffect(() => {
    if (searchFilter.trim()) {
      const allIds: string[] = [];
      const collect = (node: TreeNode) => {
        if (node.isFolder) {
          allIds.push(node.id);
          if (node.children) node.children.forEach(collect);
        }
      };
      collect(filteredTree);
      setExpandedFolderIds(new Set(allIds));
    }
  }, [searchFilter, filteredTree]);

  const copySelectedPath = () => {
    if (selectedFile?.path) {
      try {
        navigator.clipboard?.writeText(selectedFile.path).catch(() => {});
      } catch {}
      setCopiedPath(true);
      showToast("Absolute path copied to clipboard");
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  /* ═══ Context Menu Action Handlers ═══ */

  const handlePreviewCode = (node: TreeNode) => {
    if (!node.isFolder) {
      setPreviewFile(node);
      setIsPreviewOpen(true);
    }
  };

  const handleOpenInSystem = (node: TreeNode) => {
    const forge = (window as any).forge;
    if (forge?.downloads?.openFile) {
      forge.downloads.openFile(node.path);
      showToast(`Opened ${node.name} in system editor`);
    } else {
      const term = (window as any).forge?.terminal;
      if (term?.exec) {
        term.exec(`start "" "${node.path}"`, "cmd");
        showToast(`Opened ${node.name} in system editor`);
      } else {
        handlePreviewCode(node);
      }
    }
  };

  const handleOpenInVsCode = (node: TreeNode) => {
    const term = (window as any).forge?.terminal;
    if (term?.exec) {
      term.exec(`code -g "${node.path}"`, "cmd").then(() => {
        showToast(`Opened ${node.name} in VS Code`);
      });
    } else {
      showToast(`Command: code "${node.path}"`);
    }
  };

  const handleRevealInExplorer = (node: TreeNode) => {
    const forge = (window as any).forge;
    if (forge?.downloads?.showInFolder) {
      forge.downloads.showInFolder(node.path);
      showToast("Revealed in Windows File Explorer");
    } else {
      const term = (window as any).forge?.terminal;
      if (term?.exec) {
        term.exec(`explorer /select,"${node.path}"`, "cmd");
        showToast("Revealed in Windows File Explorer");
      } else {
        showToast(`Location: ${node.path}`);
      }
    }
  };

  const handleOpenInTerminal = (node: TreeNode) => {
    const targetDir = node.isFolder
      ? node.path
      : node.path.substring(0, node.path.lastIndexOf("\\"));

    try {
      useTerminalStore.getState().setCwd(targetDir);
      showToast(`Terminal CWD set to ${node.name}`);
    } catch {
      const term = (window as any).forge?.terminal;
      if (term?.exec) {
        term.exec(`start cmd /k "cd /d ${targetDir}"`, "cmd");
        showToast(`Launched terminal in ${node.name}`);
      }
    }
  };

  const handleCopyPath = (node: TreeNode, relative?: boolean) => {
    const rootPath = "C:\\Users\\josed\\Documents\\Rerpositories\\Forge";
    const textToCopy = relative
      ? node.path.replace(rootPath, "").replace(/^[\\/]/, "").replace(/\\/g, "/")
      : node.path;

    try {
      navigator.clipboard?.writeText(textToCopy).catch(() => {});
    } catch {}
    showToast(`Copied ${relative ? "relative" : "absolute"} path to clipboard`);
  };

  const handleSearchInFolder = (node: TreeNode) => {
    setShowSearchInput(true);
    setSearchFilter(node.name);
  };

  const handleNewFile = (parentNode: TreeNode) => {
    const fileName = window.prompt(`Enter new file name in '${parentNode.name}':`, "component.tsx");
    if (fileName && fileName.trim()) {
      const cleanName = fileName.trim();
      const term = (window as any).forge?.terminal;
      const fullNewPath = `${parentNode.path}\\${cleanName}`;

      if (term?.exec) {
        term.exec(`type nul > "${fullNewPath}"`, "cmd").then(() => {
          refreshGitStatus();
          showToast(`Created file: ${cleanName}`);
        });
      } else {
        showToast(`Created file: ${cleanName}`);
      }
    }
  };

  const handleNewFolder = (parentNode: TreeNode) => {
    const folderName = window.prompt(`Enter new folder name in '${parentNode.name}':`, "new-folder");
    if (folderName && folderName.trim()) {
      const cleanName = folderName.trim();
      const term = (window as any).forge?.terminal;
      const fullNewPath = `${parentNode.path}\\${cleanName}`;

      if (term?.exec) {
        term.exec(`mkdir "${fullNewPath}"`, "cmd").then(() => {
          refreshGitStatus();
          showToast(`Created folder: ${cleanName}`);
        });
      } else {
        showToast(`Created folder: ${cleanName}`);
      }
    }
  };

  const handleRename = (node: TreeNode) => {
    const newName = window.prompt(`Rename '${node.name}' to:`, node.name);
    if (newName && newName.trim() && newName.trim() !== node.name) {
      const clean = newName.trim();
      const term = (window as any).forge?.terminal;
      if (term?.exec) {
        term.exec(`ren "${node.path}" "${clean}"`, "cmd").then(() => {
          refreshGitStatus();
          showToast(`Renamed to ${clean}`);
        });
      } else {
        showToast(`Renamed to ${clean}`);
      }
    }
  };

  const handleDelete = (node: TreeNode) => {
    if (window.confirm(`Are you sure you want to delete '${node.name}'?`)) {
      const term = (window as any).forge?.terminal;
      if (term?.exec) {
        const cmd = node.isFolder ? `rmdir /s /q "${node.path}"` : `del /f /q "${node.path}"`;
        term.exec(cmd, "cmd").then(() => {
          refreshGitStatus();
          showToast(`Deleted ${node.name}`);
        });
      } else {
        showToast(`Deleted ${node.name}`);
      }
    }
  };

  // Icon renderer matching VS Code / Antigravity file icons
  const renderIcon = (node: TreeNode, isOpen: boolean) => {
    if (node.isFolder) {
      if (node.specialIcon === "github") {
        return (
          <div className="w-4 h-4 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="#a074c4">
              <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38v-1.34c-2.23.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 018 3.87c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .22.14.47.55.38A8 8 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </div>
        );
      }
      if (node.specialIcon === "src") {
        return (
          <div className="w-4 h-4 flex items-center justify-center shrink-0 text-[#4d78cc]">
            <Code2 size={13} />
          </div>
        );
      }
      if (node.specialIcon === "node") {
        return (
          <div className="w-4 h-4 flex items-center justify-center shrink-0 text-[#68a063]">
            <Folder size={13} fill="currentColor" fillOpacity={0.2} />
          </div>
        );
      }
      return isOpen ? (
        <FolderOpen size={14} className="text-[#c99a5e] shrink-0" fill="#c99a5e" fillOpacity={0.3} />
      ) : (
        <Folder size={14} className="text-[#dcb67a] shrink-0" fill="#dcb67a" fillOpacity={0.3} />
      );
    }

    // Specific file badges
    switch (node.type) {
      case "ts":
        return (
          <span className="w-3.5 h-3.5 rounded-[2px] bg-[#3178c6] text-white text-[8px] font-black flex items-center justify-center font-mono shrink-0 select-none shadow-2xs">
            TS
          </span>
        );
      case "tsx":
        return (
          <span className="w-3.5 h-3.5 rounded-[2px] bg-[#2b7489] text-white text-[7px] font-black flex items-center justify-center font-mono shrink-0 select-none shadow-2xs">
            TSX
          </span>
        );
      case "json":
        return <FileJson size={13} className="text-[#cbcb41] shrink-0" />;
      case "css":
        return (
          <span className="w-3.5 h-3.5 rounded-[2px] bg-[#42a5f5] text-white text-[8px] font-bold flex items-center justify-center font-mono shrink-0 select-none">
            #
          </span>
        );
      case "html":
        return <FileCode size={13} className="text-[#e44d26] shrink-0" />;
      case "md":
        return <FileText size={13} className="text-[#42a5f5] shrink-0" />;
      case "yaml":
        return <FileText size={13} className="text-[#cb171e] shrink-0" />;
      case "js":
        return (
          <span className="w-3.5 h-3.5 rounded-[2px] bg-[#f7df1e] text-black text-[8px] font-black flex items-center justify-center font-mono shrink-0 select-none">
            JS
          </span>
        );
      case "ps1":
        return (
          <span className="w-3.5 h-3.5 rounded-[2px] bg-[#012456] text-[#29b6f6] text-[8px] font-black flex items-center justify-center font-mono shrink-0 select-none">
            &gt;_
          </span>
        );
      case "img":
        return <ImageIcon size={13} className="text-[#26a69a] shrink-0" />;
      default:
        return <FileCode size={13} className="text-zinc-400 shrink-0" />;
    }
  };

  // Render tree node recursively
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isOpen = expandedFolderIds.has(node.id);
    const isSelected = selectedFile?.id === node.id;
    const paddingLeft = depth * 14 + 8;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={() => {
            if (node.isFolder) {
              toggleFolder(node.id);
            } else {
              setSelectedFile(node);
            }
          }}
          onDoubleClick={() => {
            if (node.isFolder) {
              toggleFolder(node.id);
            } else {
              handlePreviewCode(node);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelectedFile(node);
            setContextMenu({
              node,
              x: e.clientX,
              y: e.clientY,
            });
          }}
          style={{ paddingLeft: `${paddingLeft}px` }}
          className={`h-[22px] flex items-center justify-between pr-3 group cursor-pointer transition-colors select-none text-[12px] font-sans ${
            isSelected
              ? "bg-[#094771] text-white font-medium"
              : "hover:bg-[#2a2d2e] text-[#cccccc]"
          }`}
          title={node.path}
        >
          {/* Left: Chevron + Icon + Name */}
          <div className="flex items-center gap-1.5 min-w-0">
            {node.isFolder ? (
              <span className="w-3 h-3 flex items-center justify-center text-zinc-400 shrink-0">
                {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </span>
            ) : (
              <span className="w-3 shrink-0" />
            )}

            {renderIcon(node, isOpen)}

            <span
              className={`truncate ${
                node.isModified ? "text-[#e5c07b]" : ""
              }`}
            >
              {node.name}
            </span>
          </div>

          {/* Right: Git modified indicator dot */}
          {node.isModified && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#e5a953] shrink-0"
              title="Modified"
            />
          )}
        </div>

        {/* Children if open */}
        {node.isFolder && isOpen && node.children && (
          <div className="flex flex-col">
            {node.children.length === 0 ? (
              <div
                style={{ paddingLeft: `${paddingLeft + 20}px` }}
                className="h-5 flex items-center text-[10px] text-zinc-500 italic select-none"
              >
                (empty)
              </div>
            ) : (
              node.children.map((child) => renderTreeNode(child, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onContextMenu={(e) => {
        // Background right click on empty area opens root options
        e.preventDefault();
        setContextMenu({
          node: projectTree,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      data-ignore-browser-context="true"
      className="relative flex-1 w-full h-full overflow-hidden flex flex-col bg-[#181818] text-[#cccccc] select-none text-xs font-sans border-r border-[#2d2d2d]"
    >
      {/* ═══ Header ═══ */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2d2d2d] bg-[#181818] shrink-0">
        <div className="flex items-center gap-1.5">
          <FolderTree size={13} className="text-zinc-400" />
          <span className="text-[11px] font-semibold text-[#cccccc] tracking-wide">
            Explorer
          </span>
        </div>

        <div className="flex items-center gap-1 text-[#cccccc]">
          <button
            type="button"
            onClick={() => setShowSearchInput((prev) => !prev)}
            title="Filter by filename"
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
              showSearchInput || searchFilter ? "bg-[#094771] text-white" : "hover:bg-white/10 hover:text-white"
            }`}
          >
            <Search size={12} />
          </button>

          <button
            type="button"
            onClick={expandAll}
            title="Expand All Folders"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <PlusSquare size={13} />
          </button>

          <button
            type="button"
            onClick={collapseAll}
            title="Collapse Folders in Explorer"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <MinusSquare size={13} />
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchFilter("");
              refreshGitStatus();
            }}
            title="Refresh Explorer & Git Status"
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer ${
              isRefreshing ? "animate-spin text-blue-400" : ""
            }`}
          >
            <RotateCw size={13} />
          </button>

          <button
            type="button"
            onClick={onOpenModal}
            title="More Actions / Project Hub"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* ═══ Search / Filter Bar (if toggled) ═══ */}
      {showSearchInput && (
        <div className="p-2 border-b border-[#2d2d2d] bg-[#1c1c1c] animate-in fade-in duration-100">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[2px] bg-[#252526] border border-[#3c3c3c] focus-within:border-[#007fd4]">
            <Search size={11} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by name (e.g. store, focus, tsx)..."
              className="flex-1 bg-transparent text-[11px] text-white outline-none placeholder-zinc-500 min-w-0"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Project Quick Launcher Banner ═══ */}
      <div className="px-3 py-2 border-b border-[#2d2d2d] bg-[#1e1e1e] flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dev Server Active</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onNavigate) onNavigate("http://localhost:5173");
              else bindPortToBrowserTab(5173, "Forge Dev App");
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[10px] font-semibold transition-colors cursor-pointer"
            title="Open localhost:5173 in browser tab"
          >
            <Globe size={10} />
            <span>:5173</span>
          </button>
        </div>

        {/* Quick Scripts Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          <button
            type="button"
            onClick={() => runProjectScript("C:\\Users\\josed\\Documents\\Rerpositories\\Forge", "dev")}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-emerald-400 text-[10px] font-mono transition-colors cursor-pointer shrink-0 border border-white/5"
          >
            <Play size={9} fill="currentColor" />
            <span>pnpm dev</span>
          </button>

          <button
            type="button"
            onClick={() => runProjectScript("C:\\Users\\josed\\Documents\\Rerpositories\\Forge", "build")}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-mono transition-colors cursor-pointer shrink-0 border border-white/5"
          >
            <Play size={9} />
            <span>build</span>
          </button>

          <button
            type="button"
            onClick={() => runProjectScript("C:\\Users\\josed\\Documents\\Rerpositories\\Forge", "site")}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-mono transition-colors cursor-pointer shrink-0 border border-white/5"
          >
            <Play size={9} />
            <span>site</span>
          </button>
        </div>
      </div>

      {/* ═══ Explorer Tree ═══ */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-1">
        {/* Accordion: Forge Root */}
        <div className="flex flex-col">
          {/* Root Header (v Forge) */}
          <button
            type="button"
            onClick={() => toggleFolder("root-forge")}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({
                node: projectTree,
                x: e.clientX,
                y: e.clientY,
              });
            }}
            className="w-full px-2 py-1 flex items-center justify-between text-left hover:bg-[#2a2d2e] transition-colors cursor-pointer font-bold text-[#cccccc] text-[11px] uppercase tracking-wider select-none"
          >
            <div className="flex items-center gap-1">
              {expandedFolderIds.has("root-forge") ? (
                <ChevronDown size={13} className="text-[#cccccc]" />
              ) : (
                <ChevronRight size={13} className="text-[#cccccc]" />
              )}
              <span>Forge</span>
            </div>

            <span className="text-[10px] text-zinc-500 font-mono normal-case tracking-normal">
              main*
            </span>
          </button>

          {/* Children of Forge */}
          {expandedFolderIds.has("root-forge") && filteredTree.children && (
            <div className="flex flex-col">
              {filteredTree.children.map((child) => renderTreeNode(child, 0))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Active Selected File Status Footer ═══ */}
      {selectedFile && (
        <div className="px-3 py-1.5 bg-[#252526] border-t border-[#2d2d2d] flex items-center justify-between text-[10px] text-zinc-400 font-mono truncate shrink-0">
          <div
            onClick={() => handlePreviewCode(selectedFile)}
            className="flex items-center gap-1.5 truncate min-w-0 pr-2 cursor-pointer hover:text-white"
            title="Click to preview code"
          >
            {renderIcon(selectedFile, false)}
            <span className="text-white font-semibold truncate hover:underline">{selectedFile.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handlePreviewCode(selectedFile)}
              title="Preview file code"
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5 text-[9px] font-sans"
            >
              <Eye size={10} className="text-blue-400" />
              <span>View</span>
            </button>

            <button
              type="button"
              onClick={copySelectedPath}
              title={copiedPath ? "Copied to clipboard!" : "Copy absolute path"}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-sans"
            >
              {copiedPath ? (
                <>
                  <Check size={10} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={10} />
                  <span>Path</span>
                </>
              )}
            </button>
            <span className="text-zinc-500 text-[9px] uppercase font-sans border-l border-zinc-700 pl-1.5">
              {selectedFile.type || "file"}
            </span>
          </div>
        </div>
      )}

      {/* ═══ Bottom Accordion: Outline ═══ */}
      <div className="border-t border-[#2d2d2d] bg-[#181818] shrink-0">
        <button
          type="button"
          onClick={() => setIsOutlineOpen((prev) => !prev)}
          className="w-full px-2 py-1 flex items-center gap-1 hover:bg-[#2a2d2e] text-left text-[11px] font-bold text-[#cccccc] uppercase tracking-wider select-none cursor-pointer"
        >
          {isOutlineOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span>Outline</span>
        </button>

        {isOutlineOpen && (
          <div className="px-5 py-2 text-zinc-500 text-[11px] italic">
            No symbols found in current active document.
          </div>
        )}
      </div>

      {/* ═══ Toast Notification Bubble ═══ */}
      {toastMessage && (
        <div className="absolute bottom-10 left-3 right-3 z-50 px-2.5 py-1.5 rounded bg-zinc-900 border border-[#007acc]/40 shadow-2xl text-[11px] text-white flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Check size={12} className="text-blue-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* ═══ Right-Click Context Menu ═══ */}
      {contextMenu && (
        <ExplorerContextMenu
          node={contextMenu.node}
          x={contextMenu.x}
          y={contextMenu.y}
          isExpanded={expandedFolderIds.has(contextMenu.node.id)}
          onClose={() => setContextMenu(null)}
          onPreviewCode={handlePreviewCode}
          onOpenInSystem={handleOpenInSystem}
          onOpenInVsCode={handleOpenInVsCode}
          onRevealInExplorer={handleRevealInExplorer}
          onOpenInTerminal={handleOpenInTerminal}
          onCopyPath={handleCopyPath}
          onSearchInFolder={handleSearchInFolder}
          onToggleExpand={(node) => toggleFolder(node.id)}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}

      {/* ═══ Code Preview / Viewer Modal ═══ */}
      <FileCodePreviewModal
        node={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onOpenInVsCode={handleOpenInVsCode}
        onRevealInExplorer={handleRevealInExplorer}
      />
    </div>
  );
}
