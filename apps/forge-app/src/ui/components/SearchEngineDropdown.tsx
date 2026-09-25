import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useNavigationStore, type SearchEngine } from "../../core/navigation/useNavigationStore";

interface Props {
  variant?: "compact" | "home";
}

// Crisp brand icons for each search engine
export function GoogleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function DuckDuckGoIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
      <circle cx="12" cy="12" r="10" fill="#DE5833" />
      <path
        fill="#FFFFFF"
        d="M12 6.5c-2.3 0-4 1.7-4 4 0 1.2.5 2.2 1.4 3-.2.5-.6 1.3-1.4 1.8 1.4.2 2.7-.4 3.4-1.2.5.1 1.1.2 1.6.2 2.3 0 4-1.7 4-4s-1.7-3.8-5-3.8zm1 3.2c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7zm-2.8 0c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7z"
      />
    </svg>
  );
}

export function BingIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0">
      <path
        fill="#008373"
        d="M5 3v18l6-3.5 6-3.5-3-1.5-3 1.5V6.5L5 3z"
      />
    </svg>
  );
}

const ENGINE_OPTIONS: Array<{
  id: SearchEngine;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: (size?: number) => ReactNode;
}> = [
  {
    id: "google",
    name: "Google",
    badge: "Google",
    badgeColor: "text-[#4285F4]",
    description: "Standard web search, images & fast answers",
    icon: (s) => <GoogleIcon size={s} />,
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    badge: "DuckDuckGo",
    badgeColor: "text-[#DE5833]",
    description: "Privacy-focused search, zero tracking",
    icon: (s) => <DuckDuckGoIcon size={s} />,
  },
  {
    id: "bing",
    name: "Bing",
    badge: "Bing",
    badgeColor: "text-[#008373]",
    description: "Microsoft Bing search & AI capabilities",
    icon: (s) => <BingIcon size={s} />,
  },
];

export function SearchEngineDropdown({ variant = "compact" }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { searchEngine, setSearchEngine } = useNavigationStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentOption = ENGINE_OPTIONS.find((o) => o.id === searchEngine) || ENGINE_OPTIONS[0];

  const handleSelect = (id: SearchEngine) => {
    setSearchEngine(id);
    setIsOpen(false);
  };

  const isCompact = variant === "compact";

  return (
    <div ref={dropdownRef} className={`relative inline-flex items-center select-none ${isOpen ? "z-50" : ""}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Search engine: ${currentOption.name}. Click to change.`}
        className={`flex items-center gap-1.5 rounded transition-all cursor-pointer border ${
          isCompact
            ? "px-1.5 py-0.5 text-[11px] font-medium border-[var(--forge-border)] bg-[var(--forge-surface)] hover:bg-[var(--forge-hover)] text-[var(--forge-text)]"
            : "px-2.5 py-1.5 text-xs font-medium border-[var(--forge-border)] bg-[var(--forge-surface)] hover:bg-[var(--forge-hover)] text-[var(--forge-text)] shadow-sm"
        } ${isOpen ? "ring-1 ring-[#FF6B00] border-[#FF6B00]/60" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {currentOption.icon(isCompact ? 13 : 15)}
        <span className={`font-semibold tracking-tight ${currentOption.badgeColor}`}>
          {currentOption.name}
        </span>
        <ChevronDown
          size={isCompact ? 10 : 12}
          className={`text-[var(--forge-text-muted)] transition-transform duration-150 ${
            isOpen ? "rotate-180 text-[#FF6B00]" : ""
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 min-w-[250px] p-1.5 rounded-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 top-full left-0"
          role="listbox"
        >
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] border-b border-[var(--forge-border)] mb-1">
            Select Search Engine
          </div>

          <div className="flex flex-col gap-0.5">
            {ENGINE_OPTIONS.map((opt) => {
              const isSelected = opt.id === searchEngine;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#FF6B00]/12 text-[var(--forge-text)] ring-1 ring-[#FF6B00]/40"
                      : "hover:bg-[var(--forge-hover)] text-[var(--forge-text)]"
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {opt.icon(16)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold leading-tight">
                        {opt.name}
                      </span>
                      <span className="text-[10px] text-[var(--forge-text-muted)] leading-tight mt-0.5">
                        {opt.description}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-[#FF6B00] shrink-0 ml-2 font-bold" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
