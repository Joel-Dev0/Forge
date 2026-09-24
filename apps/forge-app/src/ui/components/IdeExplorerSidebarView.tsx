import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Play,
  Square,
  Globe,
  RotateCw,
  MoreHorizontal,
  FilePlus,
  FolderPlus,
  MinusSquare,
  Terminal,
  ExternalLink,
  Code2,
  GitBranch,
} from "lucide-react";
import { useProjectsStore } from "../../core/projects/useProjectsStore";

interface Props {
  onNavigate?: (url: string) => void;
  onOpenModal?: () => void;
}

interface TreeNode {
  id: string;
  name: string;
  isFolder: boolean;
  type?: "ts" | "tsx" | "json" | "css" | "md" | "other";
  specialIcon?: "github" | "src" | "node";
  isModified?: boolean;
  children?: TreeNode[];
}

const FORGE_PROJECT_TREE: TreeNode = {
  id: "root-forge",
  name: "Forge",
  isFolder: true,
  children: [
    {
      id: "folder-github",
      name: ".github",
      isFolder: true,
      specialIcon: "github",
      children: [
        { id: "file-workflows", name: "workflows", isFolder: true },
      ],
    },
    {
      id: "folder-apps",
      name: "apps",
      isFolder: true,
      isModified: true,
      children: [
        {
          id: "folder-forge-app",
          name: "forge-app",
          isFolder: true,
          isModified: true,
          children: [
            { id: "folder-dist", name: "dist", isFolder: true },
            { id: "folder-dist-electron", name: "dist-electron", isFolder: true },
            { id: "folder-electron", name: "electron", isFolder: true },
            { id: "folder-node-modules", name: "node_modules", isFolder: true, specialIcon: "node" },
            { id: "folder-public", name: "public", isFolder: true },
            { id: "folder-scratch", name: "scratch", isFolder: true },
            {
              id: "folder-src",
              name: "src",
              isFolder: true,
              specialIcon: "src",
              isModified: true,
              children: [
                { id: "folder-assets", name: "assets", isFolder: true },
                {
                  id: "folder-core",
                  name: "core",
                  isFolder: true,
                  isModified: true,
                  children: [
                    { id: "folder-adblock", name: "adblock", isFolder: true },
                    { id: "folder-api-monitor", name: "api-monitor", isFolder: true },
                    { id: "folder-bookmarks", name: "bookmarks", isFolder: true },
                    { id: "folder-compat", name: "compat", isFolder: true },
                    { id: "folder-console", name: "console", isFolder: true },
                    { id: "folder-downloads", name: "downloads", isFolder: true },
                    { id: "folder-engine", name: "engine", isFolder: true },
                    {
                      id: "folder-extensions",
                      name: "extensions",
                      isFolder: true,
                      isModified: true,
                      children: [
                        { id: "file-extensionTypes", name: "extensionTypes.ts", isFolder: false, type: "ts" },
                        { id: "file-useExtensionsStore", name: "useExtensionsStore.ts", isFolder: false, type: "ts" },
                        { id: "file-useIdeExtensionsStore", name: "useIdeExtensionsStore.ts", isFolder: false, type: "ts", isModified: true },
                      ],
                    },
                    { id: "folder-favorites", name: "favorites", isFolder: true },
                    {
                      id: "folder-focus",
                      name: "focus",
                      isFolder: true,
                      children: [
                        { id: "file-focusAlarm", name: "focusAlarm.ts", isFolder: false, type: "ts" },
                        { id: "file-focusPlayerTypes", name: "focusPlayerTypes.ts", isFolder: false, type: "ts" },
                        { id: "file-focusPresets", name: "focusPresets.ts", isFolder: false, type: "ts" },
                        { id: "file-onlineMusicParser", name: "onlineMusicParser.ts", isFolder: false, type: "ts" },
                        { id: "file-socialRulesets", name: "socialRulesets.ts", isFolder: false, type: "ts" },
                        { id: "file-useFocusPlayerStore", name: "useFocusPlayerStore.ts", isFolder: false, type: "ts" },
                        { id: "file-useFocusStore", name: "useFocusStore.ts", isFolder: false, type: "ts" },
                      ],
                    },
                    { id: "folder-fullscreen", name: "fullscreen", isFolder: true },
                    { id: "folder-history", name: "history", isFolder: true },
                    { id: "folder-inspector", name: "inspector", isFolder: true },
                    { id: "folder-localhost", name: "localhost", isFolder: true },
                    { id: "folder-navigation", name: "navigation", isFolder: true },
                    { id: "folder-network", name: "network", isFolder: true },
                    { id: "folder-news", name: "news", isFolder: true },
                    { id: "folder-performance", name: "performance", isFolder: true },
                    { id: "folder-privacy", name: "privacy", isFolder: true },
                    { id: "folder-projects", name: "projects", isFolder: true },
                    { id: "folder-sessions", name: "sessions", isFolder: true },
                    { id: "folder-tabs", name: "tabs", isFolder: true },
                    { id: "folder-terminal", name: "terminal", isFolder: true },
                    { id: "folder-theme", name: "theme", isFolder: true },
                    { id: "folder-vpn", name: "vpn", isFolder: true },
                    { id: "folder-wallpaper", name: "wallpaper", isFolder: true },
                    { id: "folder-workspaces", name: "workspaces", isFolder: true },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function IdeExplorerSidebarView({ onNavigate, onOpenModal }: Props) {
  const {
    projects,
    selectedProjectPath,
    runningProcesses,
    runProjectScript,
    stopProjectScript,
    bindPortToBrowserTab,
  } = useProjectsStore();

  // Expanded folders set initially matching the screenshot exactly
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    new Set([
      "root-forge",
      "folder-apps",
      "folder-forge-app",
      "folder-src",
      "folder-core",
      "folder-focus",
    ])
  );

  const [selectedFileId, setSelectedFileId] = useState<string>("file-useFocusPlayerStore");
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isScriptsOpen, setIsScriptsOpen] = useState(false);

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

  const currentProject =
    projects.find((p) => p.path === selectedProjectPath) || projects[0] || {
      name: "Forge",
      activePort: 5173,
      scripts: { dev: "pnpm --filter forge-app dev", site: "pnpm --filter forge-site dev" },
    };

  const isDevRunning = Object.values(runningProcesses).some(
    (p) => p.status === "running" && p.scriptName.includes("dev")
  ) || true; // dev server is currently running in terminal

  // Render file or folder icon
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

    // File icons
    if (node.type === "ts") {
      return (
        <span className="w-3.5 h-3.5 rounded-[2px] bg-[#3178c6] text-white text-[8px] font-black flex items-center justify-center font-mono shrink-0 select-none">
          TS
        </span>
      );
    }
    if (node.type === "tsx") {
      return (
        <span className="w-3.5 h-3.5 rounded-[2px] bg-[#2b7489] text-white text-[8px] font-black flex items-center justify-center font-mono shrink-0 select-none">
          TSX
        </span>
      );
    }
    return <FileCode size={13} className="text-zinc-400 shrink-0" />;
  };

  // Render tree node recursively
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isOpen = expandedFolderIds.has(node.id);
    const isSelected = selectedFileId === node.id;
    const paddingLeft = depth * 14 + 10;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={() => {
            if (node.isFolder) {
              toggleFolder(node.id);
            } else {
              setSelectedFileId(node.id);
            }
          }}
          style={{ paddingLeft: `${paddingLeft}px` }}
          className={`h-[22px] flex items-center justify-between pr-3 group cursor-pointer transition-colors select-none text-[12px] font-sans ${
            isSelected
              ? "bg-[#094771] text-white"
              : "hover:bg-[#2a2d2e] text-[#cccccc]"
          }`}
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
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full h-full overflow-hidden flex flex-col bg-[#181818] text-[#cccccc] select-none text-xs font-sans border-r border-[#2d2d2d]">
      {/* ═══ Header ═══ */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2d2d2d] bg-[#181818] shrink-0">
        <span className="text-[11px] font-semibold text-[#cccccc] tracking-wide">
          Explorer
        </span>

        <div className="flex items-center gap-1 text-[#cccccc]">
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
            onClick={() => {}}
            title="New File"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <FilePlus size={13} />
          </button>

          <button
            type="button"
            onClick={() => {}}
            title="New Folder"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <FolderPlus size={13} />
          </button>

          <button
            type="button"
            onClick={() => {}}
            title="Refresh Explorer"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCw size={13} />
          </button>

          <button
            type="button"
            onClick={onOpenModal}
            title="More Actions"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* ═══ Project Quick Launcher Banner (Active Process Controls) ═══ */}
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
          {expandedFolderIds.has("root-forge") && FORGE_PROJECT_TREE.children && (
            <div className="flex flex-col">
              {FORGE_PROJECT_TREE.children.map((child) => renderTreeNode(child, 0))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Bottom Accordion: Outline & Scripts ═══ */}
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
    </div>
  );
}
