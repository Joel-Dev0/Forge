import React, { useState, useEffect } from "react";
import {
  Globe,
  Terminal,
  ArrowRight,
  BookOpen,
  Layers,
  Code2,
  X,
  Flame,
  ShieldCheck,
  Sparkles,
  Clock,
} from "lucide-react";
import {
  normalizeUrl,
  useNavigationStore,
  SEARCH_ENGINES,
} from "../../core/navigation/useNavigationStore";
import { SearchEngineDropdown } from "./SearchEngineDropdown";
import { useWallpaperStore } from "../../core/wallpaper/useWallpaperStore";
import { WallpaperModal } from "./newtab/WallpaperModal";
import { DevNewsFeed } from "./newtab/DevNewsFeed";

interface Props {
  onNavigate: (url: string) => void;
}

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface ShortcutItem {
  id: string;
  name: string;
  url: string;
  icon?: React.ReactNode;
}

const DEFAULT_DEV_SHORTCUTS: ShortcutItem[] = [
  { id: "github", name: "GitHub", url: "https://github.com", icon: <GithubIcon /> },
  { id: "mdn", name: "MDN", url: "https://developer.mozilla.org", icon: <BookOpen size={16} /> },
  { id: "devdocs", name: "DevDocs", url: "https://devdocs.io", icon: <Terminal size={16} /> },
  { id: "so", name: "Stack Overflow", url: "https://stackoverflow.com", icon: <Code2 size={16} /> },
  { id: "npm", name: "NPM", url: "https://www.npmjs.com", icon: <Layers size={16} /> },
  { id: "bundlephobia", name: "Bundlephobia", url: "https://bundlephobia.com", icon: <Globe size={16} /> },
];

export function NewTabHome({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [greeting, setGreeting] = useState("Developer");

  const { searchEngine } = useNavigationStore();
  const { config, activeUrl, loadWallpaper } = useWallpaperStore();

  useEffect(() => {
    loadWallpaper();
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
      );

      const hour = now.getHours();
      if (hour < 5) setGreeting("Good Late Night");
      else if (hour < 12) setGreeting("Good Morning");
      else if (hour < 18) setGreeting("Good Afternoon");
      else setGreeting("Good Evening");
    };

    updateClock();
    const timer = setInterval(updateClock, 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const url = normalizeUrl(q, searchEngine);
    onNavigate(url);
  };

  const dimAlpha = (config.dimOpacity ?? 45) / 100;
  const blurValue = config.blurPx ?? 0;

  return (
    <div className="w-full h-full relative flex flex-col items-center bg-[var(--forge-bg)] text-[var(--forge-text)] select-none overflow-y-auto overflow-x-hidden">
      {/* ================= WALLPAPER BACKGROUND LAYER ================= */}
      {activeUrl ? (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
          style={{
            backgroundImage: `url("${activeUrl}")`,
            filter: blurValue > 0 ? `blur(${blurValue}px)` : "none",
            transform: blurValue > 0 ? "scale(1.04)" : "none", // Prevent edge bleeding when blurred
          }}
        />
      ) : (
        /* Signature Forge Ember ambient glow when no wallpaper image is set */
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-[#FF6B00]/12 rounded-full blur-[140px]" />
          <div className="absolute top-2/3 left-1/3 w-[450px] h-[300px] bg-amber-500/8 rounded-full blur-[120px]" />
        </div>
      )}

      {/* Dim / Darkness & Frost Overlay */}
      {activeUrl && (
        <div
          className="fixed inset-0 z-0 pointer-events-none transition-colors duration-300"
          style={{
            backgroundColor: `rgba(13, 13, 13, ${dimAlpha})`,
          }}
        />
      )}

      {/* ================= TOP BAR ================= */}
      <div className="relative z-10 w-full max-w-5xl px-6 py-4 flex items-center justify-between">
        {/* Left: Clock & Greeting */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[var(--forge-surface)]/70 border border-[var(--forge-border)]/60 backdrop-blur-md flex items-center gap-2 shadow-sm">
            <Clock size={13} className="text-[#FF6B00]" />
            <span className="text-xs font-mono font-semibold text-[var(--forge-text)]">
              {currentTime}
            </span>
            <span className="text-[11px] text-[var(--forge-text-muted)] font-medium">
              • {currentDate}
            </span>
          </div>
          <span className="text-xs font-medium text-[var(--forge-text-secondary)] hidden sm:inline drop-shadow-sm">
            {greeting}, ready to ship?
          </span>
        </div>

        {/* Right: Customize Wallpaper Button */}
        <button
          type="button"
          onClick={() => setIsWallpaperModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--forge-surface)]/75 hover:bg-[var(--forge-surface)] border border-[var(--forge-border)]/70 hover:border-[#FF6B00]/60 backdrop-blur-md text-xs font-medium text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)] transition-all cursor-pointer shadow-sm hover:shadow"
        >
          <Sparkles size={13} className="text-[#FF6B00]" />
          <span>Customize Wallpaper</span>
        </button>
      </div>

      {/* ================= MAIN DASHBOARD CONTAINER ================= */}
      <div className="relative z-10 w-full max-w-5xl px-6 pb-12 flex flex-col items-center gap-8 mt-2">
        {/* HERO SECTION: LOGO + SEARCH + SHORTCUTS */}
        <div className="w-full max-w-2xl flex flex-col items-center gap-6">
          {/* Logo with interactive glowing badge */}
          <div className="relative group cursor-default">
            <div className="absolute inset-0 bg-[#FF6B00]/35 rounded-2xl blur-xl scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-3.5 rounded-2xl bg-[var(--forge-surface)]/85 border border-[var(--forge-border)] shadow-xl backdrop-blur-md">
              <img
                src="/logo.png"
                alt="Forge"
                className="w-14 h-14 rounded-xl object-contain"
              />
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="w-full">
            <div
              className="flex items-center h-12 rounded-2xl backdrop-blur-md transition-all duration-200"
              style={{
                background: "var(--forge-surface)",
                opacity: 0.95,
                border: focused
                  ? "1px solid #FF6B00"
                  : "1px solid var(--forge-border)",
                boxShadow: focused
                  ? "0 0 0 3px rgba(255,107,0,0.18), 0 10px 25px -5px rgba(0,0,0,0.3)"
                  : "0 4px 15px -2px rgba(0,0,0,0.25)",
              }}
            >
              {/* Search Engine Dropdown */}
              <div className="ml-2 shrink-0">
                <SearchEngineDropdown variant="home" />
              </div>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter") {
                    handleSearch(e);
                  }
                }}
                placeholder={
                  SEARCH_ENGINES[searchEngine]?.placeholder ||
                  "Search web or type an address..."
                }
                className="flex-1 h-full px-3.5 text-[13px] bg-transparent border-none outline-none text-[var(--forge-text)] placeholder-[var(--forge-text-muted)] min-w-0"
                autoFocus
              />

              {query.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  title="Clear"
                  className="w-6 h-6 mr-1.5 flex items-center justify-center rounded-full text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer shrink-0"
                >
                  <X size={12} />
                </button>
              )}

              <button
                type="submit"
                title="Search (Enter)"
                className="h-full px-4 flex items-center justify-center text-[var(--forge-text-muted)] hover:text-[#FF6B00] transition-colors duration-150 cursor-pointer border-l border-[var(--forge-border)] shrink-0"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </form>

          {/* Quick Shortcuts */}
          <div className="w-full">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {DEFAULT_DEV_SHORTCUTS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  title={sc.name}
                  onClick={() => onNavigate(sc.url)}
                  className="group flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl bg-[var(--forge-surface)]/75 hover:bg-[var(--forge-surface)] border border-[var(--forge-border)]/70 hover:border-[#FF6B00]/60 backdrop-blur-md transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <span className="text-[var(--forge-text-secondary)] group-hover:text-[#FF6B00] transition-colors duration-150">
                    {sc.icon}
                  </span>
                  <span className="text-[10px] font-medium text-[var(--forge-text-muted)] group-hover:text-[var(--forge-text)] transition-colors truncate w-full text-center px-1">
                    {sc.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ================= DEVELOPER NEWS FEED SECTION ================= */}
        <div className="w-full rounded-2xl bg-[var(--forge-surface)]/45 border border-[var(--forge-border)]/70 p-5 md:p-6 backdrop-blur-md shadow-lg">
          <DevNewsFeed onNavigate={onNavigate} />
        </div>

        {/* ================= FOOTER STATUS PILLS ================= */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[10px] font-mono text-[var(--forge-text-muted)] pt-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--forge-surface)]/70 border border-[var(--forge-border)]/70 backdrop-blur-sm shadow-sm">
            <Flame size={10} className="text-[#FF6B00]" />
            <span>HTTP Turbo Engine</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--forge-surface)]/70 border border-[var(--forge-border)]/70 backdrop-blur-sm shadow-sm">
            <ShieldCheck size={10} className="text-emerald-500" />
            <span>AdBlock & Shield Active</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--forge-surface)]/70 border border-[var(--forge-border)]/70 backdrop-blur-sm shadow-sm">
            <Terminal size={10} className="text-blue-400" />
            <span>Press Ctrl+T for New Tab • Ctrl+L for URL</span>
          </div>
        </div>
      </div>

      {/* ================= WALLPAPER CUSTOMIZER MODAL ================= */}
      <WallpaperModal
        isOpen={isWallpaperModalOpen}
        onClose={() => setIsWallpaperModalOpen(false)}
      />
    </div>
  );
}