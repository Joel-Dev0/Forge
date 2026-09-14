import { useRef, useState, useEffect, type KeyboardEvent, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, RotateCw, Star, Maximize2, Minimize2, PictureInPicture2, ArrowRight, X } from "lucide-react";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { useNavigationStore, normalizeUrl, SEARCH_ENGINES } from "../../core/navigation/useNavigationStore";
import { useBookmarksStore } from "../../core/bookmarks/useBookmarksStore";
import { ShieldsButton } from "./ShieldsButton";
import { SecureNetworkButton } from "./SecureNetworkButton";
import { SearchEngineDropdown } from "./SearchEngineDropdown";

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
  const { urlBarValue, setUrlBarValue, searchEngine } = useNavigationStore();
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarksStore();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const bookmarked = isBookmarked(urlBarValue);

  const isSelectingOnFocus = useRef(false);

  useEffect(() => {
    const handleFocusEvent = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("forge:focus-address-bar", handleFocusEvent);
    return () => window.removeEventListener("forge:focus-address-bar", handleFocusEvent);
  }, []);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    isSelectingOnFocus.current = true;
    e.target.select();
  };

  const handleInputMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    if (isSelectingOnFocus.current) {
      isSelectingOnFocus.current = false;
      e.preventDefault();
      e.currentTarget.select();
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = (urlBarValue || "").trim();
    if (!trimmed || trimmed === "about:blank") return;
    const url = normalizeUrl(trimmed, searchEngine);
    setUrlBarValue(url);
    onNavigate(url);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter") {
      e.preventDefault();
      handleSubmit();
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

      {/* URL bar Form */}
      <form
        onSubmit={handleSubmit}
        className={`flex-1 flex items-center gap-1.5 h-6 px-2 rounded-md transition-all ${
          focused
            ? "bg-[var(--forge-surface)] ring-1 ring-[#FF6B00] shadow-sm"
            : "bg-[var(--forge-input)] hover:bg-[var(--forge-hover)]"
        }`}
      >
        <ShieldsButton currentUrl={activeTab?.url || urlBarValue} onReload={onReload} />

        {/* Search Engine Dropdown */}
        <SearchEngineDropdown variant="compact" />

        <input
          ref={inputRef}
          type="text"
          value={urlBarValue === "about:blank" ? "" : urlBarValue}
          onChange={(e) => setUrlBarValue(e.target.value)}
          onFocus={handleInputFocus}
          onMouseUp={handleInputMouseUp}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[var(--forge-text)] text-sm outline-none placeholder-[var(--forge-text-muted)] font-mono selection:bg-[#FF6B00]/20 min-w-0"
          placeholder={SEARCH_ENGINES[searchEngine]?.placeholder || "Search or enter address..."}
          spellCheck={false}
        />

        {/* Clear button if text entered */}
        {urlBarValue && urlBarValue !== "about:blank" && (
          <button
            type="button"
            onClick={() => {
              setUrlBarValue("");
              inputRef.current?.focus();
            }}
            title="Clear"
            className="w-4 h-4 flex items-center justify-center rounded-full text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer shrink-0"
          >
            <X size={11} />
          </button>
        )}

        {/* Search / Enter Submit Button */}
        <button
          type="submit"
          title="Search or Go (Enter)"
          className="w-5 h-5 flex items-center justify-center rounded text-[var(--forge-text-muted)] hover:text-[#FF6B00] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer shrink-0"
        >
          <ArrowRight size={13} />
        </button>
      </form>

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
