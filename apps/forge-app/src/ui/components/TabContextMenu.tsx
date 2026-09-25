import { useEffect, useRef, useState } from "react";
import {
  Columns,
  Layers,
  Copy,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  X,
  Settings,
} from "lucide-react";
import { useTabsStore, type Tab } from "../../core/tabs/useTabsStore";
import { useSessionsStore } from "../../core/sessions/useSessionsStore";

interface Props {
  tab: Tab;
  x: number;
  y: number;
  onClose: () => void;
}

export function TabContextMenu({ tab, x, y, onClose }: Props) {
  const {
    tabs,
    splitTabId,
    toggleSplitTab,
    setTabSession,
    toggleMuteTab,
    snoozeTab,
    wakeTab,
    closeTab,
    openTab,
  } = useTabsStore();

  const { sessions, getSession, setSessionModalOpen } = useSessionsStore();
  const [showSessionsSubmenu, setShowSessionsSubmenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const isSplit = splitTabId === tab.id;
  const isSleeping = tab.isSleeping || tab.isLazy;
  const session = getSession(tab.sessionId);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust menu coordinates so it doesn't overflow screen
  const menuWidth = 220;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(y, window.innerHeight - 320);

  const handleDuplicate = () => {
    openTab(tab.url, tab.sessionId);
    onClose();
  };

  const handleToggleSplit = () => {
    toggleSplitTab(tab.id);
    onClose();
  };

  const handleCloseOthers = () => {
    for (const t of tabs) {
      if (t.id !== tab.id) closeTab(t.id);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-[10050] w-56 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-2xl p-1.5 text-xs text-white font-sans select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Tab Quick Header */}
      <div className="px-2.5 py-1.5 border-b border-[var(--forge-border)] mb-1 flex items-center justify-between">
        <span className="truncate font-semibold text-[var(--forge-text-secondary)] text-[11px] max-w-[130px]">
          {tab.title}
        </span>
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: session.color }}
            title={`Container: ${session.name}`}
          />
          <span className="text-[10px] text-[var(--forge-text-muted)] font-mono">{session.name}</span>
        </div>
      </div>

      {/* Split View Action */}
      <button
        type="button"
        onClick={handleToggleSplit}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] transition-colors cursor-pointer text-left"
      >
        <Columns size={13} className="text-[#FF6B00]" />
        <span>{isSplit ? "Close Split View" : "Open in Split View"}</span>
      </button>

      {/* Container Selector Submenu Trigger */}
      <div
        className="relative"
        onMouseEnter={() => setShowSessionsSubmenu(true)}
        onMouseLeave={() => setShowSessionsSubmenu(false)}
      >
        <button
          type="button"
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <Layers size={13} className="text-[#FF6B00]" />
            <span>Assign Container</span>
          </div>
          <span className="text-[10px] text-[var(--forge-text-muted)]">▶</span>
        </button>

        {/* Submenu for Sessions */}
        {showSessionsSubmenu && (
          <div className="absolute left-full top-0 -ml-1 w-52 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in duration-75 space-y-0.5">
            <div className="px-2 py-1 text-[9px] font-mono text-[var(--forge-text-muted)] border-b border-[var(--forge-border)] mb-1 uppercase tracking-wider">
              Isolated Containers
            </div>
            {sessions.map((s) => {
              const isSelected = s.id === (tab.sessionId || "default");
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setTabSession(tab.id, s.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-md transition-colors cursor-pointer text-left ${
                    isSelected
                      ? "bg-[var(--forge-hover)] font-bold text-white"
                      : "hover:bg-[var(--forge-hover)] text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="truncate text-xs">{s.name}</span>
                  </div>
                  {isSelected && <span className="text-[#FF6B00] text-[10px]">✓</span>}
                </button>
              );
            })}

            <div className="pt-1 mt-1 border-t border-[var(--forge-border)]">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setSessionModalOpen(true);
                }}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[var(--forge-text-muted)] hover:text-[#FF6B00] transition-colors"
              >
                <Settings size={11} />
                <span>Manage Containers...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Tab */}
      <button
        type="button"
        onClick={handleDuplicate}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] transition-colors cursor-pointer text-left"
      >
        <Copy size={13} className="text-[var(--forge-text-muted)]" />
        <span>Duplicate Tab</span>
      </button>

      {/* Open in Private Tab */}
      <button
        type="button"
        onClick={() => {
          useTabsStore.getState().openPrivateTab(tab.url);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
      >
        <span className="text-[12px] shrink-0">🕶️</span>
        <span>Open in Private Window</span>
      </button>

      {/* Open in Tor Tab */}
      <button
        type="button"
        onClick={() => {
          useTabsStore.getState().openTorTab(tab.url);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
      >
        <span className="text-[12px] shrink-0">🧅</span>
        <span>Open in Tor Mode</span>
      </button>

      {/* Audio Mute / Unmute */}
      <button
        type="button"
        onClick={() => {
          toggleMuteTab(tab.id);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] transition-colors cursor-pointer text-left"
      >
        {tab.isMuted ? (
          <>
            <Volume2 size={13} className="text-emerald-400" />
            <span>Unmute Tab</span>
          </>
        ) : (
          <>
            <VolumeX size={13} className="text-amber-400" />
            <span>Mute Tab</span>
          </>
        )}
      </button>

      {/* Sleep / Wake Tab */}
      {isSleeping ? (
        <button
          type="button"
          onClick={() => {
            wakeTab(tab.id);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] transition-colors cursor-pointer text-left"
        >
          <Sun size={13} className="text-yellow-400" />
          <span>Wake Tab</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            snoozeTab(tab.id);
            onClose();
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] transition-colors cursor-pointer text-left"
        >
          <Moon size={13} className="text-purple-400" />
          <span>Sleep Tab (Save RAM)</span>
        </button>
      )}

      {/* Divider */}
      <div className="h-px bg-[var(--forge-border)] my-1" />

      {/* Close Actions */}
      <button
        type="button"
        onClick={() => {
          closeTab(tab.id);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer text-left"
      >
        <X size={13} />
        <span>Close Tab</span>
      </button>

      {tabs.length > 1 && (
        <button
          type="button"
          onClick={handleCloseOthers}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer text-left"
        >
          <X size={13} />
          <span>Close Other Tabs</span>
        </button>
      )}
    </div>
  );
}
