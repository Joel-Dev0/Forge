import { useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Star, Maximize2, Minimize2, PictureInPicture2 } from "lucide-react";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { useNavigationStore, normalizeUrl } from "../../core/navigation/useNavigationStore";
import { useBookmarksStore } from "../../core/bookmarks/useBookmarksStore";
import { ShieldsButton } from "./ShieldsButton";
import { SecureNetworkButton } from "./SecureNetworkButton";

interface Props {
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onTogglePiP?: () => void;
}

export function NavigationBar({ onNavigate, onBack, onForward, onReload, onToggleFullscreen, isFullscreen, onTogglePiP }: Props) {
  const { tabs, activeTabId } = useTabsStore();
  const { urlBarValue, setUrlBarValue } = useNavigationStore();
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarksStore();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const bookmarked = isBookmarked(urlBarValue);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const url = normalizeUrl(urlBarValue);
      setUrlBarValue(url);
      onNavigate(url);
      inputRef.current?.blur();
    }
    if (e.key === "Escape") inputRef.current?.blur();
  };

  const handleBookmarkToggle = () => {
    if (bookmarked) {
      removeBookmark(urlBarValue);
    } else {
      addBookmark(activeTab?.title ?? urlBarValue, urlBarValue);
    }
  };

  return (
    <div className="h-8 bg-[var(--forge-surface)] flex items-center gap-1.5 px-2 border-b border-[var(--forge-border)] shrink-0 transition-colors">
      {/* Back / Forward / Reload */}
      <div className="flex items-center gap-0.5">
        <NavBtn onClick={onBack} disabled={!activeTab?.canGoBack} title="Back">
          <ChevronLeft size={15} />
        </NavBtn>
        <NavBtn onClick={onForward} disabled={!activeTab?.canGoForward} title="Forward">
          <ChevronRight size={15} />
        </NavBtn>
        <NavBtn
          onClick={onReload}
          disabled={false}
          title="Reload"
          className={activeTab?.isLoading ? "animate-spin text-[#FF6B00]" : ""}
        >
          <RotateCw size={14} />
        </NavBtn>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--forge-border)]" />

      {/* URL bar */}
      <div
        className={`flex-1 flex items-center gap-2 h-6 px-2.5 rounded-md transition-all ${
          focused
            ? "bg-[var(--forge-surface)] ring-1 ring-[#FF6B00] shadow-sm"
            : "bg-[var(--forge-input)] hover:bg-[var(--forge-hover)]"
        }`}
      >
        <ShieldsButton currentUrl={activeTab?.url || urlBarValue} onReload={onReload} />
        <input
          ref={inputRef}
          type="text"
          value={urlBarValue}
          onChange={(e) => setUrlBarValue(e.target.value)}
          onFocus={() => { setFocused(true); inputRef.current?.select(); }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[var(--forge-text)] text-sm outline-none placeholder-[var(--forge-text-muted)] font-mono selection:bg-[#FF6B00]/20"
          placeholder="Search or enter address..."
          spellCheck={false}
        />
      </div>

      {/* Video & Page Fullscreen Toggle */}
      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen (Esc)" : "Toggle Fullscreen (F11 / F)"}
        className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
          isFullscreen
            ? "bg-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#FF6B00]/30"
            : "hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[#FF6B00]"
        }`}
      >
        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      </button>

      {/* Picture-in-Picture Toggle */}
      <button
        onClick={onTogglePiP}
        title="Picture-in-Picture (Alt+P)"
        className="w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[#FF6B00]"
      >
        <PictureInPicture2 size={13} />
      </button>

      {/* Bookmark */}
      <button
        onClick={handleBookmarkToggle}
        title={bookmarked ? "Remove bookmark" : "Add bookmark"}
        className={`w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--forge-hover)] transition-colors ${
          bookmarked ? "text-[#FFB347]" : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
        }`}
      >
        <Star size={14} fill={bookmarked ? "currentColor" : "none"} />
      </button>

      {/* Forge Secure Network Button */}
      <SecureNetworkButton />
    </div>
  );
}

function NavBtn({
  children,
  onClick,
  disabled,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  title: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
        disabled
          ? "text-[var(--forge-text-muted)] opacity-40 cursor-not-allowed"
          : "text-[var(--forge-text-secondary)] hover:bg-[var(--forge-hover)] hover:text-[var(--forge-text)]"
      } ${className}`}
    >
      {children}
    </button>
  );
}
