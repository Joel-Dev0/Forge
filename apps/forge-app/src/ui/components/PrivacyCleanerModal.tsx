import { useState, useEffect } from "react";
import {
  Sparkles,
  ShieldCheck,
  Trash2,
  Clock,
  HardDrive,
  Database,
  AlertTriangle,
  Check,
  X,
  Plus,
  RotateCw,
  Globe,
  Calendar,
  Layers,
  Flame,
  CheckCircle2,
} from "lucide-react";
import {
  usePrivacyStore,
  type PrivacyModalTab,
  type CleanupTargetKey,
  type CleanupInterval,
  type CookieRuleMode,
  CLEANUP_TARGET_DEFINITIONS,
} from "../../core/privacy/usePrivacyStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "Never";
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) {
    // In future
    const mins = Math.ceil(Math.abs(diffMs) / 60000);
    if (mins < 60) return `in ${mins} minute${mins === 1 ? "" : "s"}`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours < 24) {
      return `in ${hours}h ${remMins > 0 ? `${remMins}m` : ""}`;
    }
    const days = Math.floor(hours / 24);
    return `in ${days} day${days === 1 ? "" : "s"}`;
  }

  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "Just now";
  const mins = Math.floor(sec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function extractHostname(urlStr?: string): string {
  if (!urlStr || urlStr === "about:blank") return "";
  try {
    return new URL(urlStr).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function PrivacyCleanerModal() {
  const {
    isModalOpen,
    closeModal,
    activeTab,
    openModal,
    policy,
    stats,
    isCleaning,
    lastResult,
    isDoubleConfirmOpen,
    criticalTargetsInPending,
    confirmPendingExecution,
    cancelPendingExecution,
    cleanNow,
    cleanTrackersOnly,
    toggleTarget,
    setInterval: setPolicyInterval,
    setCookieMode,
    addProtectedDomain,
    removeProtectedDomain,
    fetchStats,
  } = usePrivacyStore();

  const [newDomainInput, setNewDomainInput] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const activeTabId = useTabsStore((s) => s.activeTabId);
  const currentUrl = useTabsStore((s) => s.tabs.find((t) => t.id === activeTabId)?.url);
  const currentHostname = extractHostname(currentUrl);

  useEffect(() => {
    if (isModalOpen) {
      fetchStats();
    }
  }, [isModalOpen, fetchStats]);

  // Handle escape key to close
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDoubleConfirmOpen) {
          cancelPendingExecution();
        } else {
          closeModal();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isModalOpen, isDoubleConfirmOpen, closeModal, cancelPendingExecution]);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleAddDomain = () => {
    const val = newDomainInput.trim();
    if (val) {
      addProtectedDomain(val);
      setNewDomainInput("");
      triggerToast(`Protected: ${val}`);
    }
  };

  const handleAddCurrentSite = () => {
    if (currentHostname) {
      addProtectedDomain(currentHostname);
      triggerToast(`Protected: ${currentHostname}`);
    }
  };

  const handleManualClean = async (overrideTargets?: Record<CleanupTargetKey, boolean>) => {
    await cleanNow(overrideTargets);
    triggerToast("Cleanup successfully executed!");
  };

  const handleCleanTrackers = async () => {
    const count = await cleanTrackersOnly();
    triggerToast(`Purged ${count} tracker cookie${count === 1 ? "" : "s"}`);
  };

  if (!isModalOpen) return null;

  const tabsConfig: { id: PrivacyModalTab; label: string; icon: typeof Sparkles }[] = [
    { id: "overview", label: "Overview & Audit", icon: Sparkles },
    { id: "targets", label: "Cleanup Targets", icon: Layers },
    { id: "exceptions", label: "Smart Rules", icon: Globe },
    { id: "schedule", label: "Automation", icon: Calendar },
  ];

  const intervals: { id: CleanupInterval; label: string; sub: string }[] = [
    { id: "disabled", label: "Disabled", sub: "Manual cleanup only" },
    { id: "1h", label: "Every Hour", sub: "Maximum freshness" },
    { id: "6h", label: "Every 6 Hours", sub: "High privacy balance" },
    { id: "24h", label: "Daily (24h)", sub: "Recommended schedule" },
    { id: "7d", label: "Weekly (7d)", sub: "Periodic maintenance" },
  ];

  const safeKeys: CleanupTargetKey[] = ["cache", "history", "downloads"];
  const moderateKeys: CleanupTargetKey[] = ["cookies", "localStorage", "indexedDB", "serviceWorkers"];
  const criticalKeys: CleanupTargetKey[] = ["sessions", "passwordsAutofill", "permissions"];

  const safeOnlyTargets: Record<CleanupTargetKey, boolean> = {
    cache: true,
    history: true,
    downloads: true,
    cookies: false,
    localStorage: false,
    indexedDB: false,
    serviceWorkers: false,
    sessions: false,
    passwordsAutofill: false,
    permissions: false,
  };

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      {/* Main Dialog Window */}
      <div
        className="relative w-full max-w-2xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] text-[var(--forge-text)] animate-scaleUp"
        style={{ backdropFilter: "blur(20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--forge-border)] flex items-center justify-between bg-[var(--forge-surface)]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Sparkles size={18} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[14px] tracking-tight">Forge Privacy Cleaner</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Forge Shield
                </span>
              </div>
              <span className="text-[11px] text-[var(--forge-text-muted)]">
                Intelligent cache & privacy purger with smart exception rules
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStats()}
              title="Refresh telemetry"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors cursor-pointer"
            >
              <RotateCw size={13} className={isCleaning ? "animate-spin text-[#FF6B00]" : ""} />
            </button>
            <button
              onClick={closeModal}
              title="Close (Esc)"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-red-400 transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 pt-2 border-b border-[var(--forge-border)] bg-[var(--forge-surface)]/40 gap-1 overflow-x-auto scrollbar-none">
          {tabsConfig.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => openModal(t.id)}
                className={`flex items-center gap-2 px-3 py-2 text-[11px] font-medium rounded-t-lg transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? "border-[#FF6B00] text-[#FF6B00] bg-[var(--forge-surface-elevated)] font-semibold shadow-xs"
                    : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)]/40"
                }`}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents Area */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin flex flex-col gap-4 text-[12px]">
          {/* TAB 1: OVERVIEW & AUDIT */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-4">
              {/* Telemetry Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1. Cache */}
                <div className="p-3 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col justify-between gap-1 shadow-sm">
                  <div className="flex items-center justify-between text-[var(--forge-text-muted)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Cache</span>
                    <HardDrive size={13} className="text-cyan-400" />
                  </div>
                  <span className="font-mono text-base font-bold text-[var(--forge-text)]">
                    {formatBytes(stats?.cacheSizeBytes)}
                  </span>
                  <span className="text-[9px] text-[var(--forge-text-muted)]">HTTP & DNS cache</span>
                </div>

                {/* 2. Stored Cookies */}
                <div className="p-3 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col justify-between gap-1 shadow-sm">
                  <div className="flex items-center justify-between text-[var(--forge-text-muted)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Cookies</span>
                    <Flame size={13} className="text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-base font-bold text-[var(--forge-text)]">
                      {stats?.cookiesTotal ?? 0}
                    </span>
                    {(stats?.cookiesTrackers ?? 0) > 0 && (
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/15 px-1 py-0.2 rounded font-mono">
                        {stats?.cookiesTrackers} trk
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-[var(--forge-text-muted)]">
                    {stats?.cookiesStale ? `${stats.cookiesStale} stale cookies` : "Active sessions"}
                  </span>
                </div>

                {/* 3. Site Data */}
                <div className="p-3 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col justify-between gap-1 shadow-sm">
                  <div className="flex items-center justify-between text-[var(--forge-text-muted)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">Storage</span>
                    <Database size={13} className="text-purple-400" />
                  </div>
                  <span className="font-mono text-base font-bold text-[var(--forge-text)]">Active</span>
                  <span className="text-[9px] text-[var(--forge-text-muted)]">IndexedDB & LocalStorage</span>
                </div>

                {/* 4. Browsing History */}
                <div className="p-3 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col justify-between gap-1 shadow-sm">
                  <div className="flex items-center justify-between text-[var(--forge-text-muted)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">History</span>
                    <Clock size={13} className="text-emerald-400" />
                  </div>
                  <span className="font-mono text-base font-bold text-[var(--forge-text)]">
                    {stats?.historyCount ?? 0}
                  </span>
                  <span className="text-[9px] text-[var(--forge-text-muted)]">Visited URLs recorded</span>
                </div>
              </div>

              {/* Automation Status Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-[var(--forge-surface)] to-teal-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      policy.enabled ? "bg-emerald-400 animate-pulse shadow-md shadow-emerald-500/50" : "bg-zinc-500"
                    }`}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[12px]">
                        {policy.enabled ? `Automatic Purge Active (${policy.interval})` : "Automated Purge is Disabled"}
                      </span>
                      {policy.enabled && policy.nextRunTimestamp && (
                        <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                          Next: {formatRelativeTime(policy.nextRunTimestamp)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--forge-text-muted)]">
                      {policy.enabled
                        ? "Forge periodically cleans temporary cache & non-protected cookies automatically"
                        : "Enable scheduled cleanups to keep your browser fast without lifting a finger"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openModal("schedule")}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] border border-[var(--forge-border)] transition-colors cursor-pointer text-[var(--forge-text)]"
                >
                  Configure
                </button>
              </div>

              {/* Last Cleaned Banner */}
              {(stats?.lastCleanedSummary || lastResult) && (
                <div className="p-3 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                    <span>
                      Last cleaned {formatRelativeTime((lastResult || stats?.lastCleanedSummary)?.timestamp)}:{" "}
                      <strong className="text-emerald-400">
                        {formatBytes((lastResult || stats?.lastCleanedSummary)?.bytesFreed)} freed
                      </strong>
                      ,{" "}
                      <strong className="text-cyan-400">
                        {(lastResult || stats?.lastCleanedSummary)?.cookiesRemoved ?? 0} cookies removed
                      </strong>
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--forge-text-muted)]">
                    {lastResult
                      ? lastResult.cleanedTargets.length
                      : stats?.lastCleanedSummary?.targets.length ?? 0}{" "}
                    targets purged
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  onClick={() => handleManualClean()}
                  disabled={isCleaning}
                  className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8533] hover:from-[#e05e00] hover:to-[#ff7a24] text-white font-bold text-[12px] shadow-lg shadow-[#FF6B00]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>{isCleaning ? "Cleaning..." : "Clean Up Now"}</span>
                </button>

                <button
                  onClick={handleCleanTrackers}
                  disabled={isCleaning || (stats?.cookiesTrackers ?? 0) === 0}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] border border-[var(--forge-border)] font-semibold text-[11px] text-[var(--forge-text)] transition-colors cursor-pointer disabled:opacity-40"
                  title="Purge only detected tracking and telemetry cookies"
                >
                  <Flame size={13} className="text-amber-400" />
                  <span>Purge Trackers ({stats?.cookiesTrackers ?? 0})</span>
                </button>

                <button
                  onClick={() => handleManualClean(safeOnlyTargets)}
                  disabled={isCleaning}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 font-semibold text-[11px] text-emerald-300 transition-colors cursor-pointer"
                  title="Clean only safe data (Cache, History, Download log)"
                >
                  <ShieldCheck size={13} />
                  <span>Clean Safe Only</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CLEANUP TARGETS */}
          {activeTab === "targets" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-[12px]">Data Selection Tiers</span>
                  <span className="text-[10px] text-[var(--forge-text-muted)]">
                    Choose exactly what Forge removes during manual and scheduled cleanups
                  </span>
                </div>
              </div>

              {/* 1. Safe Tier */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🟢 Safe Tier
                  </span>
                  <span className="text-[10px] text-[var(--forge-text-muted)]">
                    Non-destructive. Safe for automated interval runs.
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--forge-border)] bg-[var(--forge-input)] overflow-hidden divide-y divide-[var(--forge-border)]/60">
                  {safeKeys.map((key) => {
                    const item = CLEANUP_TARGET_DEFINITIONS[key];
                    const checked = policy.targets[key];
                    return (
                      <label
                        key={key}
                        className="flex items-center justify-between p-3 hover:bg-[var(--forge-hover)]/50 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex flex-col pr-4">
                          <span className="font-semibold text-[11px] text-[var(--forge-text)]">{item.label}</span>
                          <span className="text-[10px] text-[var(--forge-text-muted)]">{item.description}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTarget(key)}
                          className="w-4 h-4 rounded text-[#FF6B00] accent-[#FF6B00] cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. Moderate Tier */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    🟡 Moderate Tier
                  </span>
                  <span className="text-[10px] text-[var(--forge-text-muted)]">
                    Application state. Protected sites are preserved.
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--forge-border)] bg-[var(--forge-input)] overflow-hidden divide-y divide-[var(--forge-border)]/60">
                  {moderateKeys.map((key) => {
                    const item = CLEANUP_TARGET_DEFINITIONS[key];
                    const checked = policy.targets[key];
                    return (
                      <label
                        key={key}
                        className="flex items-center justify-between p-3 hover:bg-[var(--forge-hover)]/50 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex flex-col pr-4">
                          <span className="font-semibold text-[11px] text-[var(--forge-text)]">{item.label}</span>
                          <span className="text-[10px] text-[var(--forge-text-muted)]">{item.description}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTarget(key)}
                          className="w-4 h-4 rounded text-[#FF6B00] accent-[#FF6B00] cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Critical Tier */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    🔴 Critical Tier
                  </span>
                  <span className="text-[10px] text-rose-300/80">
                    Explicit confirmation required. Never executed automatically.
                  </span>
                </div>

                <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 overflow-hidden divide-y divide-rose-500/20">
                  {criticalKeys.map((key) => {
                    const item = CLEANUP_TARGET_DEFINITIONS[key];
                    const checked = policy.targets[key];
                    return (
                      <label
                        key={key}
                        className="flex items-center justify-between p-3 hover:bg-rose-500/10 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex flex-col pr-4">
                          <span className="font-semibold text-[11px] text-rose-200">{item.label}</span>
                          <span className="text-[10px] text-rose-300/70">{item.description}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTarget(key)}
                          className="w-4 h-4 rounded text-rose-500 accent-rose-500 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SMART COOKIE EXCEPTIONS */}
          {activeTab === "exceptions" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col">
                <span className="font-bold text-[12px]">Smart Cookie Rule Engine</span>
                <span className="text-[10px] text-[var(--forge-text-muted)]">
                  Avoid the hassle of logging in again by keeping cookies from your trusted sites
                </span>
              </div>

              {/* Mode Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: "except_protected" as CookieRuleMode,
                    title: "Except Protected",
                    desc: "Keeps cookies for sites listed below (Recommended)",
                    badge: "Best",
                  },
                  {
                    id: "only_trackers" as CookieRuleMode,
                    title: "Trackers Only",
                    desc: "Wipes telemetry & ad cookies, keeps all logins",
                    badge: "Light",
                  },
                  {
                    id: "all" as CookieRuleMode,
                    title: "All Cookies",
                    desc: "Wipes everything unconditionally",
                    badge: "Heavy",
                  },
                ].map((modeOpt) => {
                  const isSel = policy.cookieRule.mode === modeOpt.id;
                  return (
                    <div
                      key={modeOpt.id}
                      onClick={() => setCookieMode(modeOpt.id)}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                        isSel
                          ? "bg-[#FF6B00]/10 border-[#FF6B00] shadow-md shadow-[#FF6B00]/10"
                          : "bg-[var(--forge-input)] border-[var(--forge-border)] hover:bg-[var(--forge-hover)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-[11px] ${isSel ? "text-[#FF6B00]" : "text-[var(--forge-text)]"}`}>
                          {modeOpt.title}
                        </span>
                        <span className="text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded bg-[var(--forge-surface)] border border-[var(--forge-border)]">
                          {modeOpt.badge}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--forge-text-muted)]">{modeOpt.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* Protected Domains List (Only relevant if mode === "except_protected") */}
              {policy.cookieRule.mode === "except_protected" && (
                <div className="flex flex-col gap-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-[var(--forge-text-muted)]">
                      Protected Domains ({policy.cookieRule.protectedDomains.length})
                    </span>

                    {currentHostname && !policy.cookieRule.protectedDomains.includes(currentHostname) && (
                      <button
                        onClick={handleAddCurrentSite}
                        className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                      >
                        <Plus size={11} />
                        <span>Protect current ({currentHostname})</span>
                      </button>
                    )}
                  </div>

                  {/* Add Domain Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddDomain();
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-[var(--forge-input)] border border-[var(--forge-border)] rounded-xl">
                      <Globe size={13} className="text-[var(--forge-text-muted)] shrink-0" />
                      <input
                        type="text"
                        placeholder="e.g. github.com or mycompany.com"
                        value={newDomainInput}
                        onChange={(e) => setNewDomainInput(e.target.value)}
                        className="flex-1 bg-transparent text-[11px] font-mono outline-none text-[var(--forge-text)] placeholder-[var(--forge-text-muted)]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newDomainInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Add Site
                    </button>
                  </form>

                  {/* Domain Badges */}
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] max-h-48 overflow-y-auto scrollbar-thin">
                    {policy.cookieRule.protectedDomains.length === 0 ? (
                      <span className="text-[10px] text-[var(--forge-text-muted)] italic">
                        No protected domains configured. All cookies will be purged.
                      </span>
                    ) : (
                      policy.cookieRule.protectedDomains.map((dom) => (
                        <div
                          key={dom}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[11px] font-mono group"
                        >
                          <span className="text-[var(--forge-text)]">{dom}</span>
                          <button
                            type="button"
                            onClick={() => removeProtectedDomain(dom)}
                            title={`Remove ${dom}`}
                            className="text-[var(--forge-text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUTOMATION & SCHEDULE */}
          {activeTab === "schedule" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-[12px]">Automated Background Scheduler</span>
                  <span className="text-[10px] text-[var(--forge-text-muted)]">
                    Forge silently cleans selected data on a recurring timer in the background
                  </span>
                </div>

                {/* Master Switch */}
                <button
                  onClick={() => {
                    const nextEnabled = !policy.enabled;
                    setPolicyInterval(nextEnabled ? "6h" : "disabled");
                  }}
                  role="switch"
                  aria-checked={policy.enabled}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer border ${
                    policy.enabled
                      ? "bg-emerald-500 border-emerald-400"
                      : "bg-[var(--forge-input)] border-[var(--forge-border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform shadow-md ${
                      policy.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Interval Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {intervals.map((opt) => {
                  const isSel = policy.interval === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setPolicyInterval(opt.id)}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 cursor-pointer transition-all ${
                        isSel
                          ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                          : "bg-[var(--forge-input)] border-[var(--forge-border)] hover:bg-[var(--forge-hover)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-[11px] ${isSel ? "text-emerald-400" : "text-[var(--forge-text)]"}`}>
                          {opt.label}
                        </span>
                        {isSel && <Check size={13} className="text-emerald-400" />}
                      </div>
                      <span className="text-[10px] text-[var(--forge-text-muted)]">{opt.sub}</span>
                    </div>
                  );
                })}
              </div>

              {/* Schedule Details & Safeguard Explanation */}
              <div className="p-3.5 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[var(--forge-text)]">Scheduled Execution Details</span>
                  {policy.enabled && policy.nextRunTimestamp && (
                    <span className="font-mono text-emerald-400 font-bold text-[10px]">
                      Next run: {new Date(policy.nextRunTimestamp).toLocaleTimeString()} (
                      {formatRelativeTime(policy.nextRunTimestamp)})
                    </span>
                  )}
                </div>

                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
                  <ShieldCheck size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Automated Safeguard:</strong> Scheduled runs automatically exclude critical data
                    (active sessions & saved passwords) to prevent sudden disconnections from your work.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--forge-border)] flex items-center justify-between bg-[var(--forge-surface)]/60">
          <div className="flex items-center gap-2">
            {successToast ? (
              <span className="text-[11px] font-semibold text-emerald-400 animate-fadeIn flex items-center gap-1.5">
                <Check size={12} />
                {successToast}
              </span>
            ) : (
              <span className="text-[10px] text-[var(--forge-text-muted)]">
                Press Esc or click outside to dismiss
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={closeModal}
              className="px-3.5 py-1.5 rounded-xl text-[11px] font-semibold text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
            >
              Done
            </button>
            <button
              onClick={() => handleManualClean()}
              disabled={isCleaning}
              className="px-4 py-1.5 rounded-xl text-[11px] font-bold bg-[#FF6B00] hover:bg-[#e05e00] text-white transition-all cursor-pointer shadow-md shadow-[#FF6B00]/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 size={12} />
              <span>{isCleaning ? "Cleaning..." : "Clean Now"}</span>
            </button>
          </div>
        </div>

        {/* DOUBLE CONFIRMATION MODAL OVERLAY (For Critical Tier Targets) */}
        {isDoubleConfirmOpen && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
            <div className="max-w-md w-full bg-[var(--forge-surface-elevated)] border border-rose-500/50 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-[12px] animate-scaleUp">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-[14px] text-rose-300">Critical Data Loss Warning</span>
                  <span className="text-[10px] text-[var(--forge-text-muted)]">
                    Irreversible action requires explicit consent
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-[11px] text-rose-200 flex flex-col gap-1.5">
                <p>
                  You have selected <strong>Critical targets</strong>:
                </p>
                <ul className="list-disc pl-5 font-mono text-[10px] text-rose-300">
                  {criticalTargetsInPending.map((k) => (
                    <li key={k}>{CLEANUP_TARGET_DEFINITIONS[k].label}</li>
                  ))}
                </ul>
                <p className="pt-1 text-[10px] text-rose-300/80">
                  Executing this will immediately disconnect active sessions and wipe saved form credentials.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={cancelPendingExecution}
                  className="px-3.5 py-1.5 rounded-xl text-[11px] font-semibold text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPendingExecution}
                  className="px-4 py-1.5 rounded-xl text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
                >
                  <Trash2 size={12} />
                  <span>Yes, Proceed With Clean</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
