import { useMemo } from "react";
import { Globe, Volume2, VolumeX, Moon, Zap, Activity } from "lucide-react";
import type { Tab } from "../../core/tabs/useTabsStore";

interface TabHoverCardProps {
  tab: Tab | null;
  anchorRect: DOMRect | null;
  visible: boolean;
}

export function TabHoverCard({ tab, anchorRect, visible }: TabHoverCardProps) {
  if (!visible || !tab || !anchorRect) return null;

  const domain = useMemo(() => {
    if (!tab.url || tab.url === "about:blank") return "Forge New Tab";
    try {
      const parsed = new URL(tab.url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return tab.url;
    }
  }, [tab.url]);

  const cardWidth = 320;
  const padding = 12;

  // Calculate horizontal position centered on anchor tab, bounded inside window
  let left = anchorRect.left + anchorRect.width / 2 - cardWidth / 2;
  const maxLeft = typeof window !== "undefined" ? window.innerWidth - cardWidth - padding : 800;
  left = Math.max(padding, Math.min(left, maxLeft));

  const top = anchorRect.bottom + 8;

  // Format idle / active status
  const lastActiveText = useMemo(() => {
    if (!tab.lastActiveAt) return "Recently active";
    const minutesAgo = Math.floor((Date.now() - tab.lastActiveAt) / 60000);
    if (minutesAgo <= 0) return "Active just now";
    if (minutesAgo === 1) return "Idle for 1 minute";
    if (minutesAgo >= 60) {
      const hours = Math.floor(minutesAgo / 60);
      return `Idle for ${hours}h ${minutesAgo % 60}m`;
    }
    return `Idle for ${minutesAgo}m`;
  }, [tab.lastActiveAt]);

  const memoryDisplay = useMemo(() => {
    if (tab.isSleeping || tab.isLazy) {
      return {
        text: "0 MB",
        badge: "Dormant / Sleeping",
        subtext: "Renderer freed • RAM saved",
        colorClass: "text-purple-400 bg-purple-500/10 border-purple-500/30",
        barColor: "bg-purple-500/50",
        percentage: 0,
      };
    }
    const rawMem =
      tab.memoryMB && tab.memoryMB > 0
        ? tab.memoryMB
        : tab.url && tab.url !== "about:blank"
        ? 58
        : 22;

    const formattedMem = rawMem % 1 === 0 ? `${rawMem} MB` : `${rawMem.toFixed(1)} MB`;
    const percentage = Math.min(100, Math.max(8, Math.round((rawMem / 500) * 100)));

    if (rawMem < 150) {
      return {
        text: formattedMem,
        badge: "Low Memory",
        subtext: "Lightweight resource footprint",
        colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
        barColor: "bg-emerald-400",
        percentage,
      };
    }
    if (rawMem < 350) {
      return {
        text: formattedMem,
        badge: "Normal Memory",
        subtext: "Standard tab resource usage",
        colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        barColor: "bg-amber-400",
        percentage,
      };
    }
    return {
      text: formattedMem,
      badge: "High Memory",
      subtext: "Heavy web application",
      colorClass: "text-orange-400 bg-orange-500/10 border-orange-500/30",
      barColor: "bg-orange-500",
      percentage,
    };
  }, [tab.isSleeping, tab.isLazy, tab.memoryMB, tab.url]);

  return (
    <div
      style={{
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        width: `${cardWidth}px`,
        zIndex: 99999,
      }}
      className="pointer-events-none select-none animate-in fade-in zoom-in-95 duration-150 rounded-xl bg-[#0f111a]/95 backdrop-blur-xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,107,0,0.15)] text-[var(--forge-text)] p-3.5 flex flex-col gap-2.5 overflow-hidden"
    >
      {/* Top subtle glow bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B00]/70 to-transparent" />

      {/* Header: Favicon, Domain & Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {tab.favicon ? (
            <img
              src={tab.favicon}
              alt=""
              className="w-4 h-4 rounded-sm shrink-0 object-contain"
            />
          ) : (
            <Globe size={14} className="text-[#FF6B00] shrink-0" />
          )}
          <span className="text-[11px] font-semibold text-white/90 tracking-wide uppercase truncate">
            {domain}
          </span>
        </div>

        {/* Audio / Sleep Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {tab.isPlayingAudio && (
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border shadow-sm ${
                tab.isMuted
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]"
              }`}
            >
              {tab.isMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
              <span>{tab.isMuted ? "Muted" : "Playing Media"}</span>
            </div>
          )}

          {(tab.isSleeping || tab.isLazy) && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30">
              <Moon size={10} />
              <span>Sleeping</span>
            </div>
          )}
        </div>
      </div>

      {/* Full Untruncated Page Title */}
      <div className="text-xs font-semibold text-white leading-relaxed line-clamp-3 break-words">
        {tab.title || "New Tab"}
      </div>

      {/* Full Page URL */}
      {tab.url && tab.url !== "about:blank" && (
        <div className="text-[10px] font-mono text-white/40 break-all line-clamp-2 leading-tight">
          {tab.url}
        </div>
      )}

      {/* Separator */}
      <div className="h-[1px] bg-white/10 w-full" />

      {/* Resource & RAM Footprint Section */}
      <div className="flex flex-col gap-2 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#FF6B00] shrink-0">
              <Zap size={12} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold font-mono text-white tracking-tight">
                  {memoryDisplay.text}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-[1px] rounded font-medium border ${memoryDisplay.colorClass}`}
                >
                  {memoryDisplay.badge}
                </span>
                {!tab.isSleeping && !tab.isLazy && (
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono font-medium ml-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    LIVE
                  </span>
                )}
              </div>
              <span className="text-[10px] text-white/40">
                {memoryDisplay.subtext}
              </span>
            </div>
          </div>

          {/* Activity Status */}
          <div className="flex flex-col items-end shrink-0 text-right">
            <div className="flex items-center gap-1 text-[10px] text-white/60">
              <Activity size={10} className="text-[#FF6B00]" />
              <span>{lastActiveText}</span>
            </div>
            {(tab.isSleeping || tab.isLazy) && (
              <span className="text-[9px] text-[#FF6B00]/90 font-medium">
                Click tab to wake up
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Real-Time RAM Meter Bar */}
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${memoryDisplay.barColor}`}
            style={{ width: `${memoryDisplay.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
