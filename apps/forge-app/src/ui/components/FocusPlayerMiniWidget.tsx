import { Play, Pause, Disc3 } from "lucide-react";
import { useFocusPlayerStore } from "../../core/focus/useFocusPlayerStore";

export function FocusPlayerMiniWidget() {
  const { isPlaying, currentTrack, togglePlay, setPlayerModalOpen } = useFocusPlayerStore();

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--forge-input)] border border-[var(--forge-border)] hover:border-[#FF6B00]/40 transition-all text-[11px] select-none">
      <button
        onClick={() => setPlayerModalOpen(true)}
        title="Open Forge Focus Player"
        className="flex items-center gap-1.5 text-zinc-300 hover:text-white cursor-pointer group"
      >
        <Disc3
          size={12}
          className={`text-[#FF6B00] ${isPlaying ? "animate-spin" : ""}`}
          style={{ animationDuration: "3s" }}
        />
        <span className="max-w-[90px] truncate font-medium text-[10px] hidden md:inline">
          {currentTrack?.title || "Focus Sound"}
        </span>
      </button>

      <button
        onClick={togglePlay}
        title={isPlaying ? "Pause Focus Audio" : "Play Focus Audio"}
        className="w-4 h-4 flex items-center justify-center rounded text-zinc-300 hover:text-[#FF6B00] transition-colors cursor-pointer"
      >
        {isPlaying ? <Pause size={10} /> : <Play size={10} />}
      </button>
    </div>
  );
}
