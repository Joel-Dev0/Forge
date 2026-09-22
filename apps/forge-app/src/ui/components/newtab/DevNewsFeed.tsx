import React, { useEffect } from "react";
import {
  ShieldAlert,
  Package,
  Cpu,
  Layers,
  Search,
  RefreshCw,
  ExternalLink,
  Flame,
  Radio,
} from "lucide-react";
import {
  useDevNewsStore,
  type NewsCategory,
  type BadgeColor,
} from "../../../core/news/useDevNewsStore";

interface Props {
  onNavigate: (url: string) => void;
}

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
    // If not updated in the last 15 minutes, fetch in background
    if (!lastUpdated || Date.now() - lastUpdated > 15 * 60 * 1000) {
      fetchLatestNews();
    }
  }, []);

  const items = getFilteredItems();

  const getBadgeStyle = (color: BadgeColor) => {
    switch (color) {
      case "red":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "amber":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "blue":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "emerald":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "purple":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      default:
        return "bg-[var(--forge-surface)] text-[var(--forge-text-muted)] border-[var(--forge-border)]";
    }
  };

  const getCategoryIcon = (cat: NewsCategory) => {
    switch (cat) {
      case "vulnerabilities":
        return <ShieldAlert size={14} className="text-rose-400" />;
      case "libraries":
        return <Package size={14} className="text-emerald-400" />;
      case "languages":
        return <Cpu size={14} className="text-amber-400" />;
      default:
        return <Layers size={14} className="text-[#FF6B00]" />;
    }
  };

  const categories: { id: NewsCategory; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All Updates", icon: <Flame size={13} /> },
    { id: "vulnerabilities", label: "Security & CVEs", icon: <ShieldAlert size={13} /> },
    { id: "libraries", label: "Libraries & Frameworks", icon: <Package size={13} /> },
    { id: "languages", label: "Languages & Runtimes", icon: <Cpu size={13} /> },
  ];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Feed Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-[var(--forge-border)]/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center">
            <Radio size={14} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--forge-text)]">
                Developer Pulse
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-[#FF6B00]/15 text-[#FF6B00]">
                Live Feed
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Search and Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Quick Filter Search */}
          <div className="relative flex-1 sm:w-52">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--forge-text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news, CVE, lib..."
              className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs bg-[var(--forge-surface)]/80 border border-[var(--forge-border)] text-[var(--forge-text)] placeholder-[var(--forge-text-muted)] outline-none focus:border-[#FF6B00] transition-colors"
            />
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => fetchLatestNews()}
            disabled={isLoading}
            title="Refresh developer updates"
            className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] bg-[var(--forge-surface)]/80 border border-[var(--forge-border)] hover:border-[#FF6B00]/50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw
              size={12}
              className={isLoading ? "animate-spin text-[#FF6B00]" : ""}
            />
            <span className="hidden md:inline text-[11px]">Refresh</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => {
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer shrink-0 ${
                isActive
                  ? "bg-[#FF6B00] text-white shadow-sm shadow-[#FF6B00]/25 font-semibold"
                  : "bg-[var(--forge-surface)]/70 text-[var(--forge-text-secondary)] border border-[var(--forge-border)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)]"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* News Cards Grid */}
      {items.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[var(--forge-surface)]/60 border border-[var(--forge-border)] backdrop-blur-sm">
          <Search size={28} className="text-[var(--forge-text-muted)] mb-2 opacity-50" />
          <p className="text-xs font-semibold text-[var(--forge-text)] mb-1">
            No updates found matching "{searchQuery}"
          </p>
          <p className="text-[11px] text-[var(--forge-text-muted)]">
            Try clearing your search query or selecting another category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            return (
              <div
                key={item.id}
                onClick={() => onNavigate(item.url)}
                className="group relative flex flex-col justify-between p-4 rounded-xl bg-[var(--forge-surface)]/80 hover:bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[#FF6B00]/60 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm"
              >
                <div>
                  {/* Card Top: Badges & Source */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-tight border ${getBadgeStyle(
                          item.badgeColor
                        )}`}
                      >
                        {getCategoryIcon(item.category)}
                        <span className="truncate">{item.badge}</span>
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-[var(--forge-text-muted)] shrink-0">
                      {item.timeAgo}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-bold text-[var(--forge-text)] group-hover:text-[#FF6B00] transition-colors line-clamp-2 leading-snug mb-1.5">
                    {item.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-[11px] text-[var(--forge-text-secondary)] line-clamp-3 leading-relaxed mb-3">
                    {item.summary}
                  </p>
                </div>

                {/* Card Footer: Source & Link */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--forge-border)]/50 text-[10px] text-[var(--forge-text-muted)]">
                  <span className="font-mono truncate">{item.source}</span>
                  <span className="flex items-center gap-1 text-[#FF6B00] group-hover:underline font-medium">
                    <span>Read update</span>
                    <ExternalLink size={10} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
