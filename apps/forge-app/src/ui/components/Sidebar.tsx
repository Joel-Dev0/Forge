import { useState, useEffect } from "react";
import {
  Star,
  Clock,
  Trash2,
  Sun,
  Moon,
  Laptop,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  FolderGit2,
  Disc3,
  Boxes,
  StickyNote,
} from "lucide-react";
import { useHistoryStore } from "../../core/history/useHistoryStore";
import { useThemeStore } from "../../core/theme/useThemeStore";
import { useFavoritesStore } from "../../core/favorites/useFavoritesStore";
import { useProjectsStore } from "../../core/projects/useProjectsStore";
import { useFocusPlayerStore } from "../../core/focus/useFocusPlayerStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { useIdeExtensionsStore } from "../../core/extensions/useIdeExtensionsStore";
import { useBlockNotesStore } from "../../core/notes/useBlockNotesStore";
import { FavoritesView } from "./FavoritesView";
import { IdeExtensionsSidebarView } from "./IdeExtensionsSidebarView";
import { IdeExplorerSidebarView } from "./IdeExplorerSidebarView";
import { BlockNotesSidebarView } from "./notes/BlockNotesSidebarView";

interface SidebarProps {
  onNavigate: (url: string) => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"explorer" | "extensions" | "favorites" | "history" | "notes">("explorer");

  const { notes, memoryCards, checklists, setModalOpen: setBlockNotesModalOpen } = useBlockNotesStore();
  const totalNotesCount = notes.length + memoryCards.length;

  const { setDashboardOpen, runningProcesses } = useProjectsStore();
  const { setPlayerModalOpen, isPlaying, currentTrack } = useFocusPlayerStore();
  const { tabs } = useTabsStore();
  const activeAudioTab = tabs.find((t) => t.isPlayingAudio);
  const isAudioPlaying = isPlaying || Boolean(activeAudioTab);
  const { setIdeModalOpen, extensions: ideExtensions } = useIdeExtensionsStore();
  const activeProcessesCount = Object.keys(runningProcesses).length;
  const enabledIdeCount = ideExtensions.filter((e) => e.installed && e.enabled).length;

  useEffect(() => {
    const handleOpenHistory = () => {
      setActiveSidebarTab("history");
      setExpanded(true);
    };
    window.addEventListener("forge:open-history", handleOpenHistory);
    return () => window.removeEventListener("forge:open-history", handleOpenHistory);
  }, []);

  const { entries, clearHistory, removeEntry, searchQuery, setSearchQuery } = useHistoryStore();
  const favoriteItems = useFavoritesStore((s) => s.items);
  const { themeMode, setThemeMode, resolvedTheme } = useThemeStore();

  const themeOptions: { mode: "system" | "light" | "dark"; icon: React.ReactNode; label: string }[] = [
    { mode: "system", icon: <Laptop size={12} />, label: "Auto" },
    { mode: "light",  icon: <Sun size={12} />,    label: "Light" },
    { mode: "dark",   icon: <Moon size={12} />,   label: "Dark" },
  ];

  const handleClick = (url: string) => {
    onNavigate(url);
  };

  // Collapsed icon strip
  if (!expanded) {
    return (
      <div className="w-11 flex flex-col items-center py-2 shrink-0 transition-all select-none" style={{ background: 'linear-gradient(180deg, var(--forge-surface), var(--forge-bg))', borderRight: '1px solid var(--forge-border)' }}>
        {/* Expand button */}
        <button
          onClick={() => setExpanded(true)}
          title="Expand sidebar"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-all cursor-pointer"
        >
          <PanelLeftOpen size={15} />
        </button>

        <div className="w-6 border-t border-[var(--forge-border)] my-1.5" />

        {/* Favorites icon */}
        <button
          onClick={() => {
            setActiveSidebarTab("favorites");
            setExpanded(true);
          }}
          title={`Favorites (${favoriteItems.length})`}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer relative ${
            activeSidebarTab === "favorites"
              ? "text-[#FF6B00] bg-[#FF6B00]/10"
              : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)]"
          }`}
        >
          {activeSidebarTab === "favorites" && (
            <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#FF6B00] rounded-r-full" />
          )}
          <Star size={15} />
          {favoriteItems.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#FF6B00] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              {favoriteItems.length > 9 ? "9+" : favoriteItems.length}
            </span>
          )}
        </button>

        {/* History icon */}
        <button
          onClick={() => {
            setActiveSidebarTab("history");
            setExpanded(true);
          }}
          title={`History (${entries.length})`}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer relative ${
            activeSidebarTab === "history"
              ? "text-[var(--forge-text)] bg-[var(--forge-hover)]"
              : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)]"
          }`}
        >
          {activeSidebarTab === "history" && (
            <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#FF6B00] rounded-r-full" />
          )}
          <Clock size={15} />
        </button>

        {/* Block Notes & Mind Palace */}
        <button
          onClick={() => {
            setActiveSidebarTab("notes");
            setExpanded(true);
          }}
          title={`Block Notes & Mind Palace (${totalNotesCount} notes & cards)`}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer relative ${
            activeSidebarTab === "notes"
              ? "text-amber-400 bg-amber-500/10"
              : "text-[var(--forge-text-muted)] hover:text-amber-400 hover:bg-[var(--forge-hover)]"
          }`}
        >
          {activeSidebarTab === "notes" && (
            <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-amber-500 rounded-r-full" />
          )}
          <StickyNote size={15} />
          {totalNotesCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-black text-[8px] font-bold rounded-full flex items-center justify-center">
              {totalNotesCount}
            </span>
          )}
        </button>

        <div className="w-6 border-t border-[var(--forge-border)] my-1.5" />

        <button
          onClick={() => {
            setActiveSidebarTab("explorer");
            setExpanded(true);
          }}
          title={`Explorer & Developer Projects (${activeProcessesCount} active)`}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer relative ${
            activeSidebarTab === "explorer"
              ? "text-[#FF6B00] bg-[#FF6B00]/10"
              : "text-[var(--forge-text-muted)] hover:text-[#FF6B00] hover:bg-[var(--forge-hover)]"
          }`}
        >
          {activeSidebarTab === "explorer" && (
            <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-[#FF6B00] rounded-r-full" />
          )}
          <FolderGit2 size={15} />
          {activeProcessesCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveSidebarTab("extensions");
            setExpanded(true);
          }}
          title={`IDE Extensions — Open VSX & Marketplace (${enabledIdeCount} active)`}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer relative ${
            activeSidebarTab === "extensions"
              ? "text-blue-400 bg-blue-500/10"
              : "text-[var(--forge-text-muted)] hover:text-blue-400 hover:bg-[var(--forge-hover)]"
          }`}
        >
          {activeSidebarTab === "extensions" && (
            <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-blue-500 rounded-r-full" />
          )}
          <Boxes size={15} />
          {enabledIdeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {enabledIdeCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setPlayerModalOpen(true)}
          title={isAudioPlaying ? `Playing: ${isPlaying ? (currentTrack?.title || "Focus Sound") : (activeAudioTab?.title || "Browser Audio")}` : "Focus Sound Player"}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer relative ${
            isAudioPlaying
              ? "text-[#FF6B00] bg-[#FF6B00]/10"
              : "text-[var(--forge-text-muted)] hover:text-[#FF6B00] hover:bg-[var(--forge-hover)]"
          }`}
        >
          <Disc3 size={15} className={isAudioPlaying ? "animate-spin" : ""} />
        </button>

        {/* Theme at bottom */}
        <div className="mt-auto flex flex-col items-center gap-0.5">
          {themeOptions.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setThemeMode(opt.mode)}
              title={`${opt.label} mode`}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                themeMode === opt.mode
                  ? "bg-[var(--forge-hover)] text-[var(--forge-text)]"
                  : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)]"
              }`}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Expanded sidebar
  return (
    <div className={`${activeSidebarTab === "explorer" || activeSidebarTab === "extensions" ? "w-80" : "w-64"} bg-[var(--forge-surface)] flex flex-col overflow-hidden shrink-0 transition-all select-none shadow-xl`} style={{ borderRight: '1px solid var(--forge-border)' }}>
      {/* Header: tabs & collapse button */}
      <div className="px-2 py-1 flex items-center justify-between" style={{ borderBottom: '1px solid var(--forge-border)' }}>
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSidebarTab("explorer")}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-all cursor-pointer border-b-2 ${
              activeSidebarTab === "explorer"
                ? "border-[#FF6B00] text-[#FF6B00] font-semibold"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <FolderGit2 size={11} />
            Explorer
          </button>
          <button
            onClick={() => setActiveSidebarTab("extensions")}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-all cursor-pointer border-b-2 ${
              activeSidebarTab === "extensions"
                ? "border-blue-500 text-blue-400 font-semibold"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <Boxes size={11} />
            Extensions
            <span className="px-1 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-mono">
              {ideExtensions.filter((e) => e.installed).length}
            </span>
          </button>
          <button
            onClick={() => setActiveSidebarTab("notes")}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-all cursor-pointer border-b-2 ${
              activeSidebarTab === "notes"
                ? "border-amber-500 text-amber-400 font-semibold"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <StickyNote size={11} />
            Notes
            <span className="px-1 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-mono">
              {totalNotesCount}
            </span>
          </button>
          <button
            onClick={() => setActiveSidebarTab("favorites")}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-all cursor-pointer border-b-2 ${
              activeSidebarTab === "favorites"
                ? "border-[#FF6B00] text-[#FF6B00] font-semibold"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <Star size={11} />
            Favorites
          </button>
          <button
            onClick={() => setActiveSidebarTab("history")}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-all cursor-pointer border-b-2 ${
              activeSidebarTab === "history"
                ? "border-[#FF6B00] text-[var(--forge-text)] font-semibold"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <Clock size={11} />
            History
          </button>
        </div>

        <button
          onClick={() => setExpanded(false)}
          title="Collapse sidebar"
          className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-all cursor-pointer shrink-0 ml-1"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {/* Body: Explorer, Extensions, Notes, Favorites View, or History */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeSidebarTab === "explorer" ? (
          <IdeExplorerSidebarView onNavigate={handleClick} onOpenModal={() => setDashboardOpen(true)} />
        ) : activeSidebarTab === "extensions" ? (
          <IdeExtensionsSidebarView
            onOpenModal={() => setIdeModalOpen(true)}
            onSelectExtension={(ext) => {
              useIdeExtensionsStore.getState().setSelectedExtension(ext);
              setIdeModalOpen(true);
            }}
          />
        ) : activeSidebarTab === "notes" ? (
          <BlockNotesSidebarView onOpenFullModal={() => setBlockNotesModalOpen(true)} />
        ) : activeSidebarTab === "favorites" ? (
          <FavoritesView onNavigate={handleClick} />
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1">
            <div className="p-2 border-b border-[var(--forge-border)] flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--forge-text-muted)]">
                  Browsing History ({entries.length})
                </span>
                {entries.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-[10px] text-[var(--forge-text-muted)] hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={10} /> Clear
                  </button>
                )}
              </div>

              {entries.length > 3 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--forge-input)] rounded border border-[var(--forge-border)]">
                  <Search size={10} className="text-[var(--forge-text-muted)] shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search history..."
                    className="flex-1 bg-transparent text-[10px] text-[var(--forge-text)] outline-none placeholder-[var(--forge-text-muted)]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {(() => {
              const filtered = entries.filter((e) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  (e.title && e.title.toLowerCase().includes(q)) ||
                  (e.url && e.url.toLowerCase().includes(q))
                );
              });

              if (filtered.length === 0) {
                return (
                  <p className="p-4 text-[10px] text-[var(--forge-text-muted)] italic text-center">
                    {searchQuery ? "No matching history" : "No history yet"}
                  </p>
                );
              }

              return filtered.slice(0, 100).map((entry) => (
                <div
                  key={entry.id}
                  className="group flex items-center gap-2 px-2.5 py-2 hover:bg-[var(--forge-hover)] rounded-lg cursor-pointer transition-all relative"
                  onClick={() => handleClick(entry.url)}
                >
                  {entry.favicon ? (
                    <img
                      src={entry.favicon}
                      alt=""
                      className="w-3.5 h-3.5 object-contain shrink-0 rounded-xs"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Clock size={11} className="text-[var(--forge-text-muted)] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[11px] text-[var(--forge-text)] truncate group-hover:text-[#FF6B00] transition-colors">
                      {entry.title || entry.url}
                    </p>
                    <p className="text-[9px] text-[var(--forge-text-muted)] truncate font-mono">
                      {entry.url}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(entry.id);
                    }}
                    title="Remove entry"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-[var(--forge-text-muted)] transition-opacity cursor-pointer shrink-0"
                  >
                    <X size={10} />
                  </button>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Workspace Quick Launchers Strip */}
      <div className="p-2.5 border-t border-[var(--forge-border)] space-y-1.5">
        <div className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)] tracking-wider">
          Workspace Tools
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => {
              setActiveSidebarTab("explorer");
              setExpanded(true);
            }}
            title="Explorer & Projects"
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all cursor-pointer relative shadow-sm ${
              activeSidebarTab === "explorer"
                ? "bg-[#FF6B00]/15 text-[#FF6B00]"
                : "bg-[var(--forge-surface-elevated)] hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[#FF6B00]"
            }`}
          >
            <FolderGit2 size={13} />
            <span className="text-[9px] font-medium">Explorer</span>
            {activeProcessesCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveSidebarTab("extensions");
              setExpanded(true);
            }}
            title="VS Code Marketplace IDE Extensions"
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all cursor-pointer relative shadow-sm ${
              activeSidebarTab === "extensions"
                ? "bg-blue-500/15 text-blue-400"
                : "bg-[var(--forge-surface-elevated)] hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-blue-400"
            }`}
          >
            <Boxes size={13} />
            <span className="text-[9px] font-medium">Extensions</span>
            {enabledIdeCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setPlayerModalOpen(true)}
            title={isAudioPlaying ? `Playing: ${isPlaying ? (currentTrack?.title || "Focus Sound") : (activeAudioTab?.title || "Browser Audio")}` : "Focus Sound Player"}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all cursor-pointer shadow-sm ${
              isAudioPlaying
                ? "bg-[#FF6B00]/15 text-[#FF6B00]"
                : "bg-[var(--forge-surface-elevated)] hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[#FF6B00]"
            }`}
          >
            <Disc3 size={13} className={isAudioPlaying ? "animate-spin" : ""} />
            <span className="text-[9px] font-medium">Audio</span>
          </button>
        </div>
      </div>

      {/* Footer: Theme */}
      <div className="p-2.5 border-t border-[var(--forge-border)] transition-colors">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)] tracking-wider">
            Theme
          </span>
          {themeMode === "system" && (
            <span className="text-[9px] text-[var(--forge-text-muted)] font-mono-ide">
              ({resolvedTheme})
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-0.5 bg-[var(--forge-input)] p-0.5 rounded-lg">
          {themeOptions.map((opt) => {
            const isSelected = themeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => setThemeMode(opt.mode)}
                className={`flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium transition-all ${
                  isSelected
                    ? "bg-[var(--forge-surface)] text-[var(--forge-text)] shadow-sm font-semibold"
                    : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)]"
                }`}
                title={`${opt.label} mode`}
              >
                {opt.icon}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}