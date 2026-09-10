import { X, Plus, Globe } from "lucide-react";
import { useTabsStore } from "../../core/tabs/useTabsStore";

export function TabBar() {
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useTabsStore();

  const isCompact = tabs.length >= 14;
  const isUltraCompact = tabs.length >= 22;

  return (
    <div
      className="h-7 bg-[var(--forge-bg)] flex items-end px-1 gap-[2px] border-b border-[var(--forge-border)] shrink-0 overflow-hidden transition-colors select-none w-full max-w-full"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
            title={tab.title}
            className={`group relative flex items-center ${
              isUltraCompact ? "justify-center px-0.5" : isCompact ? "justify-start px-1 gap-1" : "justify-start px-2 gap-1.5"
            } h-6 flex-1 min-w-0 max-w-[200px] rounded-t-md cursor-pointer select-none transition-all ${
              isActive
                ? "bg-[var(--forge-surface)] text-[var(--forge-text)] border-t border-l border-r border-[var(--forge-border)] border-b-0 shadow-sm font-medium"
                : "bg-transparent text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)] hover:text-[var(--forge-text)]"
            }`}
          >
            {/* Favicon or Globe */}
            {tab.favicon ? (
              <img
                src={tab.favicon}
                alt=""
                className="w-3.5 h-3.5 shrink-0 rounded-sm pointer-events-none"
              />
            ) : (
              <Globe
                size={12}
                className={`shrink-0 pointer-events-none ${
                  isActive ? "text-[#FF6B00]" : "text-[var(--forge-text-muted)]"
                }`}
              />
            )}

            {/* Title (truncated, hides gracefully when tab strip becomes very dense) */}
            {!isUltraCompact && (
              <span className="flex-1 text-xs truncate min-w-0 pointer-events-none hidden sm:inline">
                {tab.title}
              </span>
            )}

            {/* Loading indicator */}
            {tab.isLoading && (
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse shrink-0" />
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={`w-3.5 h-3.5 flex items-center justify-center rounded transition-colors shrink-0 ${
                isCompact
                  ? "opacity-0 group-hover:opacity-100 hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  : isActive
                  ? "opacity-80 hover:opacity-100 hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  : "opacity-0 group-hover:opacity-100 hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
              title="Close Tab (Ctrl+W)"
            >
              <X size={10} />
            </button>

            {/* Active tab orange indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-0.5 right-0.5 h-[2px] bg-[#FF6B00] rounded-full" />
            )}
          </div>
        );
      })}

      {/* New tab button placed immediately adjacent to the last tab */}
      <button
        type="button"
        onClick={() => openTab()}
        title="New Tab (Ctrl + T)"
        className="w-5 h-5 mb-0.5 ml-0.5 flex items-center justify-center rounded text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)] hover:text-[var(--forge-text)] transition-colors shrink-0 cursor-pointer"
      >
        <Plus size={13} />
      </button>

      {/* Flexible trailing spacer to absorb remaining width and support double-click to open new tab */}
      <div
        className="flex-1 h-full min-w-0 cursor-default"
        onDoubleClick={() => openTab()}
        title="Double click to open a new tab"
      />
    </div>
  );
}
