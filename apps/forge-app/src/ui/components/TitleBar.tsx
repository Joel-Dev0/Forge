import { useState, useEffect } from "react";
import { Minus, Square, X, Keyboard } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { WorkspaceSelector } from "./WorkspaceSelector";

export function TitleBar() {
  const [isMax, setIsMax] = useState(false);

  const getElectron = () => {
    if (typeof window === "undefined") return null;
    return (window as any).forge || (window as any).electron || null;
  };

  useEffect(() => {
    const el = getElectron();
    if (el?.isMaximized) {
      el.isMaximized().then((m: boolean) => setIsMax(m)).catch(() => {});
    }
    const updateMaxState = () => {
      const currentEl = getElectron();
      if (currentEl?.isMaximized) {
        currentEl.isMaximized().then((m: boolean) => setIsMax(m)).catch(() => {});
      }
    };
    window.addEventListener("resize", updateMaxState);
    return () => window.removeEventListener("resize", updateMaxState);
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = getElectron();
    if (el?.minimize) {
      el.minimize();
    } else {
      console.warn("[TitleBar] Minimize clicked - electron bridge not detected");
    }
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = getElectron();
    if (el?.maximize) {
      el.maximize();
      setTimeout(() => {
        if (el?.isMaximized) {
          el.isMaximized().then((m: boolean) => setIsMax(m)).catch(() => {});
        }
      }, 150);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = getElectron();
    if (el?.close) {
      el.close();
    } else {
      window.close();
    }
  };

  const noDragStyle = { WebkitAppRegion: "no-drag" } as React.CSSProperties;
  const dragStyle = { WebkitAppRegion: "drag" } as React.CSSProperties;

  return (
    <header className="h-7 bg-[var(--forge-bg)] flex items-center justify-between pl-2 pr-0 select-none shrink-0 border-b border-[var(--forge-border)] transition-colors relative z-50">
      {/* Brand & Workspace Selector */}
      <div className="flex items-center gap-2 titlebar-drag h-full select-none cursor-default" style={dragStyle}>
        <img
          src="/logo.png"
          alt="Forge"
          className="w-5 h-5 rounded-sm object-contain pointer-events-none"
        />

        <div style={noDragStyle} className="titlebar-no-drag">
          <WorkspaceSelector />
        </div>
      </div>

      {/* Center Draggable Spacer */}
      <div
        className="flex-1 h-full titlebar-drag cursor-default"
        style={dragStyle}
        onDoubleClick={handleMaximize}
      />

      {/* Right controls */}
      <div
        className="flex items-center h-full titlebar-no-drag z-10"
        style={noDragStyle}
      >
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("forge:toggle-hotkeys"))}
          className="titlebar-no-drag w-7 h-full flex items-center justify-center hover:bg-[var(--forge-hover)] text-[var(--forge-text-secondary)] hover:text-[#FF6B00] transition-colors cursor-pointer"
          style={noDragStyle}
          title="Keyboard Shortcuts (F1)"
          aria-label="Keyboard Shortcuts"
        >
          <Keyboard size={13} className="pointer-events-none select-none" />
        </button>

        <div className="px-1 h-full flex items-center">
          <ThemeToggle />
        </div>

        <div className="w-px h-3.5 bg-[var(--forge-border)] mx-1" />

        {/* Minimize Button */}
        <button
          type="button"
          onClick={handleMinimize}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="window-control-btn titlebar-no-drag h-full w-10 flex items-center justify-center text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
          style={noDragStyle}
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus size={13} className="pointer-events-none select-none" />
        </button>

        {/* Maximize / Restore Button */}
        <button
          type="button"
          onClick={handleMaximize}
          className="window-control-btn titlebar-no-drag h-full w-10 flex items-center justify-center text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
          style={noDragStyle}
          title={isMax ? "Restore Down" : "Maximize"}
          aria-label={isMax ? "Restore Down" : "Maximize"}
        >
          {isMax ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2" className="pointer-events-none select-none">
              <rect x="2.5" y="0.5" width="8" height="8" rx="0.5" />
              <path d="M0.5 2.5v8h8" />
            </svg>
          ) : (
            <Square size={11} className="pointer-events-none select-none" />
          )}
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="window-control-btn titlebar-no-drag h-full w-11 flex items-center justify-center text-[var(--forge-text-secondary)] hover:text-white hover:bg-[#e81123] transition-colors cursor-pointer"
          style={noDragStyle}
          title="Close"
          aria-label="Close"
        >
          <X size={13} className="pointer-events-none select-none" />
        </button>
      </div>
    </header>
  );
}