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
  Puzzle,
  Disc3,
} from "lucide-react";
import { useHistoryStore } from "../../core/history/useHistoryStore";
import { useThemeStore } from "../../core/theme/useThemeStore";
import { useFavoritesStore } from "../../core/favorites/useFavoritesStore";
import { useProjectsStore } from "../../core/projects/useProjectsStore";
import { useExtensionsStore } from "../../core/extensions/useExtensionsStore";
import { useFocusPlayerStore } from "../../core/focus/useFocusPlayerStore";
import { FavoritesView } from "./FavoritesView";

interface SidebarProps {
  onNavigate: (url: string) => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"favorites" | "history">("favorites");

  const { setDashboardOpen, runningProcesses } = useProjectsStore();
  const { setManagerOpen, extensions } = useExtensionsStore();
  const { setPlayerModalOpen, isPlaying, currentTrack } = useFocusPlayerStore();
  const activeProcessesCount = Object.keys(runningProcesses).length;
  const enabledExtensionsCount = extensions.filter((e) => e.enabled).length;

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
      <div className="w-10 bg-[var(--forge-surface)] border-r border-[var(--forge-border)] flex flex-col items-center py-2 shrink-0 transition-all select-none">
        {/* Expand button */}
        <button
          onClick={() => setExpanded(true)}
          title="Expand sidebar"
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
        >
          <PanelLeftOpen size={14} />
        </button>

        <div className="w-5 border-t border-[var(--forge-border)] my-1" />

        {/* Favorites icon */}
        <button
          onClick={() => {
            setActiveSidebarTab("favorites");
            setExpanded(true);
          }}
          title={`Favorites (${favoriteItems.length})`}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer relative"
        >
          <Star size={14} className="text-[#FF6B00]" />
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
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
        >
          <Clock size={14} />
        </button>

        <div className="w-5 border-t border-[var(--forge-border)] my-1" />

        {/* Projects Launcher button */}
        <button
          onClick={() => setDashboardOpen(true)}
          title={`Developer Projects Launcher (${activeProcessesCount} active)`}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--forge-text-muted)] hover:text-[#FF6B00] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer relative"
        >
          <FolderGit2 size={14} />
          {activeProcessesCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          )}
        </button>

        {/* Extensions Manager button */}
        <button
          onClick={() => setManagerOpen(true)}
          title={`Extensions & Verification Gate (${enabledExtensionsCount} active)`}
          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--forge-text-muted)] hover:text-sky-400 hover:bg-[var(--forge-hover)] transition-colors cursor-pointer relative"
        >
          <Puzzle size={14} />
          {enabledExtensionsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-sky-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              {enabledExtensionsCount}
            </span>
          )}
        </button>

        {/* Focus Player button */}
        <button
          onClick={() => setPlayerModalOpen(true)}
          title={isPlaying && currentTrack ? `Focus Player: ${currentTrack.title}` : "Focus Sound Player"}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer relative ${
            isPlaying
              ? "text-[#FF6B00] bg-[#FF6B00]/10"
              : "text-[var(--forge-text-muted)] hover:text-[#FF6B00] hover:bg-[var(--forge-hover)]"
          }`}
        >
          <Disc3 size={14} className={isPlaying ? "animate-spin" : ""} />
        </button>

        {/* Theme at bottom */}
        <div className="mt-auto flex flex-col items-center gap-1">
          {themeOptions.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setThemeMode(opt.mode)}
              title={`${opt.label} mode`}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
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
    <div className="w-64 bg-[var(--forge-surface)] border-r border-[var(--forge-border)] flex flex-col overflow-hidden shrink-0 transition-all select-none">
      {/* Header: tabs & collapse button */}
      <div className="px-2.5 py-1.5 border-b border-[var(--forge-border)] flex items-center justify-between bg-[var(--forge-surface-elevated)]/40">
        <div className="flex items-center gap-1 bg-[var(--forge-input)] p-0.5 rounded-md">
          <button
            onClick={() => setActiveSidebarTab("favorites")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              activeSidebarTab === "favorites"
                ? "bg-[var(--forge-surface)] text-[#FF6B00] font-semibold shadow-xs"
                : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <Star size={11} className="text-[#FF6B00]" />
            Favorites
          </button>
          <button
            onClick={() => setActiveSidebarTab("history")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
              activeSidebarTab === "history"
                ? "bg-[var(--forge-surface)] text-[var(--forge-text)] font-semibold shadow-xs"
                : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <Clock size={11} />
            History
          </button>
        </div>

        <button
          onClick={() => setExpanded(false)}
          title="Collapse sidebar"
          className="w-6 h-6 flex items-center justify-center rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
        >
          <PanelLeftClose size={14} />
        </button>
      </div>

      {/* Body: Favorites View or History */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeSidebarTab === "favorites" ? (
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
                  className="group flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--forge-hover)] rounded cursor-pointer transition-colors relative"
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
      <div className="p-2 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/30 space-y-1">
        <div className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)] tracking-wider">
          Workspace Tools
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setDashboardOpen(true)}
            title="Projects Launcher"
            className="flex flex-col items-center gap-1 p-1.5 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[#FF6B00] border border-[var(--forge-border)] transition-colors cursor-pointer relative"
          >
            <FolderGit2 size={12} />
            <span className="text-[9px] font-medium">Projects</span>
            {activeProcessesCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setManagerOpen(true)}
            title="Extensions Manager"
            className="flex flex-col items-center gap-1 p-1.5 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-sky-400 border border-[var(--forge-border)] transition-colors cursor-pointer"
          >
            <Puzzle size={12} />
            <span className="text-[9px] font-medium">Extensions</span>
          </button>

          <button
            onClick={() => setPlayerModalOpen(true)}
            title="Focus Sound Player"
            className={`flex flex-col items-center gap-1 p-1.5 rounded border transition-colors cursor-pointer ${
              isPlaying
                ? "bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/30"
                : "bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[#FF6B00] border-[var(--forge-border)]"
            }`}
          >
            <Disc3 size={12} className={isPlaying ? "animate-spin" : ""} />
            <span className="text-[9px] font-medium">Audio</span>
          </button>
        </div>
      </div>

      {/* Footer: Theme */}
      <div className="p-2 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] transition-colors">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)] tracking-wider">
            Theme
          </span>
          {themeMode === "system" && (
            <span className="text-[9px] text-[var(--forge-text-muted)] font-mono">
              ({resolvedTheme})
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-0.5 bg-[var(--forge-input)] p-0.5 rounded-md">
          {themeOptions.map((opt) => {
            const isSelected = themeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => setThemeMode(opt.mode)}
                className={`flex items-center justify-center gap-1 py-0.5 rounded text-[10px] font-medium transition-all ${
                  isSelected
                    ? "bg-[var(--forge-surface)] text-[var(--forge-text)] shadow-xs font-semibold"
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