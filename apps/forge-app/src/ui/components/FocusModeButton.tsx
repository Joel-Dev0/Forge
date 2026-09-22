import { Flame } from "lucide-react";
import { useFocusStore } from "../../core/focus/useFocusStore";

export function FocusModeButton() {
  const { isFocusModeActive, timer, setFocusModalOpen } = useFocusStore();

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <button
      type="button"
      onClick={() => setFocusModalOpen(true)}
      title={
        isFocusModeActive
          ? `Focus Mode Active (${timer.phase === "break" ? "Break" : "Focus"} ${formatCountdown(timer.remainingSeconds)}) - Click to configure`
          : "Focus Mode & Social Media Shield - Click to configure"
      }
      className={`h-6 px-2 flex items-center gap-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
        isFocusModeActive
          ? timer.phase === "break"
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse"
            : "bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/40 shadow-[0_0_8px_rgba(255,107,0,0.35)]"
          : "text-[var(--forge-text-muted)] hover:text-white hover:bg-[var(--forge-hover)]"
      }`}
    >
      <Flame size={13} className={isFocusModeActive ? "animate-pulse fill-current" : ""} />
      {isFocusModeActive && (
        <span className="font-mono text-[11px] font-bold tracking-tight">
          {timer.isRunning ? formatCountdown(timer.remainingSeconds) : "FOCUS"}
        </span>
      )}
    </button>
  );
}
