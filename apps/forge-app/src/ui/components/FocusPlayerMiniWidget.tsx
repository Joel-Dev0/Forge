import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Disc3, Radio, Music2 } from "lucide-react";
import { useFocusPlayerStore } from "../../core/focus/useFocusPlayerStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";

export function FocusPlayerMiniWidget() {
  const { isPlaying, currentTrack, play, pause, setPlayerModalOpen } = useFocusPlayerStore();
  const { tabs } = useTabsStore();

  const [isHovered, setIsHovered] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  const activeAudioTab = tabs.find((t) => t.isPlayingAudio);
  const isAudioPlaying = isPlaying || Boolean(activeAudioTab);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAudioPlaying) {
      pause();
      const iframe = document.getElementById("focus-player-embed-iframe") as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*");
          iframe.contentWindow.postMessage('{"method":"pause"}', "*");
        } catch {}
      }
      window.dispatchEvent(new CustomEvent("forge:media-pause"));
      if (activeAudioTab) {
        useTabsStore.getState().setTabAudio(activeAudioTab.id, false, activeAudioTab.isMuted);
      }
    } else {
      play(currentTrack || undefined);
      const iframe = document.getElementById("focus-player-embed-iframe") as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
          iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
          iframe.contentWindow.postMessage('{"method":"play"}', "*");
        } catch {}
      }
    }
  };

  const displayTitle = isPlaying
    ? (currentTrack?.title || "Focus Music")
    : (activeAudioTab?.title?.replace(/ - YouTube.*$/i, "") || currentTrack?.title || "Focus Music");

  const getSubtitle = () => {
    if (isPlaying && currentTrack?.artist) {
      return currentTrack.artist;
    }
    if (activeAudioTab?.url) {
      try {
        return new URL(activeAudioTab.url).hostname.replace(/^www\./, "");
      } catch {
        return "Web Audio";
      }
    }
    return currentTrack?.artist || "Ambient Stream";
  };

  const displaySubtitle = getSubtitle();

  const getProviderInfo = () => {
    if (!isPlaying && activeAudioTab) {
      if (activeAudioTab.url.includes("youtube.com")) {
        return {
          dotClass: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse",
          label: "YouTube Tab",
          icon: Music2,
        };
      }
      if (activeAudioTab.url.includes("spotify.com")) {
        return {
          dotClass: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse",
          label: "Spotify Tab",
          icon: Music2,
        };
      }
      return {
        dotClass: "bg-[#FF6B00] animate-pulse",
        label: "Tab Audio",
        icon: Radio,
      };
    }
    switch (currentTrack?.provider) {
      case "youtube":
        return {
          dotClass: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]",
          label: "YouTube Focus",
          icon: Music2,
        };
      case "spotify":
        return {
          dotClass: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]",
          label: "Spotify Web",
          icon: Music2,
        };
      case "soundcloud":
        return {
          dotClass: "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]",
          label: "SoundCloud",
          icon: Music2,
        };
      case "stream":
        return {
          dotClass: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)] animate-pulse",
          label: "Live Radio Stream",
          icon: Radio,
        };
      default:
        return {
          dotClass: "bg-[#FF6B00]",
          label: "Focus Player",
          icon: Disc3,
        };
    }
  };

  const providerInfo = getProviderInfo();

  // Measure text overflow to smoothly scroll long titles on hover
  useEffect(() => {
    if (textRef.current && textContainerRef.current) {
      const containerWidth = isHovered ? 220 : 110;
      const textWidth = textRef.current.scrollWidth;
      const overflow = textWidth - containerWidth;
      if (overflow > 4) {
        setScrollDistance(overflow + 8);
      } else {
        setScrollDistance(0);
      }
    }
  }, [displayTitle, isHovered]);

  return (
    <div
      className="relative flex items-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Expanding Pill Container */}
      <div
        onClick={() => setPlayerModalOpen(true)}
        title={`Focus Player: ${displayTitle}${displaySubtitle ? ` • ${displaySubtitle}` : ""}`}
        className={`group flex items-center h-6.5 rounded-lg border transition-all duration-300 ease-out cursor-pointer overflow-hidden ${
          isHovered
            ? "bg-[var(--forge-input)] border-[#FF6B00]/40 shadow-md max-w-[280px] px-2"
            : "bg-[var(--forge-input)]/70 hover:bg-[var(--forge-input)] border-[var(--forge-border)] hover:border-white/20 max-w-[32px] px-1.5 justify-center"
        }`}
      >
        {/* Icon & Live Dot: ALWAYS visible in both collapsed and expanded states */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${providerInfo.dotClass}`} />
          <Disc3
            size={13}
            className={`shrink-0 transition-colors ${
              isAudioPlaying
                ? "text-[#FF6B00] animate-spin"
                : "text-zinc-400 group-hover:text-white"
            }`}
            style={{ animationDuration: "3s" }}
          />
        </div>

        {/* Expanding Content: Song Name & Direct Pause Button (revealed on hover) */}
        <div
          className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-out ${
            isHovered
              ? "max-w-[230px] opacity-100 ml-2 pointer-events-auto"
              : "max-w-0 opacity-0 ml-0 pointer-events-none"
          }`}
        >
          {/* Song Name with Marquee on Hover if long */}
          <div
            ref={textContainerRef}
            className="relative overflow-hidden flex-1 min-w-0 flex flex-col justify-center"
          >
            <span
              ref={textRef}
              style={{
                transform: isHovered && scrollDistance > 0 ? `translateX(-${scrollDistance}px)` : "translateX(0px)",
                transition: isHovered && scrollDistance > 0
                  ? `transform ${Math.max(2.5, scrollDistance / 24)}s linear 0.35s`
                  : "transform 0.25s ease-out",
              }}
              className="font-medium text-[10.5px] text-white whitespace-nowrap leading-tight"
            >
              {displayTitle}
            </span>

            {displaySubtitle && (
              <span className="text-[9px] text-zinc-400 truncate whitespace-nowrap leading-tight">
                {displaySubtitle}
              </span>
            )}
          </div>

          {/* Dedicated Play / Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            title={isAudioPlaying ? "Pause Audio" : "Play Audio"}
            className="w-5 h-5 flex items-center justify-center rounded-md bg-white/10 hover:bg-[#FF6B00] text-zinc-200 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm"
          >
            {isAudioPlaying ? (
              <Pause size={10} fill="currentColor" />
            ) : (
              <Play size={10} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Floating Hover Card Preview for Long Track Titles */}
      <div
        className={`absolute top-full right-0 mt-1.5 z-[10070] pointer-events-none transition-all duration-200 ease-out delay-100 ${
          isHovered ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-1 invisible"
        }`}
      >
        <div className="w-64 p-2.5 rounded-lg bg-[#18181B]/95 backdrop-blur-md border border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.6)] text-left ring-1 ring-black/40">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${providerInfo.dotClass}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {providerInfo.label}
            </span>
            <span
              className={`ml-auto text-[9px] px-1.5 py-0.5 rounded font-medium ${
                isAudioPlaying ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-zinc-400"
              }`}
            >
              {isAudioPlaying ? "Playing" : "Paused"}
            </span>
          </div>

          <div className="text-xs font-semibold text-white leading-snug line-clamp-2">
            {displayTitle}
          </div>

          {displaySubtitle && (
            <div className="text-[11px] text-zinc-400 truncate mt-0.5">
              {displaySubtitle}
            </div>
          )}

          <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-zinc-500">
            <span>Click pill to open Focus Deck</span>
            <span className="text-[#FF6B00] font-mono">Alt+F</span>
          </div>
        </div>
      </div>
    </div>
  );
}
