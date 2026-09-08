import { X, Plus, Globe } from "lucide-react";
import { useTabsStore } from "../../core/tabs/useTabsStore";

export function TabBar() {
  const { tabs, activeTabId, openTab, closeTab, setActiveTab } = useTabsStore();

  return (
    <div className="h-7 bg-[var(--forge-bg)] flex items-end px-1.5 gap-0.5 border-b border-[var(--forge-border)] shrink-0 overflow-x-auto overflow-y-hidden transition-colors">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group relative flex items-center gap-1.5 h-6 px-2.5 min-w-[100px] max-w-[200px] rounded-t-md cursor-pointer select-none transition-all ${
              isActive
                ? "bg-[var(--forge-surface)] text-[var(--forge-text)] border-t border-l border-r border-[var(--forge-border)] border-b-0 shadow-sm font-medium"
                : "bg-transparent text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)] hover:text-[var(--forge-text)]"
            }`}
          >
            {/* Favicon or Globe */}
            {tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-3.5 h-3.5 shrink-0 rounded-sm" />
            ) : (
              <Globe
                size={12}
                className={isActive ? "text-[#FF6B00]" : "text-[var(--forge-text-muted)]"}
              />
            )}

            {/* Title */}
            <span className="flex-1 text-xs truncate">{tab.title}</span>

            {/* Loading indicator */}
            {tab.isLoading && (
              <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse shrink-0" />
            )}

            {/* Close */}
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className={`w-4 h-4 flex items-center justify-center rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0 ${
                isActive ? "opacity-100 hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]" : "hover:bg-[var(--forge-hover)]"
              }`}
            >
              <X size={10} />
            </button>

            {/* Active tab orange indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#FF6B00] rounded-full" />
            )}
          </div>
        );
      })}

      {/* New tab button */}
      <button
        onClick={() => openTab()}
        title="New Tab"
        className="ml-1 w-5 h-5 flex items-center justify-center rounded text-[var(--forge-text-muted)] hover:bg-[var(--forge-surface)] hover:text-[var(--forge-text)] transition-colors self-center shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
