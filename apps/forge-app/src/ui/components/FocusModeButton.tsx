import { Flame, Power } from "lucide-react";
import { useFocusStore } from "../../core/focus/useFocusStore";

export function FocusModeButton() {
  const { isFocusModeActive, timer, setFocusModalOpen, setFocusMode } = useFocusStore();

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  if (!isFocusModeActive) {
    return (
      <button
        id="focus-mode-toggle-btn"
        type="button"
        onClick={() => setFocusModalOpen(true)}
        title="Focus Mode & Distraction Shield - Click to configure"
        className="titlebar-no-drag h-6 px-2 flex items-center gap-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer text-[var(--forge-text-muted)] hover:text-[#FF6B00] hover:bg-[#1E1E1E]"
      >
        <Flame size={13} />
      </button>
    );
  }

  return (
    <div
      style={{ backgroundColor: "#1E1E1E", borderColor: "#FF6B00" }}
      className="titlebar-no-drag flex items-center gap-0.5 rounded-md border shadow-[0_0_12px_rgba(255,107,0,0.35)] h-6 pr-1"
    >
      <button
        id="focus-mode-active-btn"
        type="button"
        onClick={() => setFocusModalOpen(true)}
        title={`Focus Mode Active (${timer.phase === "break" ? "Break" : "Focus"} ${formatCountdown(timer.remainingSeconds)}) - Click to open Focus Deck`}
        className="titlebar-no-drag px-2 h-full flex items-center gap-1.5 text-[#FF6B00] hover:text-[#FFB947] transition-colors cursor-pointer text-xs font-semibold"
      >
        <Flame size={13} className="animate-pulse fill-current text-[#FF6B00]" />
        <span className="font-mono text-[11px] font-bold tracking-tight text-[#FFB947]">
          {timer.isRunning ? formatCountdown(timer.remainingSeconds) : "FOCUS"}
        </span>
      </button>

      {/* 1-Click Instant Turn Off Button */}
      <button
        id="focus-mode-quick-off-btn"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setFocusMode(false);
        }}
        title="Turn Off Focus Mode immediately"
        className="titlebar-no-drag w-4.5 h-4.5 flex items-center justify-center rounded text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white transition-all cursor-pointer"
      >
        <Power size={11} strokeWidth={2.5} />
      </button>
    </div>
  );
}
