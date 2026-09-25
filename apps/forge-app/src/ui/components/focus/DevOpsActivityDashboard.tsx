import React, { useState, useId } from "react";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Rocket,
  Flame,
  Plus,
  RefreshCw,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  Settings2,
  Grid3X3,
  ExternalLink,
} from "lucide-react";
import { useDevOpsActivityStore } from "../../../core/devops/useDevOpsActivityStore";
import type { DevOpsProviderId } from "../../../core/devops/devOpsTypes";
import { DevOpsConnectionModal } from "./DevOpsConnectionModal";

interface DevOpsActivityDashboardProps {
  onLogFocusBlock?: () => void;
  localSessionLogsCount?: number;
}

export const DevOpsActivityDashboard: React.FC<DevOpsActivityDashboardProps> = ({
  onLogFocusBlock,
  localSessionLogsCount = 0,
}) => {
  const {
    activeProvider,
    setActiveProvider,
    getStats,
    syncActivity,
    isSyncing,
    lastSyncedAt,
    logDevOpsEvent,
    heatmapExpanded,
    setHeatmapExpanded,
  } = useDevOpsActivityStore();

  const [carouselSlide, setCarouselSlide] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCommitPrompt, setShowCommitPrompt] = useState(false);
  const [customCommitMsg, setCustomCommitMsg] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const waveGradId = useId();
  const stats = getStats();

  const handleQuickCommit = () => {
    if (!customCommitMsg.trim()) return;
    logDevOpsEvent({
      provider: activeProvider === "all" ? "github" : activeProvider === "forge" ? "github" : activeProvider,
      type: "commit",
      title: customCommitMsg.trim(),
      repoOrProject: activeProvider === "azure" ? "Forge-Core" : activeProvider === "gitlab" ? "forge-platform" : "Joel-Dev0/Forge",
      identifier: Math.random().toString(16).slice(2, 9),
      author: "Joel-Dev0",
      status: "pushed",
    });
    setCustomCommitMsg("");
    setShowCommitPrompt(false);
    setFeedbackNotice("Pushed commit! Day streak & peak metrics updated in real-time.");
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleQuickWorkItem = () => {
    logDevOpsEvent({
      provider: activeProvider === "azure" ? "azure" : activeProvider === "gitlab" ? "gitlab" : "github",
      type: activeProvider === "azure" ? "work_item" : "issue_closed",
      title: "Completed User Story AB#3092: Real-time DevOps activity telemetry",
      repoOrProject: activeProvider === "azure" ? "Forge-Core / Sprint 38" : "Joel-Dev0/Forge",
      identifier: activeProvider === "azure" ? "AB#3092" : "#89",
      author: "Joel-DevOps",
      status: "completed",
    });
    setFeedbackNotice("Work item marked completed! Sprint progress updated.");
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const providers: { id: DevOpsProviderId; label: string; icon: string; badge: string }[] = [
    { id: "all", label: "All DevOps", icon: "⚡", badge: "Unified" },
    { id: "github", label: "GitHub", icon: "🐙", badge: "Joel-Dev0/Forge" },
    { id: "azure", label: "Azure DevOps", icon: "🔷", badge: "Forge-Core" },
    { id: "gitlab", label: "GitLab", icon: "🦊", badge: "forge-platform" },
    { id: "forge", label: "Local Focus", icon: "🎯", badge: "Offline" },
  ];

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* PROVIDER SWITCHER & DEVOPS SYNC BAR                                 */}
      {/* ==================================================================== */}
      <div
        style={{ backgroundColor: "#16171B", borderColor: "#2B2B2B" }}
        className="p-2.5 px-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg"
      >
        {/* Provider Switcher Pills */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {providers.map((p) => {
            const isSelected = activeProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveProvider(p.id)}
                style={{
                  backgroundColor: isSelected ? "#FF6B00" : "#0D0D0D",
                  color: isSelected ? "#0D0D0D" : "#FFB947",
                  borderColor: isSelected ? "#FF6B00" : "#2B2B2B",
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                  isSelected ? "font-extrabold shadow-[0_0_12px_rgba(255,107,0,0.4)]" : "hover:border-[#FFB947]/50"
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                <span
                  style={{
                    backgroundColor: isSelected ? "rgba(0,0,0,0.2)" : "rgba(255,185,71,0.1)",
                    color: isSelected ? "#000" : "rgba(255,185,71,0.8)",
                  }}
                  className="text-[9px] px-1.5 py-0.2 rounded-full font-mono hidden sm:inline"
                >
                  {p.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Sync, Heatmap Toggle & Settings */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setHeatmapExpanded((prev: boolean) => !prev)}
            style={{
              backgroundColor: heatmapExpanded ? "#2B2B2B" : "#0D0D0D",
              borderColor: heatmapExpanded ? "#FF6B00" : "#2B2B2B",
              color: heatmapExpanded ? "#FF6B00" : "#FFB947",
            }}
            className="px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors hover:text-[#FF6B00]"
            title="Toggle GitHub-style Contribution Heatmap Matrix"
          >
            <Grid3X3 size={13} />
            <span className="hidden sm:inline">Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => {
              syncActivity();
              setFeedbackNotice("Synced latest developer events from Git & Boards!");
              setTimeout(() => setFeedbackNotice(null), 3000);
            }}
            disabled={isSyncing}
            style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B", color: "#FFB947" }}
            className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors hover:text-[#FF6B00] disabled:opacity-50"
            title="Synchronize activity with GitHub, Azure DevOps, and GitLab"
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin text-[#FF6B00]" : ""} />
            <span>{isSyncing ? "Syncing..." : "Sync Activity"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B", color: "#FFB947" }}
            className="w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer transition-colors hover:text-[#FF6B00]"
            title="Configure Git Tokens, Repositories & Azure Projects"
          >
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EXPANDABLE GITHUB CONTRIBUTION HEATMAP MATRIX                        */}
      {/* ==================================================================== */}
      {heatmapExpanded && (
        <div
          style={{ backgroundColor: "#1E1E1E", borderColor: "#FF6B00" }}
          className="p-5 rounded-3xl border text-white shadow-2xl space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🟩</span>
              <div>
                <h4 className="text-xs font-extrabold text-white">
                  {stats.provider === "github"
                    ? "GitHub Contribution Activity"
                    : stats.provider === "azure"
                    ? "Azure DevOps Work & Commit Matrix"
                    : stats.provider === "gitlab"
                    ? "GitLab Activity Matrix"
                    : "Unified DevOps Contribution Matrix"}
                </h4>
                <p className="text-[10px] text-[#FFB947]/70">
                  Daily developer commits, pull requests, work items, and focus blocks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
              <span>Less</span>
              <span className="w-2.5 h-2.5 rounded-xs bg-[#222]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#543306]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#8c4e00]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#d46f00]" />
              <span className="w-2.5 h-2.5 rounded-xs bg-[#FF6B00]" />
              <span>More</span>
            </div>
          </div>

          {/* 35-Day Grid squares */}
          <div className="pt-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 flex-wrap">
              {stats.contributionGrid.map((cell, idx) => {
                const colors = ["#222222", "#543306", "#8c4e00", "#d46f00", "#FF6B00"];
                const bgColor = colors[cell.level];
                return (
                  <div
                    key={idx}
                    title={`${cell.dateStr}: ${cell.count} dev contributions`}
                    style={{ backgroundColor: bgColor }}
                    className="w-4 h-4 rounded-xs cursor-pointer transition-transform hover:scale-125 shadow-xs"
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TOP ROW: 3 MATCHING SCREENSHOT WIDGETS                              */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* WIDGET 1: Experience Card ("Focus / Dev Flow") */}
        <div
          style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
          className="rounded-3xl border p-5 text-white flex flex-col justify-between relative overflow-hidden shadow-xl min-h-[220px]"
        >
          {/* Top avatar & sparkle */}
          <div className="flex items-center justify-between">
            <div
              style={{ backgroundColor: "#2B2B2B", borderColor: "#FFB947" }}
              className="w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-md text-[#FFB947]"
            >
              <Sparkles size={18} />
            </div>
            <div
              style={{ backgroundColor: "#2B2B2B", borderColor: "#FF6B00", color: "#FF6B00" }}
              className="flex items-center gap-1 border px-2 py-0.5 rounded-full text-[10px] font-bold"
            >
              <span>
                {activeProvider === "github"
                  ? "GitHub Flow"
                  : activeProvider === "azure"
                  ? "Azure Sprint Flow"
                  : activeProvider === "gitlab"
                  ? "GitLab Flow"
                  : "Focus Flow"}
              </span>
            </div>
          </div>

          {/* Curved SVG Wave Path with Star Apex */}
          <div className="my-2 relative h-16 flex items-center justify-center">
            <svg viewBox="0 0 200 60" className="w-full h-full overflow-visible">
              <path
                d="M 10 45 Q 40 40 70 30 T 130 10 T 190 35"
                fill="none"
                stroke="#FFB947"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              {/* Glowing Star milestone dot at apex */}
              <circle cx="130" cy="10" r="4" fill="#FF6B00" className="drop-shadow-[0_0_6px_#FF6B00]" />
              <path
                d="M 130 2 L 132 8 L 138 10 L 132 12 L 130 18 L 128 12 L 122 10 L 128 8 Z"
                fill="#FF6B00"
              />
            </svg>
          </div>

          {/* Bottom Text & Navigation Carousel */}
          <div>
            {carouselSlide === 0 && (
              <>
                <span className="text-[11px] text-[#FFB947] font-medium tracking-wide">
                  1 — Active Focus Level
                </span>
                <h4 className="text-base font-extrabold leading-tight text-white mt-0.5">
                  Experience the power of seamless focus management
                </h4>
              </>
            )}
            {carouselSlide === 1 && (
              <>
                <span className="text-[11px] text-[#FFB947] font-medium tracking-wide">
                  2 — DevOps Commit &amp; PR Velocity
                </span>
                <h4 className="text-base font-extrabold leading-tight text-white mt-0.5">
                  {stats.weeklyDays.reduce((a, b) => a + b.totalEvents, 0)} developer activities recorded this calendar week
                </h4>
              </>
            )}
            {carouselSlide === 2 && (
              <>
                <span className="text-[11px] text-[#FFB947] font-medium tracking-wide">
                  3 — Sprint Task Execution
                </span>
                <h4 className="text-base font-extrabold leading-tight text-white mt-0.5">
                  {stats.tasksDoneCount} of {stats.totalTasksCount} Work Items &amp; PRs Completed
                </h4>
              </>
            )}

            <div style={{ borderColor: "#2B2B2B" }} className="flex items-center justify-between mt-3 pt-2 border-t">
              <span className="text-[10px] text-[#FFB947]/70">
                {stats.consecutiveStreakDays >= 14
                  ? "Milestone 3/3 — Flow Master"
                  : "Milestone 2/3 — Deep Worker"}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCarouselSlide((s) => (s > 0 ? s - 1 : 2))}
                  style={{ backgroundColor: "#2B2B2B", color: "#FFB947" }}
                  className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-[#FF6B00] hover:text-[#0D0D0D]"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setCarouselSlide((s) => (s < 2 ? s + 1 : 0))}
                  style={{ backgroundColor: "#2B2B2B", color: "#FFB947" }}
                  className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:bg-[#FF6B00] hover:text-[#0D0D0D]"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET 2: Dark Metric Card ("Max. result" / Peak focus metrics) */}
        <div
          style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
          className="rounded-3xl border p-5 flex flex-col justify-between shadow-xl min-h-[220px]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">Max. result</p>
              <p className="text-[10px] text-[#FFB947]/70">Peak focus metrics</p>
            </div>
            <span
              style={{ backgroundColor: "#2B2B2B", color: "#FFB947", borderColor: "#2B2B2B" }}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-mono border"
            >
              Today
            </span>
          </div>

          {/* Curved Orange Glowing Sparkline SVG derived from REAL SESSIONS */}
          <div className="my-2 h-16 flex items-center justify-center">
            <svg viewBox="0 0 160 50" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id={waveGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={stats.sparklineSvgPath}
                fill="none"
                stroke="#FF6B00"
                strokeWidth="2.5"
              />
              <circle
                cx={stats.sparklinePeak.x}
                cy={stats.sparklinePeak.y}
                r="3.5"
                fill="#FFB947"
                className="shadow-[0_0_8px_#FFB947]"
              />
            </svg>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white">
                {activeProvider === "all" ? "9/5" : `${stats.tasksDoneCount}/${stats.totalTasksCount}`}
              </span>
              <span className="text-xs text-[#FFB947]/80 font-semibold">Finished tasks</span>
            </div>
            <p className="text-[10px] text-[#FFB947] mt-1 flex items-center gap-1 font-semibold">
              <span>↑ {stats.improvementPercent}% improvement</span>
              <span className="text-zinc-500">vs last week</span>
            </p>
          </div>
        </div>

        {/* WIDGET 3: Real Month Totals Streak Tracker ("September totals") */}
        <div
          style={{ backgroundColor: "#1E1E1E", borderColor: "#FF6B00" }}
          className="rounded-3xl border p-5 text-white flex flex-col justify-between shadow-xl min-h-[220px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold flex items-center gap-1 text-[#FF6B00]">
              <span>{stats.currentMonthName} totals</span>
              <ChevronDown size={14} />
            </span>
            <div
              style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
              className="w-6 h-6 rounded-full flex items-center justify-center font-bold"
            >
              <Check size={13} strokeWidth={3} />
            </div>
          </div>

          <div className="my-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-[#FF6B00]">
                {stats.consecutiveStreakDays}
              </span>
              <span className="text-xs font-bold text-white">Days Completed</span>
            </div>
            <p className="text-[10px] text-[#FFB947]/70 mt-0.5">
              Consecutive focus streak • {stats.daysCompletedThisMonth} active days in {stats.currentMonthName}
            </p>
          </div>

          {/* 7-Day Calendar Grid (M T W T F S S) */}
          <div>
            <div className="grid grid-cols-7 text-center text-[9px] font-bold text-[#FFB947]/70 mb-1.5">
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {stats.weeklyDays.map((day, idx) => (
                <div
                  key={idx}
                  title={`${day.dateStr}: ${day.totalEvents} actions recorded`}
                  style={{
                    backgroundColor: day.isCompleted ? "#FF6B00" : "#2B2B2B",
                    color: day.isCompleted ? "#0D0D0D" : "#FFB947",
                    boxShadow: day.isToday ? "0 0 8px rgba(255,107,0,0.6)" : "none",
                  }}
                  className="h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs transition-transform hover:scale-110"
                >
                  {day.displayBadge}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* BOTTOM ROW: 2 MATCHING SCREENSHOT WIDGETS                           */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* WIDGET 4: Projects / Connected Repositories Completed */}
        <div
          style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
          className="rounded-3xl border p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-white">Projects completed</h4>
            </div>
            <span
              style={{ backgroundColor: "#2B2B2B", color: "#FFB947" }}
              className="text-xs px-2.5 py-1 rounded-xl flex items-center gap-1"
            >
              <span>This Week</span>
              <ChevronDown size={13} />
            </span>
          </div>

          {/* Horizontal Milestone Progress Bar with Rocket Checkpoints */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-[#FFB947]/70 mb-1.5">
              <span className="font-semibold text-white">Total progress</span>
              <span className="font-mono text-[#FFB947] font-bold">
                {stats.totalProgressPercent}%
              </span>
            </div>

            {/* Progress Bar with Rocket Markers */}
            <div style={{ backgroundColor: "#2B2B2B" }} className="relative w-full h-3 rounded-full overflow-hidden">
              <div
                style={{ width: `${stats.totalProgressPercent}%`, backgroundColor: "#FF6B00" }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono mt-1 px-1">
              <span className="text-zinc-500">0%</span>
              <span className="text-[#FFB947] font-bold">25% 🚀</span>
              <span className="text-[#FF6B00] font-bold">{stats.totalProgressPercent}% 🚀</span>
              <span className="text-zinc-500">100%</span>
            </div>
          </div>

          {/* Mini Project / Repo Cards */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {stats.projectsData.map((p, i) => (
              <div
                key={p.id}
                style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                className="p-3 rounded-2xl border text-center flex flex-col justify-between"
              >
                <div
                  style={{
                    borderColor: i === 0 ? "#FF6B00" : "#FFB947",
                    color: i === 0 ? "#FF6B00" : "#FFB947",
                  }}
                  className="w-7 h-7 mx-auto rounded-full border-2 flex items-center justify-center text-[10px] font-bold"
                >
                  <Rocket size={12} />
                </div>
                <p className="text-[11px] font-bold text-white mt-1.5 truncate" title={p.name}>
                  {p.name.includes("/") ? p.name.split("/").pop() : p.name}
                </p>
                <p className="text-[10px] font-mono text-[#FFB947] mt-0.5">
                  {p.tasksDone}/{p.totalTasks}
                </p>
              </div>
            ))}

            <div
              style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
              className="p-3 rounded-2xl border text-center flex flex-col justify-between"
            >
              <span className="text-[10px] text-[#FFB947]/70">Average score</span>
              <p className="text-xl font-extrabold text-[#FF6B00] mt-1">{stats.averageScore}</p>
              <span className="text-[9px] text-[#FFB947] font-bold">Good pace →</span>
            </div>
          </div>
        </div>

        {/* WIDGET 5: Real Tasks & Categories Progress Bar Chart */}
        <div
          style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
          className="rounded-3xl border p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-white">Tasks progress</h4>
            </div>
            <span className="text-xs text-[#FFB947] font-mono flex items-center gap-1">
              <span>&gt;&gt;</span>
            </span>
          </div>

          {/* 4 Category Columns with percentage deltas */}
          <div className="grid grid-cols-4 gap-3 text-center">
            {stats.categoryBars.map((cat) => (
              <div key={cat.key}>
                <span
                  className="text-[10px] font-mono font-bold"
                  style={{ color: cat.isPrimary ? "#FF6B00" : "#FFB947" }}
                >
                  {cat.delta}
                </span>
                <p
                  className="text-[11px] font-bold mt-0.5 truncate"
                  style={{ color: cat.isPrimary ? "#FF6B00" : "rgba(255,185,71,0.7)" }}
                >
                  {cat.name}
                </p>

                {/* Vertical Bar Column */}
                <div
                  style={{ backgroundColor: "#0D0D0D" }}
                  className="w-full h-24 rounded-2xl mt-2 flex flex-col justify-end p-1.5"
                >
                  <div
                    style={{
                      height: `${Math.max(12, cat.percent)}%`,
                      backgroundColor: cat.isPrimary ? "#FF6B00" : cat.percent > 40 ? "#FFB947" : "#2B2B2B",
                    }}
                    className="w-full rounded-xl transition-all duration-500 shadow-md"
                  />
                </div>

                <span
                  className="text-[10px] font-mono mt-1 font-bold block"
                  style={{ color: cat.isPrimary ? "#FF6B00" : "#FFB947" }}
                >
                  {cat.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* REAL-TIME DEVOPS ACTIVITY FEED STREAM                                */}
      {/* ==================================================================== */}
      <div
        style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
        className="p-5 rounded-3xl border text-white shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚡</span>
            <div>
              <h4 className="text-xs font-extrabold text-white">Live DevOps Activity Stream</h4>
              <p className="text-[10px] text-[#FFB947]/70">
                Real-time commits, pull requests, work items &amp; pipeline builds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCommitPrompt((v) => !v)}
              style={{ backgroundColor: "#2B2B2B", borderColor: "#2B2B2B", color: "#FFB947" }}
              className="px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer hover:text-[#FF6B00]"
            >
              <GitCommit size={12} />
              <span>+ Push Commit</span>
            </button>

            <button
              type="button"
              onClick={handleQuickWorkItem}
              style={{ backgroundColor: "#2B2B2B", borderColor: "#2B2B2B", color: "#FFB947" }}
              className="px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 cursor-pointer hover:text-[#FF6B00]"
            >
              <CheckCircle2 size={12} />
              <span>+ Complete Work Item</span>
            </button>
          </div>
        </div>

        {/* Quick Commit Input Bar */}
        {showCommitPrompt && (
          <div className="p-3 rounded-2xl bg-[#0D0D0D] border border-[#FF6B00]/40 flex items-center gap-2 animate-in fade-in">
            <GitCommit size={14} className="text-[#FF6B00]" />
            <input
              type="text"
              value={customCommitMsg}
              onChange={(e) => setCustomCommitMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickCommit()}
              placeholder="Enter commit message (e.g. feat(auth): complete token refresh)..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-zinc-500 font-mono"
              autoFocus
            />
            <button
              type="button"
              onClick={handleQuickCommit}
              disabled={!customCommitMsg.trim()}
              style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
              className="px-3 py-1 rounded-xl font-bold text-xs cursor-pointer hover:bg-[#FFB947] disabled:opacity-40"
            >
              Log Commit
            </button>
          </div>
        )}

        {/* Recent Events List */}
        <div className="space-y-2">
          {stats.recentEvents.map((ev) => {
            const providerIcon =
              ev.provider === "github" ? "🐙" : ev.provider === "azure" ? "🔷" : ev.provider === "gitlab" ? "🦊" : "🎯";
            return (
              <div
                key={ev.id}
                style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                className="p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-colors hover:border-[#FFB947]/30"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">{providerIcon}</span>
                  <div className="min-w-0">
                    <p className="text-white font-bold truncate">{ev.title}</p>
                    <p className="text-[10px] text-[#FFB947]/70 font-mono truncate">
                      {ev.repoOrProject} {ev.identifier ? `• ${ev.identifier}` : ""} • by {ev.author}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    style={{
                      backgroundColor:
                        ev.status === "merged" || ev.status === "completed" || ev.status === "success"
                          ? "rgba(255,107,0,0.15)"
                          : "rgba(255,185,71,0.1)",
                      color:
                        ev.status === "merged" || ev.status === "completed" || ev.status === "success"
                          ? "#FF6B00"
                          : "#FFB947",
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold capitalize"
                  >
                    {ev.status || ev.type}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{ev.timeAgo}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* REAL-TIME QUICK ACTION BAR FOR INSTANT METRIC LOGGING                */}
      {/* ==================================================================== */}
      <div
        style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B" }}
        className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2">
          <Flame size={15} className="text-[#FF6B00]" />
          <span className="text-white font-bold">Real-time Analytics Engine:</span>
          <span className="text-[#FFB947]/70 text-[11px]">
            {localSessionLogsCount + stats.recentEvents.length} focus sessions &amp; dev activities recorded • Synchronized with active workspaces &amp; checklists
          </span>
        </div>

        <div className="flex items-center gap-2">
          {feedbackNotice && (
            <span className="text-xs text-[#FF6B00] font-bold animate-in fade-in">
              {feedbackNotice}
            </span>
          )}

          <button
            type="button"
            onClick={onLogFocusBlock}
            style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
            className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow hover:bg-[#FFB947]"
          >
            <Plus size={13} strokeWidth={2.5} />
            <span>+ Log 25m Focus Block</span>
          </button>
        </div>
      </div>

      {/* Connection Modal */}
      <DevOpsConnectionModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
