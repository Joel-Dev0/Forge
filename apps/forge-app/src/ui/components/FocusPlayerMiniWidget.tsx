import { Play, Pause, Disc3 } from "lucide-react";
import { useFocusPlayerStore } from "../../core/focus/useFocusPlayerStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";

export function FocusPlayerMiniWidget() {
  const { isPlaying, currentTrack, play, pause, setPlayerModalOpen } = useFocusPlayerStore();
  const { tabs } = useTabsStore();

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

  const getProviderDot = () => {
    if (!isPlaying && activeAudioTab) {
      if (activeAudioTab.url.includes("youtube.com")) return "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse";
      if (activeAudioTab.url.includes("spotify.com")) return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)] animate-pulse";
      return "bg-[#FF6B00] animate-pulse";
    }
    switch (currentTrack?.provider) {
      case "youtube":
        return "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]";
      case "spotify":
        return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]";
      case "soundcloud":
        return "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]";
      case "stream":
        return "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)] animate-pulse";
      default:
        return "bg-[#FF6B00]";
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--forge-input)] border border-[var(--forge-border)] hover:border-[#FF6B00]/40 transition-all text-[11px] select-none">
      <button
        onClick={() => setPlayerModalOpen(true)}
        title={`Focus Player: ${displayTitle}`}
        className="flex items-center gap-1.5 text-zinc-300 hover:text-white cursor-pointer group"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${getProviderDot()}`} />
        <Disc3
          size={12}
          className={`text-[#FF6B00] ${isAudioPlaying ? "animate-spin" : ""}`}
          style={{ animationDuration: "3s" }}
        />
        <span className="max-w-[110px] truncate font-medium text-[10px] hidden sm:inline">
          {displayTitle}
        </span>
      </button>

      <button
        onClick={handleTogglePlay}
        title={isAudioPlaying ? "Pause Audio" : "Play Audio"}
        className="w-4 h-4 flex items-center justify-center rounded text-zinc-300 hover:text-[#FF6B00] transition-colors cursor-pointer"
      >
        {isAudioPlaying ? <Pause size={10} /> : <Play size={10} />}
      </button>
    </div>
  );
}
