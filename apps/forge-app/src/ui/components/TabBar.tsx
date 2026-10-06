import { useState, useRef, useEffect } from "react";
import { X, Plus, Globe, Volume2, VolumeX, Columns, ChevronDown } from "lucide-react";
import { useTabsStore, type Tab } from "../../core/tabs/useTabsStore";
import { useSessionsStore } from "../../core/sessions/useSessionsStore";
import { useLocalhostAliasesStore } from "../../core/localhost/useLocalhostAliasesStore";
import { TabHoverCard } from "./TabHoverCard";
import { TabContextMenu } from "./TabContextMenu";

export function TabBar() {
  const { tabs, activeTabId, openTab, openPrivateTab, openTorTab, closeTab, setActiveTab, moveTab, toggleMuteTab } =
    useTabsStore();
  const splitTabId = useTabsStore((s) => s.splitTabId);
  const { sessions, getSession } = useSessionsStore();
  const getAliasForUrl = useLocalhostAliasesStore((s) => s.getAliasForUrl);

  const [contextMenu, setContextMenu] = useState<{ tab: Tab; x: number; y: number } | null>(null);
  const [isNewTabDropdownOpen, setIsNewTabDropdownOpen] = useState(false);
  const newTabDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newTabDropdownRef.current && !newTabDropdownRef.current.contains(e.target as Node)) {
        setIsNewTabDropdownOpen(false);
      }
    };
    if (isNewTabDropdownOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isNewTabDropdownOpen]);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; side: "left" | "right" } | null>(null);

  // Tab Hover Card state
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompact = tabs.length >= 14;
  const isUltraCompact = tabs.length >= 22;

  const handleTabMouseEnter = (tabId: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedIndex !== null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (hoveredTabId) {
      // Already showing hover card, instantly switch to this tab
      setHoveredTabId(tabId);
      setAnchorRect(rect);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    } else {
      // First hover delay (220ms) for pleasant snappy feel
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setHoveredTabId(tabId);
        setAnchorRect(rect);
      }, 220);
    }
  };

  const handleTabMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredTabId(null);
      setAnchorRect(null);
    }, 120);
  };

  const handleTabBarMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredTabId(null);
    setAnchorRect(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredTabId(null);
    setAnchorRect(null);

    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientX - rect.left;
    const side: "left" | "right" = offset < rect.width / 2 ? "left" : "right";

    // If hovering over the position it already occupies, clear the indicator
    const isCurrentSlot =
      draggedIndex === targetIndex ||
      (targetIndex === draggedIndex + 1 && side === "left") ||
      (targetIndex === draggedIndex - 1 && side === "right");

    if (isCurrentSlot) {
      if (dropTarget !== null) setDropTarget(null);
      return;
    }

    if (dropTarget?.index !== targetIndex || dropTarget?.side !== side) {
      setDropTarget({ index: targetIndex, side });
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientX - rect.left;
    const side: "left" | "right" = offset < rect.width / 2 ? "left" : "right";

    let toIndex = targetIndex;
    if (draggedIndex < targetIndex) {
      toIndex = side === "left" ? targetIndex - 1 : targetIndex;
    } else {
      toIndex = side === "left" ? targetIndex : targetIndex + 1;
    }

    if (toIndex !== draggedIndex && toIndex >= 0 && toIndex < tabs.length) {
      moveTab(draggedIndex, toIndex);
    }

    setDraggedIndex(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTarget(null);
  };

  const handleSpacerDragOver = (e: React.DragEvent) => {
    if (draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const lastIndex = tabs.length - 1;
    if (draggedIndex !== lastIndex) {
      if (dropTarget?.index !== lastIndex || dropTarget?.side !== "right") {
        setDropTarget({ index: lastIndex, side: "right" });
      }
    } else if (dropTarget !== null) {
      setDropTarget(null);
    }
  };

  const handleSpacerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    const lastIndex = tabs.length - 1;
    if (draggedIndex !== lastIndex) {
      moveTab(draggedIndex, lastIndex);
    }
    setDraggedIndex(null);
    setDropTarget(null);
  };

  const hoveredTab = tabs.find((t) => t.id === hoveredTabId) || null;

  return (
    <div
      onMouseLeave={handleTabBarMouseLeave}
      className="h-8 bg-[var(--forge-bg)] flex items-stretch px-0 shrink-0 overflow-hidden transition-colors select-none w-full max-w-full relative z-10"
      style={{ WebkitAppRegion: "no-drag", boxShadow: 'inset 0 -1px 0 var(--forge-border)' } as React.CSSProperties}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const isBeingDragged = draggedIndex === index;
        const hasDropIndicator = dropTarget?.index === index;
        const isSleeping = tab.isSleeping || tab.isLazy;
        const session = getSession(tab.sessionId);
        const isPrivate = session.mode === "private" || tab.sessionId === "private" || tab.sessionId?.startsWith("private_");
        const isTor = session.mode === "tor" || tab.sessionId === "tor" || tab.sessionId?.startsWith("tor_");

        return (
          <div
            key={tab.id}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onMouseEnter={(e) => handleTabMouseEnter(tab.id, e)}
            onMouseLeave={handleTabMouseLeave}
            onClick={() => setActiveTab(tab.id)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ tab, x: e.clientX, y: e.clientY });
            }}
            className={`group relative flex items-center ${
              isUltraCompact
                ? "justify-center px-1"
                : isCompact
                ? "justify-start px-2 gap-1"
                : "justify-start px-3 gap-1.5"
            } flex-1 min-w-0 max-w-[220px] select-none transition-all ${
              isBeingDragged
                ? "opacity-35 scale-[0.97] border-x border-dashed border-[#FF6B00]/70 cursor-default bg-[var(--forge-surface-elevated)]"
                : "cursor-default"
            } ${
              isActive && !isBeingDragged
                ? isTor
                  ? "bg-[#1f1a10] text-[var(--forge-text)] font-medium"
                  : isPrivate
                  ? "bg-[#191424] text-[var(--forge-text)] font-medium"
                  : "bg-[var(--forge-surface)] text-[var(--forge-text)] font-medium"
                : !isBeingDragged
                ? `bg-transparent text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)]/60 hover:text-[var(--forge-text-secondary)] ${
                    isSleeping ? "opacity-70" : ""
                  }`
                : ""
            }`}
          >
            {/* Active tab top accent bar */}
            {isActive && !isBeingDragged && (
              <div
                className={`absolute top-0 left-0 right-0 h-[2px] pointer-events-none z-30 ${
                  isTor
                    ? "bg-[#EAB308] shadow-[0_0_8px_rgba(234,179,8,0.6)]"
                    : isPrivate
                    ? "bg-[#A855F7] shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                    : "bg-[#FF6B00]"
                }`}
              />
            )}

            {/* Session container colored top border line (overrides accent when non-default session) */}
            {session.id !== "default" && !isTor && !isPrivate && (
              <div
                className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none z-31"
                style={{ backgroundColor: session.color }}
              />
            )}

            {/* Right separator for inactive tabs */}
            {!isActive && !isBeingDragged && index < tabs.length - 1 && (
              <div className="absolute right-0 top-1.5 bottom-1.5 w-px bg-[var(--forge-border)] opacity-40 pointer-events-none" />
            )}

            {/* Drop Insertion Line (glowing vertical bar) */}
            {hasDropIndicator && (
              <div
                className={`absolute top-0.5 bottom-0.5 w-[3px] bg-[#FF6B00] rounded-full shadow-[0_0_8px_rgba(255,107,0,1)] z-40 pointer-events-none animate-in fade-in duration-75 ${
                  dropTarget.side === "left" ? "-left-[1.5px]" : "-right-[1.5px]"
                }`}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FF6B00] rounded-full shadow-sm" />
              </div>
            )}

            {/* Mode badge: Private or Tor */}
            {isTor ? (
              <span title="Tor Mode (Onion Routed)" className="text-[11px] shrink-0 select-none">
                🧅
              </span>
            ) : isPrivate ? (
              <span title="Private Window (Temporary RAM-only storage)" className="text-[11px] shrink-0 select-none">
                🕶️
              </span>
            ) : tab.favicon ? (
              <img
                src={tab.favicon}
                alt=""
                className={`w-3.5 h-3.5 shrink-0 rounded-sm pointer-events-none ${
                  isSleeping && !isActive ? "opacity-70 saturate-50" : ""
                }`}
              />
            ) : (
              <Globe
                size={12}
                className={`shrink-0 pointer-events-none ${
                  isActive ? "text-[#FF6B00]" : "text-[var(--forge-text-muted)]"
                } ${isSleeping && !isActive ? "opacity-70" : ""}`}
              />
            )}

            {/* Sleeping status badge on dormant tabs */}
            {isSleeping && !isActive && (
              <span
                title="Sleeping tab to save memory (click to wake up)"
                className="text-[9px] text-purple-400 font-mono shrink-0 select-none opacity-80 group-hover:opacity-100"
              >
                💤
              </span>
            )}

            {/* Title (truncated, hides gracefully when tab strip becomes very dense) */}
            {!isUltraCompact && (
              <span className="flex-1 text-xs truncate min-w-0 pointer-events-none hidden sm:inline">
                {tab.title}
              </span>
            )}

            {/* Localhost Environment Alias Badge */}
            {(() => {
              const alias = getAliasForUrl(tab.url);
              if (!alias) return null;
              return (
                <span
                  title={`Environment Alias: ${alias.alias} (Port ${alias.port})`}
                  style={{ color: alias.color, borderColor: `${alias.color}50`, backgroundColor: `${alias.color}15` }}
                  className="text-[8px] font-mono font-bold px-1 py-0.2 rounded border shrink-0 uppercase tracking-tighter"
                >
                  {alias.environment}
                </span>
              );
            })()}

            {/* Split View Badge if tab is in split view */}
            {splitTabId === tab.id && (
              <span title="Tab is active in Split View" className="text-[#FF6B00] shrink-0">
                <Columns size={10} />
              </span>
            )}

            {/* Audio Indicator with click-to-mute directly on tab */}
            {tab.isPlayingAudio && (
              <button
                type="button"
                draggable={false}
                onDragStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMuteTab(tab.id);
                }}
                className={`w-4 h-4 rounded transition-all shrink-0 flex items-center justify-center cursor-pointer z-10 ${
                  tab.isMuted
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#FF6B00]/35 shadow-[0_0_8px_rgba(255,107,0,0.5)] animate-pulse"
                }`}
                title={tab.isMuted ? "Unmute audio (Click to unmute)" : "Playing audio / video (Click to mute)"}
              >
                {tab.isMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              </button>
            )}

            {/* Loading indicator */}
            {tab.isLoading && (
              <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${isTor ? "bg-[#EAB308]" : isPrivate ? "bg-[#A855F7]" : "bg-[#FF6B00]"}`} />
            )}

            {/* Close Button */}
            <button
              type="button"
              draggable={false}
              onDragStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={`w-4 h-4 flex items-center justify-center rounded-sm transition-all shrink-0 ${
                isCompact
                  ? "opacity-0 group-hover:opacity-100 hover:bg-white/10 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  : isActive
                  ? "opacity-70 hover:opacity-100 hover:bg-white/10 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  : "opacity-0 group-hover:opacity-100 hover:bg-white/10 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
              title="Close Tab (Ctrl+W)"
            >
              <X size={10} />
            </button>

            {/* Bottom edge fill for active tab to merge with content below */}
            {isActive && !isBeingDragged && (
              <div className={`absolute bottom-0 left-0 right-0 h-px ${isTor ? "bg-[#1f1a10]" : isPrivate ? "bg-[#191424]" : "bg-[var(--forge-surface)]"}`} />
            )}
          </div>
        );
      })}

      {/* New tab button (+) immediately following tabs */}
      <div className="flex items-center mx-1 shrink-0">
        <button
          type="button"
          onClick={() => openTab()}
          onDragOver={handleSpacerDragOver}
          onDrop={handleSpacerDrop}
          title="New Tab (Ctrl + T)"
          className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--forge-text-muted)] hover:bg-[#FF6B00]/12 hover:text-[#FF6B00] transition-all cursor-pointer"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Flexible trailing spacer to absorb remaining width and support double-click to open new tab or drop to move to end */}
      <div
        className="flex-1 h-full min-w-0 cursor-default"
        onDoubleClick={() => openTab()}
        onDragOver={handleSpacerDragOver}
        onDrop={handleSpacerDrop}
        title="Double click to open a new tab"
      />

      {/* Fixed to the right: Private Tab shortcut & Browsing Modes / Containers dropdown */}
      <div ref={newTabDropdownRef} className="relative flex items-center px-1.5 mr-1 shrink-0 gap-0.5">
        <button
          type="button"
          onClick={() => openPrivateTab()}
          title="New Private Tab (Ctrl + Shift + N)"
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-all cursor-pointer text-xs select-none"
        >
          🕶️
        </button>

        <button
          type="button"
          onClick={() => setIsNewTabDropdownOpen(!isNewTabDropdownOpen)}
          title="Browsing Modes & Containers (Normal, Private, Tor)"
          className="w-4 h-6 flex items-center justify-center rounded-md text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)] hover:text-[var(--forge-text)] transition-colors cursor-pointer"
        >
          <ChevronDown size={11} />
        </button>

        {isNewTabDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-2xl p-1.5 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 text-[9px] font-mono text-[var(--forge-text-muted)] border-b border-[var(--forge-border)] mb-1 uppercase tracking-wider">
              New Browsing Mode
            </div>

            {/* Normal Tab */}
            <button
              type="button"
              onClick={() => {
                openTab("about:blank", "default");
                setIsNewTabDropdownOpen(false);
              }}
              className="w-full flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white transition-colors cursor-pointer text-left group"
            >
              <div className="w-6 h-6 rounded-md bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5">
                <Globe size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white group-hover:text-[#FF6B00] transition-colors flex items-center justify-between">
                  <span>Normal Tab</span>
                  <span className="text-[10px] text-zinc-500 font-mono font-normal">Ctrl+T</span>
                </div>
                <div className="text-[11px] text-zinc-400 leading-tight">Persistent browsing & history</div>
              </div>
            </button>

            {/* Private Window */}
            <button
              type="button"
              onClick={() => {
                openPrivateTab("about:blank");
                setIsNewTabDropdownOpen(false);
              }}
              className="w-full flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white transition-colors cursor-pointer text-left group"
            >
              <div className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                🕶️
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white group-hover:text-purple-400 transition-colors flex items-center justify-between">
                  <span>Private Window</span>
                  <span className="text-[10px] text-zinc-500 font-mono font-normal">Ctrl+Shift+N</span>
                </div>
                <div className="text-[11px] text-zinc-400 leading-tight">Temporary local data (RAM only)</div>
              </div>
            </button>

            {/* Tor Mode */}
            <button
              type="button"
              onClick={() => {
                openTorTab("about:blank");
                setIsNewTabDropdownOpen(false);
              }}
              className="w-full flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white transition-colors cursor-pointer text-left group"
            >
              <div className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                🧅
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors flex items-center justify-between">
                  <span>Tor Mode</span>
                  <span className="text-[10px] text-zinc-500 font-mono font-normal">SOCKS5</span>
                </div>
                <div className="text-[11px] text-zinc-400 leading-tight">Private browsing through Tor network</div>
              </div>
            </button>

            {/* Separator for Containers */}
            <div className="px-2 pt-2 pb-1 text-[9px] font-mono text-[var(--forge-text-muted)] border-t border-[var(--forge-border)] mt-1.5 mb-0.5 uppercase tracking-wider">
              Containers
            </div>
            {sessions
              .filter((s) => s.id !== "private" && s.id !== "tor" && !s.temporary)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    openTab("about:blank", s.id);
                    setIsNewTabDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate text-xs">{s.name}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Rich Tab Hover Card Preview */}
      <TabHoverCard
        tab={hoveredTab}
        anchorRect={anchorRect}
        visible={Boolean(hoveredTab && anchorRect && draggedIndex === null)}
      />

      {/* Tab Context Menu */}
      {contextMenu && (
        <TabContextMenu
          tab={contextMenu.tab}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
