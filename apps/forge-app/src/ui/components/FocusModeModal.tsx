import { useState } from "react";
import {
  X,
  Flame,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Shield,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Bell,
  BellOff,
  Volume2,
} from "lucide-react";
import { useFocusStore } from "../../core/focus/useFocusStore";
import { testFocusAlarmSound } from "../../core/focus/focusAlarm";
import {
  SOCIAL_PLATFORMS,
  type FocusActionTier,
} from "../../core/focus/socialRulesets";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function FocusModeModal() {
  const {
    isFocusModeActive,
    activeProfileId,
    timer,
    profiles,
    schedules,
    isFocusModalOpen,
    lastAlarmTriggered,
    setFocusModalOpen,
    toggleFocusMode,
    setActiveProfile,
    setPlatformTier,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    dismissAlarm,
    toggleAlarmSound,
    addSchedule,
    deleteSchedule,
    toggleSchedule,
  } = useFocusStore();

  const [activeTab, setActiveTab] = useState<"pomodoro" | "shield" | "schedules">("pomodoro");

  // New Schedule State
  const [isAddingSchedule, setIsAddingSchedule] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newScheduleStart, setNewScheduleStart] = useState("09:00");
  const [newScheduleEnd, setNewScheduleEnd] = useState("17:00");
  const [newScheduleProfile, setNewScheduleProfile] = useState("deep_work");

  if (!isFocusModalOpen && !lastAlarmTriggered) return null;

  const activeProfile = profiles[activeProfileId] || Object.values(profiles)[0];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleName.trim()) return;

    const [sh, sm] = newScheduleStart.split(":").map(Number);
    const [eh, em] = newScheduleEnd.split(":").map(Number);

    addSchedule({
      name: newScheduleName.trim(),
      days: newScheduleDays,
      startHour: sh || 9,
      startMinute: sm || 0,
      endHour: eh || 17,
      endMinute: em || 0,
      enabled: true,
      profileId: newScheduleProfile,
    });

    setNewScheduleName("");
    setIsAddingSchedule(false);
  };

  const toggleDay = (dayIdx: number) => {
    setNewScheduleDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort()
    );
  };

  return (
    <>
      {/* Floating alarm toast if modal is closed */}
      {lastAlarmTriggered && !isFocusModalOpen && (
        <div className="fixed top-12 right-6 z-[9999] flex items-center gap-3.5 p-4 bg-[var(--forge-surface-elevated)] border-2 border-[#FF6B00] rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center font-bold shadow-[0_0_15px_rgba(255,107,0,0.5)] animate-bounce">
            <Bell size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>⏰ Timer Complete!</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FF6B00]/20 text-[#FF6B00]">
                {lastAlarmTriggered.phase === "break" ? "BREAK OVER" : "FOCUS OVER"}
              </span>
            </p>
            <p className="text-xs text-[var(--forge-text-muted)] mt-0.5 max-w-[260px]">
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
              className="px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold transition-all shadow cursor-pointer"
            >
              Open Timer
            </button>
            <button
              type="button"
              onClick={dismissAlarm}
              className="p-1.5 rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-white transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Main Focus Mode Modal */}
      {isFocusModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-[var(--forge-text)] font-sans"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isFocusModeActive
                  ? "bg-[#FF6B00] text-white shadow-[0_0_15px_rgba(255,107,0,0.5)]"
                  : "bg-[var(--forge-input)] text-[var(--forge-text-muted)]"
              }`}
            >
              <Flame size={20} className={isFocusModeActive ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Focus Mode & Distraction Shield</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isFocusModeActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {isFocusModeActive ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
              <p className="text-xs text-[var(--forge-text-muted)]">
                Eliminate algorithm feeds, limit addictive short-form media, and boost deep work flow.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFocusMode}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
                isFocusModeActive
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-[#FF6B00] hover:bg-[#FF8533] text-white"
              }`}
            >
              {isFocusModeActive ? "Turn Off Focus" : "Turn On Focus"}
            </button>
            <button
              onClick={() => setFocusModalOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-[var(--forge-border)] bg-[var(--forge-surface)] text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("pomodoro")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "pomodoro"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-white"
            }`}
          >
            <Clock size={14} />
            <span>Focus & Pomodoro</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("shield")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "shield"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-white"
            }`}
          >
            <Shield size={14} />
            <span>Social Media Shield ({Object.keys(SOCIAL_PLATFORMS).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("schedules")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "schedules"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-white"
            }`}
          >
            <Calendar size={14} />
            <span>Automated Schedules ({schedules.length})</span>
          </button>
        </div>

        {/* Active Alarm Banner inside Modal */}
        {lastAlarmTriggered && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-[#FF6B00]/20 to-amber-500/20 border border-[#FF6B00]/50 flex items-center justify-between shadow-lg animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B00] text-white flex items-center justify-center font-bold">
                <Bell size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">⏰ Countdown Finished!</p>
                <p className="text-[11px] text-zinc-300">{lastAlarmTriggered.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAlarm}
              className="px-3 py-1 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs shadow transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: POMODORO & PROFILES */}
          {activeTab === "pomodoro" && (
            <div className="space-y-6">
              {/* Pomodoro Timer Clock Box */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-[var(--forge-surface-elevated)] to-[var(--forge-surface)] border border-[var(--forge-border)] flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-3 right-4">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      timer.phase === "break"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-[#FF6B00]/20 text-[#FF6B00]"
                    }`}
                  >
                    {timer.phase === "break" ? "🌿 BREAK TIME" : "🎯 FOCUS TIME"}
                  </span>
                </div>

                <div className="text-5xl font-mono font-extrabold tracking-wider my-3 text-white">
                  {formatTime(timer.remainingSeconds)}
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-3 mt-2">
                  {!timer.isRunning ? (
                    <button
                      type="button"
                      onClick={() => (timer.remainingSeconds < timer.totalSeconds && timer.remainingSeconds > 0 ? resumeTimer() : startTimer(25, "pomodoro"))}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <Play size={14} fill="currentColor" />
                      <span>{timer.remainingSeconds < timer.totalSeconds && timer.remainingSeconds > 0 ? "Resume" : "Start 25m Focus"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseTimer}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Pause size={14} fill="currentColor" />
                      <span>Pause</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={stopTimer}
                    title="Reset timer"
                    className="p-2 rounded-xl bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>

                {/* Quick Durations */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--forge-border)] w-full justify-center">
                  <span className="text-[11px] text-[var(--forge-text-muted)]">Quick Durations:</span>
                  <button
                    type="button"
                    onClick={() => startTimer(15, "duration")}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-zinc-300 font-mono transition-colors"
                  >
                    15m
                  </button>
                  <button
                    type="button"
                    onClick={() => startTimer(25, "pomodoro")}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[#FF6B00]/15 text-[#FF6B00] border border-[#FF6B00]/30 font-mono font-bold transition-colors"
                  >
                    25m (Classic)
                  </button>
                  <button
                    type="button"
                    onClick={() => startTimer(50, "pomodoro")}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-zinc-300 font-mono transition-colors"
                  >
                    50m (Deep)
                  </button>
                </div>

                {/* Alarm Sound Settings & Test */}
                <div className="flex items-center justify-between w-full mt-3 pt-3 border-t border-[var(--forge-border)]/60 text-xs px-2">
                  <button
                    type="button"
                    onClick={toggleAlarmSound}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs font-medium cursor-pointer ${
                      timer.alarmSoundEnabled
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-zinc-800/80 border-zinc-700 text-zinc-400"
                    }`}
                    title="Toggle audible chime when countdown finishes"
                  >
                    {timer.alarmSoundEnabled ? <Bell size={13} /> : <BellOff size={13} />}
                    <span>Alarm: {timer.alarmSoundEnabled ? "Enabled" : "Muted"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={testFocusAlarmSound}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white border border-[var(--forge-border)] transition-colors text-xs font-medium cursor-pointer"
                    title="Play test chime"
                  >
                    <Volume2 size={13} className="text-[#FF6B00]" />
                    <span>Test Chime</span>
                  </button>
                </div>
              </div>

              {/* Profiles Selector */}
              <div>
                <h3 className="text-xs font-bold text-[var(--forge-text-muted)] uppercase tracking-wider mb-3">
                  Select Focus Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.values(profiles).map((prof) => {
                    const isSelected = prof.id === activeProfileId;
                    return (
                      <div
                        key={prof.id}
                        onClick={() => setActiveProfile(prof.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-[#FF6B00]/10 border-[#FF6B00] shadow-sm"
                            : "bg-[var(--forge-surface-elevated)] border-[var(--forge-border)] hover:border-[var(--forge-border-focus)]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-white">{prof.name}</span>
                            {isSelected && <CheckCircle2 size={14} className="text-[#FF6B00]" />}
                          </div>
                          <p className="text-[11px] text-[var(--forge-text-muted)] line-clamp-2 leading-relaxed">
                            {prof.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GRANULAR SOCIAL SHIELD */}
          {activeTab === "shield" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Action Tiers for Profile: <span className="text-[#FF6B00]">{activeProfile.name}</span>
                  </h3>
                  <p className="text-[11px] text-[var(--forge-text-muted)]">
                    Enforce strict blocking, functional limits, or cosmetic distraction removal.
                  </p>
                </div>
              </div>

              {/* Rules Table */}
              <div className="space-y-2.5">
                {Object.values(SOCIAL_PLATFORMS).map((plat) => {
                  const currentTier: FocusActionTier = activeProfile.tiers[plat.id] || "ALLOW";

                  return (
                    <div
                      key={plat.id}
                      className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{plat.name}</span>
                          <span className="text-[10px] font-mono text-[var(--forge-text-muted)]">
                            ({plat.domains[0]})
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--forge-text-muted)] mt-0.5">
                          {plat.description}
                        </p>
                      </div>

                      {/* Tier Segmented Control */}
                      <div className="flex items-center bg-[var(--forge-input)] p-0.5 rounded-lg border border-[var(--forge-border)] shrink-0 text-[10px] font-semibold">
                        {(["BLOCK", "LIMIT", "HIDE_DISTRACTIONS", "ALLOW"] as FocusActionTier[]).map((tier) => {
                          const isTierActive = currentTier === tier;
                          let activeClass = "";
                          if (isTierActive) {
                            if (tier === "BLOCK") activeClass = "bg-red-500/20 text-red-400 border-red-500/40";
                            else if (tier === "LIMIT") activeClass = "bg-amber-500/20 text-amber-400 border-amber-500/40";
                            else if (tier === "HIDE_DISTRACTIONS") activeClass = "bg-purple-500/20 text-purple-400 border-purple-500/40";
                            else activeClass = "bg-zinc-700 text-white";
                          }

                          return (
                            <button
                              key={tier}
                              type="button"
                              onClick={() => setPlatformTier(activeProfile.id, plat.id, tier)}
                              className={`px-2 py-1 rounded transition-all cursor-pointer ${
                                isTierActive
                                  ? `${activeClass} shadow-sm border font-bold`
                                  : "text-[var(--forge-text-muted)] hover:text-white"
                              }`}
                            >
                              {tier === "BLOCK"
                                ? "Block"
                                : tier === "LIMIT"
                                ? "Limit"
                                : tier === "HIDE_DISTRACTIONS"
                                ? "Hide Feeds"
                                : "Allow"}
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

          {/* TAB 3: AUTOMATED SCHEDULES */}
          {activeTab === "schedules" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Recurring Focus Schedules</h3>
                  <p className="text-[11px] text-[var(--forge-text-muted)]">
                    Automatically activate deep work mode during your study or work sessions.
                  </p>
                </div>
                {!isAddingSchedule && (
                  <button
                    type="button"
                    onClick={() => setIsAddingSchedule(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Schedule</span>
                  </button>
                )}
              </div>

              {/* Add Schedule Form */}
              {isAddingSchedule && (
                <form
                  onSubmit={handleCreateSchedule}
                  className="p-4 rounded-xl bg-[var(--forge-surface-elevated)] border border-[#FF6B00]/30 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#FF6B00]">New Recurring Schedule</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingSchedule(false)}
                      className="text-xs text-[var(--forge-text-muted)] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--forge-text-muted)] block mb-1">
                      Schedule Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Work Hours, Study Hall..."
                      value={newScheduleName}
                      onChange={(e) => setNewScheduleName(e.target.value)}
                      autoFocus
                      className="w-full h-8 px-3 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] text-xs text-white placeholder-[var(--forge-text-muted)] focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  {/* Day Picker */}
                  <div>
                    <label className="text-[11px] font-medium text-[var(--forge-text-muted)] block mb-1">
                      Active Days
                    </label>
                    <div className="flex items-center gap-1.5">
                      {DAYS.map((day, idx) => {
                        const isDayActive = newScheduleDays.includes(idx);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(idx)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isDayActive
                                ? "bg-[#FF6B00] text-white shadow-sm"
                                : "bg-[var(--forge-input)] text-[var(--forge-text-muted)] hover:text-white"
                            }`}
                          >
                            {day[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-[var(--forge-text-muted)] block mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={newScheduleStart}
                        onChange={(e) => setNewScheduleStart(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-[var(--forge-text-muted)] block mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={newScheduleEnd}
                        onChange={(e) => setNewScheduleEnd(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Profile Selector */}
                  <div>
                    <label className="text-[11px] font-medium text-[var(--forge-text-muted)] block mb-1">
                      Focus Profile
                    </label>
                    <select
                      value={newScheduleProfile}
                      onChange={(e) => setNewScheduleProfile(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] text-xs text-white"
                    >
                      {Object.values(profiles).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingSchedule(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-[var(--forge-text-muted)] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newScheduleName.trim() || newScheduleDays.length === 0}
                      className="px-4 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] disabled:opacity-50 text-white text-xs font-bold"
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
                      className="p-3.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{sch.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {formatHour(sch.startHour, sch.startMinute)} - {formatHour(sch.endHour, sch.endMinute)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {DAYS.map((d, i) => (
                            <span
                              key={d}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                sch.days.includes(i)
                                  ? "bg-[#FF6B00]/20 text-[#FF6B00]"
                                  : "bg-[var(--forge-input)] text-zinc-600"
                              }`}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => toggleSchedule(sch.id)}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            sch.enabled ? "bg-[#FF6B00]" : "bg-zinc-700"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                              sch.enabled ? "left-4.5" : "left-0.5"
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteSchedule(sch.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-[var(--forge-text-muted)] hover:text-red-400 transition-colors"
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
        <div className="px-6 py-3 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] flex items-center justify-between text-xs text-[var(--forge-text-muted)]">
          <span>Social Media Shields apply in real-time to all Chromium webview requests.</span>
          <button
            type="button"
            onClick={() => setFocusModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-white text-xs font-medium transition-colors"
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
