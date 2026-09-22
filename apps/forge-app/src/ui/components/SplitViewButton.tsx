import { useState, useRef, useEffect } from "react";
import { Columns, Rows, ArrowLeftRight } from "lucide-react";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { useSessionsStore } from "../../core/sessions/useSessionsStore";

export function SplitViewButton() {
  const {
    tabs,
    activeTabId,
    splitTabId,
    splitOrientation,
    setSplitTab,
    setSplitOrientation,
    setActiveTab,
  } = useTabsStore();

  const getSession = useSessionsStore((s) => s.getSession);

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSplitActive = Boolean(splitTabId && splitTabId !== activeTabId);
  const otherTabs = tabs.filter((t) => t.id !== activeTabId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleQuickToggle = () => {
    if (isSplitActive) {
      setSplitTab(null);
    } else {
      if (otherTabs.length > 0) {
        // Automatically split with the first background tab
        setSplitTab(otherTabs[0].id);
      } else {
        // If only 1 tab, open dropdown to explain or create new
        setIsOpen(true);
      }
    }
  };

  const handleSwap = () => {
    if (!splitTabId) return;
    const currentPrimary = activeTabId;
    const currentSecondary = splitTabId;
    setActiveTab(currentSecondary);
    setSplitTab(currentPrimary);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleQuickToggle}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        title={
          isSplitActive
            ? "Split View Active (Right-click for options, Click to close)"
            : "Split View: Run tabs side-by-side with isolated containers (Click to split)"
        }
        className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer ${
          isSplitActive
            ? "bg-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#FF6B00]/30 shadow-[0_0_8px_rgba(255,107,0,0.3)]"
            : "hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[#FF6B00]"
        }`}
      >
        <Columns size={13} />
      </button>

      {/* Split View Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-2xl p-2 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--forge-border)] mb-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Columns size={13} className="text-[#FF6B00]" />
              Split View Controls
            </span>
            {isSplitActive && (
              <button
                type="button"
                onClick={() => {
                  setSplitTab(null);
                  setIsOpen(false);
                }}
                className="text-[10px] text-red-400 hover:underline cursor-pointer"
              >
                Close Split
              </button>
            )}
          </div>

          {isSplitActive ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={handleSwap}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] text-zinc-200 transition-colors cursor-pointer text-left"
              >
                <ArrowLeftRight size={13} className="text-[#FF6B00]" />
                <span>Swap Left & Right Panes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitOrientation(splitOrientation === "horizontal" ? "vertical" : "horizontal");
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] text-zinc-200 transition-colors cursor-pointer text-left"
              >
                {splitOrientation === "horizontal" ? (
                  <>
                    <Rows size={13} className="text-[#FF6B00]" />
                    <span>Switch to Stacked View (Vertical)</span>
                  </>
                ) : (
                  <>
                    <Columns size={13} className="text-[#FF6B00]" />
                    <span>Switch to Side-by-Side View (Horizontal)</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-[var(--forge-border)] mt-1">
                <span className="text-[10px] font-semibold text-[var(--forge-text-muted)] uppercase tracking-wider block px-2 mb-1">
                  Change Paired Tab
                </span>
                <div className="max-h-36 overflow-y-auto space-y-0.5">
                  {otherTabs.map((t) => {
                    const session = getSession(t.sessionId);
                    const isCurrentSplit = t.id === splitTabId;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSplitTab(t.id);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-colors cursor-pointer ${
                          isCurrentSplit
                            ? "bg-[#FF6B00]/15 text-[#FF6B00] font-bold"
                            : "hover:bg-[var(--forge-hover)] text-zinc-300"
                        }`}
                      >
                        <span className="truncate flex-1 mr-2 text-[11px]">{t.title}</span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: session.color }}
                          title={session.name}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {otherTabs.length === 0 ? (
                <div className="p-3 text-center text-[var(--forge-text-muted)] text-[11px]">
                  Open another tab first to run side-by-side in split view.
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--forge-text-muted)] uppercase tracking-wider block px-2 mb-1">
                    Select Tab to Split With
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {otherTabs.map((t) => {
                      const session = getSession(t.sessionId);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSplitTab(t.id);
                            setIsOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] text-left transition-colors cursor-pointer text-zinc-200"
                        >
                          <span className="truncate flex-1 mr-2 text-xs">{t.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] text-[var(--forge-text-muted)]">{session.name}</span>
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: session.color }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
