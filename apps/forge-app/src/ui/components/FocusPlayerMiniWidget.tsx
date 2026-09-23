import { Play, Pause, Disc3 } from "lucide-react";
import { useFocusPlayerStore } from "../../core/focus/useFocusPlayerStore";

export function FocusPlayerMiniWidget() {
  const { isPlaying, currentTrack, togglePlay, setPlayerModalOpen } = useFocusPlayerStore();

  const getProviderDot = () => {
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
        title={`Focus Player: ${currentTrack?.title || "Focus Sound"} (${currentTrack?.provider?.toUpperCase() || "AUDIO"})`}
        className="flex items-center gap-1.5 text-zinc-300 hover:text-white cursor-pointer group"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${getProviderDot()}`} />
        <Disc3
          size={12}
          className={`text-[#FF6B00] ${isPlaying ? "animate-spin" : ""}`}
          style={{ animationDuration: "3s" }}
        />
        <span className="max-w-[110px] truncate font-medium text-[10px] hidden sm:inline">
          {currentTrack?.title || "Focus Music"}
        </span>
      </button>

      <button
        onClick={togglePlay}
        title={isPlaying ? "Pause Audio" : "Play Audio"}
        className="w-4 h-4 flex items-center justify-center rounded text-zinc-300 hover:text-[#FF6B00] transition-colors cursor-pointer"
      >
        {isPlaying ? <Pause size={10} /> : <Play size={10} />}
      </button>
    </div>
  );
}
