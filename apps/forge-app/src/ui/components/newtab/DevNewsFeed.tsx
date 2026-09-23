import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  Package,
  Cpu,
  Layers,
  Search,
  RefreshCw,
  ExternalLink,
  Flame,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import {
  useDevNewsStore,
  type NewsCategory,
  type BadgeColor,
  type DevNewsItem,
} from "../../../core/news/useDevNewsStore";

interface Props {
  onNavigate: (url: string) => void;
}

/* ── Visual helpers ── */

/** Deterministic gradient fallback when no image is available */
const coverGradient = (color: BadgeColor, id: string): string => {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = hash % 360;
  const gradients: Record<BadgeColor, string> = {
    red: `linear-gradient(${angle}deg, #1a0000 0%, #450a0a 30%, #7f1d1d 60%, #b91c1c 100%)`,
    amber: `linear-gradient(${angle}deg, #1a0f00 0%, #451a03 30%, #78350f 60%, #b45309 100%)`,
    blue: `linear-gradient(${angle}deg, #000a1a 0%, #0c1a3e 30%, #1e3a5f 60%, #2563eb 100%)`,
    emerald: `linear-gradient(${angle}deg, #001a0f 0%, #022c22 30%, #064e3b 60%, #059669 100%)`,
    purple: `linear-gradient(${angle}deg, #0f001a 0%, #2e1065 30%, #4c1d95 60%, #7c3aed 100%)`,
  };
  return gradients[color] || gradients.blue;
};

/** Favicon from source URL domain */
const sourceFavicon = (sourceUrl: string): string => {
  try {
    const domain = new URL(sourceUrl).hostname;
    return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
  } catch {
    return "";
  }
};

const getBadgeStyle = (color: BadgeColor) => {
  switch (color) {
    case "red":
      return "bg-rose-500/25 text-rose-200 border-rose-500/40";
    case "amber":
      return "bg-amber-500/25 text-amber-200 border-amber-500/40";
    case "blue":
      return "bg-blue-500/25 text-blue-200 border-blue-500/40";
    case "emerald":
      return "bg-emerald-500/25 text-emerald-200 border-emerald-500/40";
    case "purple":
      return "bg-purple-500/25 text-purple-200 border-purple-500/40";
    default:
      return "bg-white/10 text-white/70 border-white/20";
  }
};

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case "vulnerabilities":
      return <ShieldAlert size={11} />;
    case "libraries":
      return <Package size={11} />;
    case "languages":
      return <Cpu size={11} />;
    default:
      return <Layers size={11} />;
  }
};

/* ── Image Card with fallback ── */
function NewsImage({
  src,
  fallbackGradient,
  className,
}: {
  src?: string;
  fallbackGradient: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={className}
        style={{ background: fallbackGradient }}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={`${className} object-cover`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/* ── Hero Carousel ── */
function HeroCarousel({
  items,
  onNavigate,
}: {
  items: DevNewsItem[];
  onNavigate: (url: string) => void;
}) {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? items.length - 1 : c - 1));
  }, [items.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c === items.length - 1 ? 0 : c + 1));
  }, [items.length]);

  // Auto-advance every 8 seconds
  useEffect(() => {
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next]);

  const item = items[current];
  if (!item) return null;

  return (
    <div
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ aspectRatio: "16/9", maxHeight: "340px" }}
      onClick={() => onNavigate(item.url)}
    >
      {/* Image / gradient background */}
      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
        <NewsImage
          src={item.imageUrl}
          fallbackGradient={coverGradient(item.badgeColor, item.id)}
          className="w-full h-full"
        />
      </div>

      {/* Dark scrim from bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

      {/* Carousel arrows */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer backdrop-blur-sm"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer backdrop-blur-sm"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Content overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
        {/* Source */}
        <div className="flex items-center gap-2 mb-2">
          <img
            src={sourceFavicon(item.url)}
            alt=""
            className="w-5 h-5 rounded object-contain bg-white/10 p-0.5"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-[12px] font-semibold text-white/85">
            {item.source}
          </span>
          <span className="text-[11px] text-white/50 font-medium">
            · {item.timeAgo}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white leading-tight mb-2 line-clamp-2 group-hover:text-[#FFB347] transition-colors">
          {item.title}
        </h3>

        {/* Summary (only on hover or always visible based on space) */}
        <p className="text-[13px] text-white/60 leading-relaxed line-clamp-2 mb-3 max-w-2xl">
          {item.summary}
        </p>

        {/* Dot indicators */}
        {items.length > 1 && (
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  i === current
                    ? "w-5 h-1.5 bg-white"
                    : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Article Card (Grid) ── */
function ArticleCard({
  item,
  onNavigate,
}: {
  item: DevNewsItem;
  onNavigate: (url: string) => void;
}) {
  return (
    <div
      onClick={() => onNavigate(item.url)}
      className="group flex flex-col rounded-2xl overflow-hidden bg-[var(--forge-surface-elevated)] hover:bg-[var(--forge-hover)] border border-[var(--forge-border)]/50 hover:border-[var(--forge-border)] transition-all duration-200 cursor-pointer hover:shadow-xl hover:-translate-y-0.5"
    >
      {/* Image area - ~60% of card */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/10" }}>
        <NewsImage
          src={item.imageUrl}
          fallbackGradient={coverGradient(item.badgeColor, item.id)}
          className="w-full h-full transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge overlay */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-tight border backdrop-blur-md ${getBadgeStyle(
              item.badgeColor
            )}`}
          >
            {getCategoryIcon(item.category)}
            <span className="truncate max-w-[100px]">{item.badge}</span>
          </span>
        </div>

        {/* Menu button */}
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white/60 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer backdrop-blur-sm"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Text content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Source row */}
        <div className="flex items-center gap-2 mb-2">
          <img
            src={sourceFavicon(item.url)}
            alt=""
            className="w-4 h-4 rounded object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-[11px] font-semibold text-[var(--forge-text-muted)] flex-1 truncate">
            {item.source}
          </span>
          <span className="text-[11px] text-[var(--forge-text-muted)] shrink-0">
            · {item.timeAgo}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-[var(--forge-text)] group-hover:text-[#FF6B00] transition-colors line-clamp-2 leading-snug mb-1">
          {item.title}
        </h3>

        {/* Summary */}
        <p className="text-[11px] text-[var(--forge-text-secondary)] line-clamp-2 leading-relaxed">
          {item.summary}
        </p>
      </div>
    </div>
  );
}

/* ── Main Component ── */

export function DevNewsFeed({ onNavigate }: Props) {
  const {
    category,
    searchQuery,
    isLoading,
    lastUpdated,
    setCategory,
    setSearchQuery,
    fetchLatestNews,
    getFilteredItems,
  } = useDevNewsStore();

  useEffect(() => {
    if (!lastUpdated || Date.now() - lastUpdated > 15 * 60 * 1000) {
      fetchLatestNews();
    }
  }, []);

  const items = getFilteredItems();

  const categories: {
    id: NewsCategory;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: "all", label: "All", icon: <Flame size={13} /> },
    {
      id: "vulnerabilities",
      label: "Security & CVEs",
      icon: <ShieldAlert size={13} />,
    },
    { id: "libraries", label: "Frameworks", icon: <Package size={13} /> },
    { id: "languages", label: "Languages", icon: <Cpu size={13} /> },
  ];

  // Split: first 3 items = hero carousel, rest = 2-column grid
  const heroItems = items.slice(0, 3);
  const gridItems = items.slice(3);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ═══ Header Bar ═══ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #FF6B00, #FF8C38)",
            }}
          >
            <Newspaper size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--forge-text)] tracking-tight">
              Developer Pulse
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium text-[var(--forge-text-muted)]">
                Live Feed
              </span>
            </div>
          </div>
        </div>

        {/* Search + Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--forge-text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter articles..."
              className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-[var(--forge-input)] border border-[var(--forge-border)] text-[var(--forge-text)] placeholder-[var(--forge-text-muted)] outline-none focus:border-[#FF6B00]/50 focus:ring-1 focus:ring-[#FF6B00]/20 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchLatestNews()}
            disabled={isLoading}
            title="Refresh"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-[var(--forge-text-muted)] hover:text-[#FF6B00] bg-[var(--forge-input)] border border-[var(--forge-border)] hover:border-[#FF6B00]/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={isLoading ? "animate-spin text-[#FF6B00]" : ""}
            />
          </button>
        </div>
      </div>

      {/* ═══ Category Pills ═══ */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {categories.map((cat) => {
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer shrink-0 ${
                isActive
                  ? "bg-[#FF6B00] text-white shadow-sm shadow-[#FF6B00]/25 font-semibold"
                  : "bg-[var(--forge-surface-elevated)]/70 text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)]"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ Content ═══ */}
      {items.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center rounded-xl bg-[var(--forge-surface-elevated)]/40">
          <Search
            size={32}
            className="text-[var(--forge-text-muted)] mb-3 opacity-40"
          />
          <p className="text-sm font-semibold text-[var(--forge-text)] mb-1">
            No articles found
          </p>
          <p className="text-xs text-[var(--forge-text-muted)]">
            Try a different search term or category.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ── HERO CAROUSEL ── */}
          {heroItems.length > 0 && (
            <HeroCarousel items={heroItems} onNavigate={onNavigate} />
          )}

          {/* ── 2-COLUMN GRID ── */}
          {gridItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gridItems.map((item) => (
                <ArticleCard
                  key={item.id}
                  item={item}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
