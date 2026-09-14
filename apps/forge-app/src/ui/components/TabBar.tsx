import { useState } from "react";
import { X, Plus, Globe } from "lucide-react";
import { useTabsStore } from "../../core/tabs/useTabsStore";

export function TabBar() {
  const { tabs, activeTabId, openTab, closeTab, setActiveTab, moveTab } = useTabsStore();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; side: "left" | "right" } | null>(null);

  const isCompact = tabs.length >= 14;
  const isUltraCompact = tabs.length >= 22;

  const handleDragStart = (e: React.DragEvent, index: number) => {
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

  return (
    <div
      className="h-7 bg-[var(--forge-bg)] flex items-end px-1 gap-[2px] border-b border-[var(--forge-border)] shrink-0 overflow-hidden transition-colors select-none w-full max-w-full"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const isBeingDragged = draggedIndex === index;
        const hasDropIndicator = dropTarget?.index === index;

        return (
          <div
            key={tab.id}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => setActiveTab(tab.id)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
            title={tab.title}
            className={`group relative flex items-center ${
              isUltraCompact
                ? "justify-center px-0.5"
                : isCompact
                ? "justify-start px-1 gap-1"
                : "justify-start px-2 gap-1.5"
            } h-6 flex-1 min-w-0 max-w-[200px] rounded-t-md select-none transition-all ${
              isBeingDragged
                ? "opacity-35 scale-[0.97] border border-dashed border-[#FF6B00]/70 cursor-grabbing bg-[var(--forge-surface-elevated)]"
                : "cursor-grab active:cursor-grabbing"
            } ${
              isActive && !isBeingDragged
                ? "bg-[var(--forge-surface)] text-[var(--forge-text)] border-t border-l border-r border-[var(--forge-border)] border-b-0 shadow-sm font-medium"
                : !isBeingDragged
                ? "bg-transparent text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)] hover:text-[var(--forge-text)]"
                : ""
            }`}
          >
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
        onDragOver={handleSpacerDragOver}
        onDrop={handleSpacerDrop}
        title="New Tab (Ctrl + T)"
        className="w-5 h-5 mb-0.5 ml-0.5 flex items-center justify-center rounded text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)] hover:text-[var(--forge-text)] transition-colors shrink-0 cursor-pointer"
      >
        <Plus size={13} />
      </button>

      {/* Flexible trailing spacer to absorb remaining width and support double-click to open new tab or drop to move to end */}
      <div
        className="flex-1 h-full min-w-0 cursor-default"
        onDoubleClick={() => openTab()}
        onDragOver={handleSpacerDragOver}
        onDrop={handleSpacerDrop}
        title="Double click to open a new tab"
      />
    </div>
  );
}
