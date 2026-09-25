import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Settings } from "lucide-react";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { useSessionsStore } from "../../core/sessions/useSessionsStore";

export function SessionBadgeButton() {
  const { tabs, activeTabId, setTabSession } = useTabsStore();
  const { sessions, setSessionModalOpen, getSession } = useSessionsStore();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const currentSession = getSession(activeTab?.sessionId);

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

  if (!activeTab) return null;

  const isTor = currentSession.mode === "tor" || currentSession.id === "tor";
  const isPrivate = currentSession.mode === "private" || currentSession.id === "private";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Current Session: ${currentSession.name} (${currentSession.partition}) - Click to switch`}
        className="h-6 px-2 flex items-center gap-1.5 rounded-md hover:bg-[var(--forge-hover)] transition-all cursor-pointer border border-[var(--forge-border)]"
        style={{
          borderColor: currentSession.id !== "default" ? `${currentSession.color}50` : undefined,
          backgroundColor: currentSession.id !== "default" ? `${currentSession.color}15` : undefined,
        }}
      >
        {isTor ? (
          <span className="text-xs select-none">🧅</span>
        ) : isPrivate ? (
          <span className="text-xs select-none">🕶️</span>
        ) : (
          <span
            className="w-2 h-2 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: currentSession.color }}
          />
        )}
        <span
          className="text-xs font-semibold max-w-[85px] truncate"
          style={{ color: currentSession.id !== "default" ? currentSession.color : "var(--forge-text-secondary)" }}
        >
          {currentSession.name}
        </span>
        <ChevronDown size={10} className="text-[var(--forge-text-muted)]" />
      </button>

      {/* Session Container Switcher Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-2xl p-1.5 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 border-b border-[var(--forge-border)] mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--forge-text-muted)] uppercase tracking-wider">
              Assign Container
            </span>
            <span className="text-[9px] font-mono text-[#FF6B00]">Hardware Isolated</span>
          </div>

          <div className="space-y-0.5">
            {sessions.map((sess) => {
              const isSelected = sess.id === (activeTab.sessionId || "default");

              return (
                <button
                  key={sess.id}
                  type="button"
                  onClick={() => {
                    setTabSession(activeTab.id, sess.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-left ${
                    isSelected
                      ? "bg-[var(--forge-hover)] text-white font-bold"
                      : "hover:bg-[var(--forge-hover)] text-[var(--forge-text-secondary)] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {sess.mode === "private" || sess.id === "private" ? (
                      <span className="text-xs select-none">🕶️</span>
                    ) : sess.mode === "tor" || sess.id === "tor" ? (
                      <span className="text-xs select-none">🧅</span>
                    ) : (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: sess.color }}
                      />
                    )}
                    <span className="truncate">{sess.name}</span>
                  </div>
                  {isSelected && <Check size={12} className="text-[#FF6B00] shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 mt-1 border-t border-[var(--forge-border)] space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                const bridge = (window as any).forge || (window as any).electron;
                bridge?.openPrivate?.();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/15 text-purple-300 hover:text-purple-200 transition-colors cursor-pointer text-left text-xs"
            >
              <span>🕶️</span>
              <span className="font-semibold">New Private Window</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setSessionModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[#FF6B00] transition-colors cursor-pointer text-left"
            >
              <Settings size={12} />
              <span>Manage Containers...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
