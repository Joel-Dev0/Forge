import { Minus, Square, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { WorkspaceSelector } from "./WorkspaceSelector";

export function TitleBar() {
  const getElectron = () => (window as any).electron || (window as any).forge;

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

  const noDragStyle = { WebkitAppRegion: "no-drag", appRegion: "no-drag" } as React.CSSProperties;
  const dragStyle = { WebkitAppRegion: "drag", appRegion: "drag" } as React.CSSProperties;

  return (
    <header className="h-7 bg-[var(--forge-bg)] flex items-center justify-between px-2 select-none shrink-0 border-b border-[var(--forge-border)] transition-colors relative z-50">
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
        className="flex items-center gap-1.5 titlebar-no-drag z-10"
        style={noDragStyle}
      >
        <ThemeToggle />

        <div className="w-px h-3 bg-[var(--forge-border)] mx-0.5" />

        <button
          type="button"
          onClick={handleMinimize}
          className="titlebar-no-drag w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--forge-hover)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)] transition-colors cursor-pointer"
          style={noDragStyle}
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="titlebar-no-drag w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--forge-hover)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)] transition-colors cursor-pointer"
          style={noDragStyle}
          title="Maximize"
          aria-label="Maximize"
        >
          <Square size={11} />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="titlebar-no-drag w-6 h-6 flex items-center justify-center rounded hover:bg-red-600 text-[var(--forge-text-secondary)] hover:text-white transition-colors cursor-pointer"
          style={noDragStyle}
          title="Close"
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>
    </header>
  );
}