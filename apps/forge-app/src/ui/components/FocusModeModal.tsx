import { useState, useId, useMemo } from "react";
import {
  X,
  Flame,
  Clock,
  Play,
  Pause,
  Square,
  RotateCcw,
  Shield,
  Calendar,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Power,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Bookmark,
  BarChart3,
  Rocket,
  Headphones,
  Sliders,
  Check,
} from "lucide-react";
import { useFocusStore } from "../../core/focus/useFocusStore";
import { useFocusPlayerStore } from "../../core/focus/useFocusPlayerStore";
import { testFocusAlarmSound } from "../../core/focus/focusAlarm";
import {
  SOCIAL_PLATFORMS,
  type FocusActionTier,
} from "../../core/focus/socialRulesets";
import { DevOpsActivityDashboard } from "./focus/DevOpsActivityDashboard";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Waveform bar heights (42 bars mimicking hardware recorder visualizer from Image 1)
const WAVEFORM_BARS = [
  16, 26, 12, 34, 46, 20, 36, 14, 42, 28, 52, 24, 38, 16, 44, 30, 48, 18, 36,
  56, 32, 48, 20, 42, 30, 50, 16, 38, 24, 46, 18, 34, 52, 22, 40, 14, 36, 26,
  44, 20, 30, 16,
];

// Quick duration presets
const PRESET_DURATIONS = [
  { mins: 10, label: "10m Micro" },
  { mins: 15, label: "15m Sprint" },
  { mins: 25, label: "25m Pomodoro" },
  { mins: 45, label: "45m Deep Work" },
  { mins: 60, label: "60m Flow" },
  { mins: 90, label: "90m Ultra" },
];

export function FocusModeModal() {
  const {
    isFocusModeActive,
    activeProfileId,
    timer,
    profiles,
    schedules,
    isFocusModalOpen,
    lastAlarmTriggered,
    sessionLogs,
    logSession,
    setFocusModalOpen,
    toggleFocusMode,
    setFocusMode,
    setActiveProfile,
    setPlatformTier,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    dismissAlarm,
    toggleAlarmSound,
    setCustomFocusDuration,
    setCustomBreakDuration,
    setTimerMode,
    addSchedule,
    deleteSchedule,
    toggleSchedule,
  } = useFocusStore();

  const [activeTab, setActiveTab] = useState<"deck" | "dashboard" | "shield" | "schedules">("deck");
  const [showCustomDurationPanel, setShowCustomDurationPanel] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<number>(timer.focusDurationMinutes || 25);
  const [customBreakInput, setCustomBreakInput] = useState<number>(timer.breakDurationMinutes || 5);
  const [showSoundscapePicker, setShowSoundscapePicker] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Schedule creator local state
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [newScheduleStart, setNewScheduleStart] = useState("09:00");
  const [newScheduleEnd, setNewScheduleEnd] = useState("17:00");
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const profilesList = Array.isArray(profiles) ? profiles : Object.values(profiles || {});
  const activeProfile = (profiles && !Array.isArray(profiles) ? profiles[activeProfileId] : null) || profilesList[0] || {
    id: "deep_work",
    name: "Deep Work",
    description: "Maximum concentration.",
    icon: "Brain",
    tiers: {},
  };
  const waveGradId = useId();

  // Progress percentage (0 to 1)
  const progressRatio = timer.totalSeconds > 0
    ? Math.max(0, Math.min(1, (timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds))
    : 0;

  // Index of waveform bar currently reached by the scrubber
  const scrubBarIndex = Math.floor(progressRatio * WAVEFORM_BARS.length);

  const formatDigitalTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const handleApplyCustomDuration = (mins: number) => {
    const validMins = Math.max(1, Math.min(360, mins));
    setCustomFocusDuration(validMins);
    setCustomMinutesInput(validMins);
    stopTimer();
    startTimer(validMins, timer.mode);
    setFeedbackMessage(`Focus timer configured for ${validMins} minutes!`);
    setShowCustomDurationPanel(false);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleTurnOff = () => {
    setFocusMode(false);
    setFeedbackMessage("Focus Mode turned OFF. Standing by.");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleTurnOn = () => {
    setFocusMode(true);
    setFeedbackMessage("Focus Mode ACTIVATED. Zero distractions.");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleName.trim() || newScheduleDays.length === 0) return;

    const [startH, startM] = newScheduleStart.split(":").map(Number);
    const [endH, endM] = newScheduleEnd.split(":").map(Number);

    addSchedule({
      name: newScheduleName.trim(),
      profileId: activeProfileId,
      days: newScheduleDays,
      startHour: startH || 9,
      startMinute: startM || 0,
      endHour: endH || 17,
      endMinute: endM || 0,
      enabled: true,
    });

    setIsAddingSchedule(false);
    setNewScheduleName("");
    setFeedbackMessage("Automated schedule saved!");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <>
      {/* Toast Notification when Alarm fires */}
      {lastAlarmTriggered && (
        <div
          style={{ backgroundColor: "#1E1E1E", borderColor: "#FF6B00" }}
          className="fixed bottom-6 right-6 z-[10001] max-w-sm rounded-2xl border p-4 shadow-2xl flex items-center justify-between text-white animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-ping" />
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-[#FFB947]">
                {lastAlarmTriggered.title}
              </h4>
            </div>
            <p className="text-xs text-zinc-300 mt-1 leading-snug">
              {lastAlarmTriggered.message}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button
              type="button"
              onClick={() => {
                dismissAlarm();
                setFocusModalOpen(true);
              }}
              style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow cursor-pointer hover:brightness-110"
            >
              Open Deck
            </button>
            <button
              type="button"
              onClick={dismissAlarm}
              style={{ backgroundColor: "#2B2B2B" }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Focus Mode Modal */}
      {isFocusModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div
            style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
            className="w-full max-w-4xl border rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh] text-white font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with High-Contrast Turn Off / On Action */}
            <div
              style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
              className="flex items-center justify-between px-6 py-4 border-b"
            >
              <div className="flex items-center gap-3">
                <div
                  style={{
                    backgroundColor: isFocusModeActive ? "#FF6B00" : "#2B2B2B",
                    color: isFocusModeActive ? "#0D0D0D" : "#FFB947",
                    boxShadow: isFocusModeActive ? "0 0 20px rgba(255,107,0,0.5)" : "none",
                  }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all"
                >
                  <Flame size={20} className={isFocusModeActive ? "animate-pulse fill-current" : ""} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold tracking-tight">Focus Mode & Shield</h2>
                    <span
                      style={{
                        backgroundColor: isFocusModeActive ? "#1E1E1E" : "#2B2B2B",
                        borderColor: isFocusModeActive ? "#FF6B00" : "#2B2B2B",
                        color: isFocusModeActive ? "#FF6B00" : "#FFB947",
                      }}
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border"
                    >
                      <span
                        style={{ backgroundColor: isFocusModeActive ? "#FF6B00" : "#FFB947" }}
                        className="w-1.5 h-1.5 rounded-full"
                      />
                      {isFocusModeActive ? "ACTIVE — ZERO DISTRACTIONS" : "STANDBY"}
                    </span>
                  </div>
                  <p className="text-xs text-[#FFB947]/70 mt-0.5">
                    Hardware-grade focus deck, custom duration control, and distraction-free workspace.
                  </p>
                </div>
              </div>

              {/* Instant Turn Off / Turn On Switch */}
              <div className="flex items-center gap-2.5">
                {isFocusModeActive ? (
                  <button
                    type="button"
                    onClick={handleTurnOff}
                    style={{
                      backgroundColor: "#2B2B2B",
                      borderColor: "#FF6B00",
                      color: "#FF6B00",
                      boxShadow: "0 0 14px rgba(255,107,0,0.3)",
                    }}
                    className="px-4 py-2 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all cursor-pointer hover:bg-[#FF6B00] hover:text-[#0D0D0D]"
                  >
                    <Power size={13} strokeWidth={2.5} />
                    <span>Turn Off Focus</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleTurnOn}
                    style={{
                      backgroundColor: "#FF6B00",
                      color: "#0D0D0D",
                      boxShadow: "0 0 15px rgba(255,107,0,0.4)",
                    }}
                    className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer hover:bg-[#FFB947]"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Turn On Focus</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setFocusModalOpen(false)}
                  style={{ backgroundColor: "#2B2B2B", borderColor: "#2B2B2B" }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer border"
                  title="Close modal"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notification / Feedback Banner */}
            {feedbackMessage && (
              <div
                style={{ backgroundColor: "#1E1E1E", borderColor: "#FF6B00", color: "#FFB947" }}
                className="border-b px-6 py-2 flex items-center justify-between text-xs animate-in fade-in duration-150"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Check size={14} className="text-[#FF6B00]" />
                  {feedbackMessage}
                </span>
                <button
                  type="button"
                  onClick={() => setFeedbackMessage(null)}
                  className="text-[#FF6B00] hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div
              style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
              className="flex items-center gap-1 px-6 border-b text-xs font-semibold"
            >
              <button
                type="button"
                onClick={() => setActiveTab("deck")}
                style={{
                  borderColor: activeTab === "deck" ? "#FF6B00" : "transparent",
                  color: activeTab === "deck" ? "#FF6B00" : "#FFB947",
                }}
                className="py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 cursor-pointer hover:text-[#FF6B00]"
              >
                <Clock size={14} />
                <span>Focus Deck &amp; Audio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                style={{
                  borderColor: activeTab === "dashboard" ? "#FF6B00" : "transparent",
                  color: activeTab === "dashboard" ? "#FF6B00" : "#FFB947",
                }}
                className="py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 cursor-pointer hover:text-[#FF6B00]"
              >
                <BarChart3 size={14} />
                <span>Streaks &amp; Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("shield")}
                style={{
                  borderColor: activeTab === "shield" ? "#FF6B00" : "transparent",
                  color: activeTab === "shield" ? "#FF6B00" : "#FFB947",
                }}
                className="py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 cursor-pointer hover:text-[#FF6B00]"
              >
                <Shield size={14} />
                <span>Distraction Shield ({Object.keys(SOCIAL_PLATFORMS).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("schedules")}
                style={{
                  borderColor: activeTab === "schedules" ? "#FF6B00" : "transparent",
                  color: activeTab === "schedules" ? "#FF6B00" : "#FFB947",
                }}
                className="py-3 px-3.5 border-b-2 transition-colors flex items-center gap-2 cursor-pointer hover:text-[#FF6B00]"
              >
                <Calendar size={14} />
                <span>Automated Schedules ({schedules.length})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ backgroundColor: "#0D0D0D" }} className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: FOCUS DECK & AUDIO (IMAGE 1 REFERENCE) */}
              {activeTab === "deck" && (
                <div className="space-y-6">
                  {/* Hero Hardware Focus Deck Card */}
                  <div
                    style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
                    className="relative rounded-3xl border p-7 shadow-2xl overflow-hidden"
                  >
                    {/* Top Eyebrow & Title */}
                    <div>
                      <span className="text-[#FF6B00] text-[11px] font-bold tracking-widest uppercase">
                        Introducing
                      </span>
                      <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-0.5">
                        Deep Focus Flow
                      </h1>
                      <p className="text-xs sm:text-sm text-[#FFB947]/70 mt-1.5 leading-relaxed max-w-lg">
                        All the needed functions at your fingertips. Simply, customize duration and enter flow state. Zero distractions.
                      </p>
                    </div>

                    {/* Digital Scrubber Timestamp */}
                    <div className="mt-8 flex flex-col items-center justify-center relative">
                      {/* Red/Orange Digital Clock with Pointer */}
                      <div className="flex flex-col items-center mb-1">
                        <span className="text-[#FFB947] font-mono text-sm font-bold tracking-wider">
                          {formatDigitalTime(timer.remainingSeconds)}
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] mt-0.5" />
                      </div>

                      {/* Waveform Visualizer Container */}
                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                          const newSeconds = Math.round(timer.totalSeconds * (1 - ratio));
                          useFocusStore.setState((s) => ({
                            timer: { ...s.timer, remainingSeconds: newSeconds },
                          }));
                        }}
                        style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                        className="w-full max-w-xl h-20 rounded-2xl border flex items-center justify-between px-4 sm:px-6 relative cursor-pointer select-none group"
                        title="Click to scrub focus timeline"
                      >
                        {/* Orange Scrubber Vertical Playhead Needle */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[#FF6B00] shadow-[0_0_8px_#FF6B00] z-10 transition-all duration-300 pointer-events-none"
                          style={{
                            left: `${Math.max(2, Math.min(98, progressRatio * 100))}%`,
                          }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FFB947] -ml-1 -mt-1 shadow-xs" />
                        </div>

                        {/* Sound Wave Bars */}
                        {WAVEFORM_BARS.map((height, i) => {
                          const isPlayed = i <= scrubBarIndex;
                          const isLive = timer.isRunning;
                          return (
                            <div
                              key={i}
                              style={{
                                height: isLive
                                  ? `${Math.max(10, Math.min(60, height + Math.sin((i + Date.now() / 200) % 10) * 12))}px`
                                  : `${height}px`,
                                backgroundColor: isPlayed ? "#FF6B00" : "#2B2B2B",
                                boxShadow: isPlayed ? "0 0 4px rgba(255,107,0,0.5)" : "none",
                              }}
                              className="w-1 rounded-full transition-all duration-200"
                            />
                          );
                        })}
                      </div>

                      {/* Scrubber Mode & Remaining Tag */}
                      <div className="flex items-center justify-between w-full max-w-xl mt-2 text-[11px] text-[#FFB947]/70 font-mono px-1">
                        <span>
                          {timer.mode === "pomodoro"
                            ? timer.phase === "focus"
                              ? "🎯 Focus Session"
                              : "☕ Break Session"
                            : "⏱️ Countdown Session"}
                        </span>
                        <span>{timer.focusDurationMinutes} min total</span>
                      </div>
                    </div>

                    {/* Hardware Bottom Control Bar Pill */}
                    <div
                      style={{ backgroundColor: "#2B2B2B", borderColor: "#2B2B2B" }}
                      className="mt-7 w-full max-w-xl mx-auto rounded-2xl border p-2.5 px-4 flex items-center justify-between shadow-xl"
                    >
                      {/* Left: Play / Pause / Stop buttons */}
                      <div className="flex items-center gap-3">
                        {!timer.isRunning ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (timer.remainingSeconds < timer.totalSeconds && timer.remainingSeconds > 0) {
                                resumeTimer();
                              } else {
                                startTimer(timer.focusDurationMinutes, timer.mode);
                              }
                            }}
                            style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow hover:bg-[#FFB947]"
                            title="Start or Resume focus session"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={pauseTimer}
                            style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(255,107,0,0.5)] hover:bg-[#FFB947]"
                            title="Pause timer"
                          >
                            <Pause size={16} fill="currentColor" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={stopTimer}
                          style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B", color: "#FFB947" }}
                          className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer hover:text-[#FF6B00]"
                          title="Reset / Stop timer"
                        >
                          <Square size={13} fill="currentColor" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            stopTimer();
                            startTimer(timer.focusDurationMinutes, timer.mode);
                          }}
                          style={{ backgroundColor: "#1E1E1E", color: "#FFB947" }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:text-[#FF6B00]"
                          title="Restart current session"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>

                      {/* Right: Custom Duration (+) and Bookmark Preset */}
                      <div className="flex items-center gap-2">
                        {/* Custom Duration (+) button */}
                        <button
                          type="button"
                          onClick={() => setShowCustomDurationPanel((v) => !v)}
                          style={{
                            backgroundColor: showCustomDurationPanel ? "#FF6B00" : "#1E1E1E",
                            color: showCustomDurationPanel ? "#0D0D0D" : "#FFB947",
                          }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:text-[#FF6B00]"
                          title="Custom Time Duration settings"
                        >
                          <Plus size={16} />
                        </button>

                        {/* Presets bookmark button */}
                        <button
                          type="button"
                          onClick={() => setShowSoundscapePicker((v) => !v)}
                          style={{
                            backgroundColor: showSoundscapePicker ? "#FF6B00" : "#1E1E1E",
                            color: showSoundscapePicker ? "#0D0D0D" : "#FFB947",
                          }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:text-[#FF6B00]"
                          title="Focus Soundscapes & Ambient Streams"
                        >
                          <Bookmark size={15} />
                        </button>

                        {/* Standby Turn Off button */}
                        {isFocusModeActive && (
                          <button
                            type="button"
                            onClick={handleTurnOff}
                            style={{ backgroundColor: "#1E1E1E", borderColor: "#FF6B00", color: "#FF6B00" }}
                            className="px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow ml-1 hover:bg-[#FF6B00] hover:text-[#0D0D0D]"
                            title="Turn off Focus Mode"
                          >
                            <Power size={11} strokeWidth={2.5} />
                            <span>Off</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CUSTOM DURATION CONTROLLER */}
                  {showCustomDurationPanel && (
                    <div
                      style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
                      className="rounded-3xl border p-6 shadow-xl space-y-5 animate-in fade-in slide-in-from-top-3 duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sliders size={18} className="text-[#FF6B00]" />
                          <h3 className="text-sm font-extrabold text-white">Customize Focus Time Duration</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCustomDurationPanel(false)}
                          className="text-[#FFB947] hover:text-white"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {/* Direct Time Stepper & Input */}
                      <div
                        style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                        className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border"
                      >
                        <div>
                          <span className="text-xs text-[#FFB947]/70">Duration in minutes:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => setCustomMinutesInput((m) => Math.max(1, m - 5))}
                              style={{ backgroundColor: "#2B2B2B", color: "#FFB947" }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-[#FF6B00] hover:text-[#0D0D0D]"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomMinutesInput((m) => Math.max(1, m - 1))}
                              style={{ backgroundColor: "#2B2B2B", color: "#FFB947" }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-[#FF6B00] hover:text-[#0D0D0D]"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={360}
                              value={customMinutesInput}
                              onChange={(e) => setCustomMinutesInput(Math.max(1, Math.min(360, Number(e.target.value) || 1)))}
                              style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B", color: "#FFB947" }}
                              className="w-20 px-3 py-1.5 text-center font-mono font-bold text-lg rounded-xl border focus:outline-none focus:border-[#FF6B00]"
                            />
                            <button
                              type="button"
                              onClick={() => setCustomMinutesInput((m) => Math.min(360, m + 1))}
                              style={{ backgroundColor: "#2B2B2B", color: "#FFB947" }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-[#FF6B00] hover:text-[#0D0D0D]"
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomMinutesInput((m) => Math.min(360, m + 5))}
                              style={{ backgroundColor: "#2B2B2B", color: "#FFB947" }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-[#FF6B00] hover:text-[#0D0D0D]"
                            >
                              +5
                            </button>
                            <span className="text-xs font-mono text-[#FFB947]/70 ml-1">mins</span>
                          </div>
                        </div>

                        {/* Mode Switcher */}
                        <div
                          style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
                          className="flex items-center gap-1.5 p-1 rounded-xl border"
                        >
                          <button
                            type="button"
                            onClick={() => setTimerMode("duration")}
                            style={{
                              backgroundColor: timer.mode === "duration" ? "#FF6B00" : "transparent",
                              color: timer.mode === "duration" ? "#0D0D0D" : "#FFB947",
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          >
                            Countdown (Auto-Off)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTimerMode("pomodoro")}
                            style={{
                              backgroundColor: timer.mode === "pomodoro" ? "#FF6B00" : "transparent",
                              color: timer.mode === "pomodoro" ? "#0D0D0D" : "#FFB947",
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          >
                            Pomodoro (Cycle)
                          </button>
                        </div>
                      </div>

                      {/* Duration Slider */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-[#FFB947]/70 mb-1.5">
                          <span>Slider (1m — 180m)</span>
                          <span className="font-mono text-white font-bold">{customMinutesInput} minutes</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={180}
                          value={customMinutesInput}
                          onChange={(e) => setCustomMinutesInput(Number(e.target.value))}
                          className="w-full accent-[#FF6B00] cursor-pointer"
                        />
                      </div>

                      {/* Quick Preset Duration Chips */}
                      <div>
                        <span className="text-xs text-[#FFB947]/70 font-medium">Quick Presets:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {PRESET_DURATIONS.map((preset) => (
                            <button
                              key={preset.mins}
                              type="button"
                              onClick={() => {
                                setCustomMinutesInput(preset.mins);
                                handleApplyCustomDuration(preset.mins);
                              }}
                              style={{
                                backgroundColor: customMinutesInput === preset.mins ? "#FF6B00" : "#2B2B2B",
                                color: customMinutesInput === preset.mins ? "#0D0D0D" : "#FFB947",
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer font-bold hover:brightness-110"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ borderColor: "#2B2B2B" }} className="flex items-center justify-end gap-2.5 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => setShowCustomDurationPanel(false)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-[#FFB947] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyCustomDuration(customMinutesInput)}
                          style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
                          className="px-5 py-2 rounded-xl font-bold text-xs shadow-[0_0_12px_rgba(255,107,0,0.4)] cursor-pointer hover:bg-[#FFB947]"
                        >
                          Apply &amp; Start {customMinutesInput}m Focus
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SOUNDSCAPES DRAWER */}
                  {showSoundscapePicker && (
                    <div
                      style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
                      className="rounded-3xl border p-5 shadow-xl space-y-4 animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Headphones size={16} className="text-[#FF6B00]" />
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">Focus Soundscapes</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSoundscapePicker(false)}
                          className="text-[#FFB947] hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {playlists[0]?.tracks?.slice(0, 6).map((track) => {
                          const isCurTrack = currentTrack?.id === track.id && isAudioPlaying;
                          return (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => {
                                if (isCurTrack) {
                                  pauseAudio();
                                } else {
                                  playAudio(track);
                                }
                              }}
                              style={{
                                backgroundColor: isCurTrack ? "#2B2B2B" : "#0D0D0D",
                                borderColor: isCurTrack ? "#FF6B00" : "#2B2B2B",
                                color: isCurTrack ? "#FF6B00" : "#FFB947",
                              }}
                              className="p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer hover:border-[#FF6B00]"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="text-xs font-bold truncate">{track.title}</p>
                                <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{track.artist}</p>
                              </div>
                              <div
                                style={{
                                  backgroundColor: isCurTrack ? "#FF6B00" : "#2B2B2B",
                                  color: isCurTrack ? "#0D0D0D" : "#FFB947",
                                }}
                                className="w-7 h-7 rounded-full flex items-center justify-center"
                              >
                                {isCurTrack ? <Volume2 size={13} className="animate-pulse" /> : <Play size={11} fill="currentColor" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Audible Alarm Settings */}
                  <div
                    style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
                    className="flex items-center justify-between px-5 py-3 rounded-2xl border text-xs"
                  >
                    <button
                      type="button"
                      onClick={toggleAlarmSound}
                      style={{
                        backgroundColor: "#2B2B2B",
                        borderColor: timer.alarmSoundEnabled ? "#FF6B00" : "#2B2B2B",
                        color: timer.alarmSoundEnabled ? "#FFB947" : "#888",
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all font-medium cursor-pointer"
                    >
                      {timer.alarmSoundEnabled ? <Bell size={13} /> : <BellOff size={13} />}
                      <span>Completion Sound: {timer.alarmSoundEnabled ? "On" : "Muted"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={testFocusAlarmSound}
                      style={{ backgroundColor: "#2B2B2B", borderColor: "#2B2B2B", color: "#FFB947" }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors font-medium cursor-pointer hover:text-[#FF6B00]"
                    >
                      <Volume2 size={13} className="text-[#FF6B00]" />
                      <span>Test Chime</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: STREAKS & DASHBOARD (INTEGRATED WITH GITHUB, AZURE DEVOPS & GITLAB) */}
              {activeTab === "dashboard" && (
                <DevOpsActivityDashboard
                  localSessionLogsCount={sessionLogs?.length || 0}
                  onLogFocusBlock={() => {
                    logSession({
                      durationMinutes: 25,
                      phase: "focus",
                      profileId: activeProfileId,
                      category: "Development",
                      completed: true,
                    });
                    setFeedbackMessage("Logged 25m Focus Block! Streak, sparkline, and week calendar updated in real-time.");
                    setTimeout(() => setFeedbackMessage(null), 3500);
                  }}
                />
              )}

              {/* TAB 3: SOCIAL MEDIA SHIELD */}
              {activeTab === "shield" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white">
                        Action Tiers for Profile: <span className="text-[#FF6B00]">{activeProfile.name}</span>
                      </h3>
                      <p className="text-[11px] text-[#FFB947]/70">
                        Enforce strict blocking, functional limits, or cosmetic distraction removal.
                      </p>
                    </div>
                  </div>

                  {/* Rules Table */}
                  <div className="space-y-3.5">
                    {Object.values(SOCIAL_PLATFORMS).map((plat) => {
                      const currentTier: FocusActionTier = activeProfile.tiers[plat.id] || "ALLOW";

                      return (
                        <div
                          key={plat.id}
                          style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
                          className="p-4 sm:p-4.5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-[#383838]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white tracking-wide">{plat.name}</span>
                              <span className="text-[10px] font-mono text-[#FFB947]/70 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                {plat.domains[0]}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                              {plat.description}
                            </p>
                          </div>

                          {/* Tier Segmented Control with Generous Spacing */}
                          <div
                            style={{
                              backgroundColor: "#0A0A0A",
                              borderColor: "#2B2B2B",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "6px 8px",
                            }}
                            className="flex items-center gap-2.5 sm:gap-3 p-1.5 sm:p-2 rounded-2xl border shrink-0 text-xs font-bold shadow-inner"
                          >
                            {(["BLOCK", "LIMIT", "HIDE_DISTRACTIONS", "ALLOW"] as FocusActionTier[]).map((tier) => {
                              const isTierActive = currentTier === tier;
                              let customStyle: React.CSSProperties = {
                                padding: "7px 14px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: "700",
                                letterSpacing: "0.05em",
                                transition: "all 0.15s ease",
                                cursor: "pointer",
                                userSelect: "none",
                                whiteSpace: "nowrap",
                              };

                              if (isTierActive) {
                                if (tier === "BLOCK") {
                                  customStyle = {
                                    ...customStyle,
                                    backgroundColor: "#FF6B00",
                                    color: "#0D0D0D",
                                    fontWeight: "800",
                                    border: "1px solid #FF8533",
                                    boxShadow: "0 2px 10px rgba(255, 107, 0, 0.45)",
                                  };
                                } else if (tier === "LIMIT") {
                                  customStyle = {
                                    ...customStyle,
                                    backgroundColor: "#FFB947",
                                    color: "#0D0D0D",
                                    fontWeight: "800",
                                    border: "1px solid #FFD085",
                                    boxShadow: "0 2px 10px rgba(255, 185, 71, 0.45)",
                                  };
                                } else if (tier === "HIDE_DISTRACTIONS") {
                                  customStyle = {
                                    ...customStyle,
                                    backgroundColor: "rgba(255, 107, 0, 0.2)",
                                    color: "#FFB947",
                                    border: "1px solid #FF6B00",
                                    fontWeight: "800",
                                    boxShadow: "0 2px 8px rgba(255, 107, 0, 0.25)",
                                  };
                                } else {
                                  customStyle = {
                                    ...customStyle,
                                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                                    color: "#34D399",
                                    border: "1px solid rgba(16, 185, 129, 0.5)",
                                    fontWeight: "800",
                                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                                  };
                                }
                              } else {
                                customStyle = {
                                  ...customStyle,
                                  backgroundColor: "#161616",
                                  color: "#8E8E93",
                                  border: "1px solid #262626",
                                };
                              }

                              return (
                                <button
                                  key={tier}
                                  type="button"
                                  onClick={() => setPlatformTier(activeProfile.id, plat.id, tier)}
                                  style={customStyle}
                                  className={isTierActive ? "scale-[1.03]" : "hover:text-white hover:bg-[#222222] hover:border-zinc-600"}
                                >
                                  {tier === "HIDE_DISTRACTIONS" ? "CLEAN FEED" : tier}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: AUTOMATED SCHEDULES */}
              {activeTab === "schedules" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white">Automated Schedules</h3>
                      <p className="text-[11px] text-[#FFB947]/70">
                        Automatically activate focus profiles during routine work or study hours.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingSchedule(true)}
                      style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow cursor-pointer hover:bg-[#FFB947]"
                    >
                      <Plus size={13} />
                      <span>New Schedule</span>
                    </button>
                  </div>

                  {/* Add Schedule Form */}
                  {isAddingSchedule && (
                    <form
                      onSubmit={handleCreateSchedule}
                      style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
                      className="p-4 rounded-2xl border space-y-3"
                    >
                      <h4 className="text-xs font-bold text-white">Add Focus Schedule</h4>
                      <div>
                        <input
                          type="text"
                          placeholder="e.g. Morning Sprint"
                          value={newScheduleName}
                          onChange={(e) => setNewScheduleName(e.target.value)}
                          style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B", color: "#FFB947" }}
                          className="w-full px-3 py-1.5 text-xs rounded-xl border placeholder-zinc-500 focus:outline-none focus:border-[#FF6B00]"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-[#FFB947]/70">Start:</span>
                          <input
                            type="time"
                            value={newScheduleStart}
                            onChange={(e) => setNewScheduleStart(e.target.value)}
                            style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B", color: "#FFB947" }}
                            className="px-2 py-1 text-xs rounded-lg border focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-[#FFB947]/70">End:</span>
                          <input
                            type="time"
                            value={newScheduleEnd}
                            onChange={(e) => setNewScheduleEnd(e.target.value)}
                            style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B", color: "#FFB947" }}
                            className="px-2 py-1 text-xs rounded-lg border focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-[#FFB947]/70 block mb-1">Active Days:</span>
                        <div className="flex items-center gap-1.5">
                          {DAYS.map((d, idx) => {
                            const isSelected = newScheduleDays.includes(idx);
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  setNewScheduleDays((prev) =>
                                    prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx].sort()
                                  );
                                }}
                                style={{
                                  backgroundColor: isSelected ? "#FF6B00" : "#2B2B2B",
                                  color: isSelected ? "#0D0D0D" : "#FFB947",
                                }}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ borderColor: "#2B2B2B" }} className="flex justify-end gap-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => setIsAddingSchedule(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-[#FFB947] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!newScheduleName.trim() || newScheduleDays.length === 0}
                          style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
                          className="px-4 py-1.5 rounded-xl disabled:opacity-50 text-xs font-bold hover:bg-[#FFB947]"
                        >
                          Save Schedule
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Schedules List */}
                  <div className="space-y-2">
                    {schedules.map((sch) => {
                      const formatHour = (h: number, m: number) =>
                        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

                      return (
                        <div
                          key={sch.id}
                          style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
                          className="p-3.5 rounded-2xl border flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{sch.name}</span>
                              <span
                                style={{ backgroundColor: "#0D0D0D", color: "#FFB947" }}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                              >
                                {formatHour(sch.startHour, sch.startMinute)} - {formatHour(sch.endHour, sch.endMinute)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mt-1.5">
                              {DAYS.map((d, i) => (
                                <span
                                  key={d}
                                  style={{
                                    backgroundColor: sch.days.includes(i) ? "#2B2B2B" : "#0D0D0D",
                                    color: sch.days.includes(i) ? "#FF6B00" : "#555",
                                  }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {/* Toggle switch */}
                            <button
                              type="button"
                              onClick={() => toggleSchedule(sch.id)}
                              style={{ backgroundColor: sch.enabled ? "#FF6B00" : "#2B2B2B" }}
                              className="w-9 h-5 rounded-full transition-colors relative cursor-pointer"
                            >
                              <div
                                style={{ backgroundColor: sch.enabled ? "#0D0D0D" : "#FFB947" }}
                                className={`w-3.5 h-3.5 rounded-full transition-transform absolute top-0.5 ${
                                  sch.enabled ? "left-4.5" : "left-0.5"
                                }`}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteSchedule(sch.id)}
                              style={{ color: "#FFB947" }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:text-[#FF6B00] transition-colors"
                              title="Delete schedule"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
              className="px-6 py-3.5 border-t flex items-center justify-between text-xs text-[#FFB947]"
            >
              <span className="flex items-center gap-2 text-[11px]">
                <Flame size={12} className="text-[#FF6B00]" />
                Forge Deep Work Engine • Zero Distractions Guaranteed
              </span>
              <button
                type="button"
                onClick={() => setFocusModalOpen(false)}
                style={{ backgroundColor: "#2B2B2B", borderColor: "#2B2B2B", color: "#FFB947" }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border hover:bg-[#FF6B00] hover:text-[#0D0D0D]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
