import { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Search,
  Trash2,
  Plus,
  Copy,
  Check,
  Ban,
  CheckCircle2,
  RefreshCw,
  Activity,
  BarChart3,
  SlidersHorizontal,
  HardDrive,
  Clock,
  Download,
  Upload,
  EyeOff,
  Skull,
  FileCode2,
  Power,
} from "lucide-react";
import { useAdBlockStore, type ShieldFeatures } from "../../core/adblock/useAdBlockStore";

type InspectorTab = "stream" | "analytics" | "custom_rules";

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BlockedRequestsInspector() {
  const {
    enabled,
    features,
    toggleFeature,
    stats,
    detailedStats,
    customRules,
    requests,
    filter,
    categoryFilter,
    searchQuery,
    isUpdating,
    lastUpdated,
    init,
    toggleEnabled,
    addUserRule,
    removeUserRule,
    toggleCustomRule,
    importRules,
    exportRules,
    quickAllowDomain,
    quickBlockDomain,
    quickBlockUrl,
    clearLogs,
    updateLists,
    fetchDetailedStats,
    fetchCustomRules,
    setFilter,
    setCategoryFilter,
    setSearchQuery,
  } = useAdBlockStore();

  const [activeTab, setActiveTab] = useState<InspectorTab>("stream");
  const [newRuleInput, setNewRuleInput] = useState("");
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    init();
    fetchDetailedStats().catch(() => {});
    fetchCustomRules().catch(() => {});
  }, [init, fetchDetailedStats, fetchCustomRules]);

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAddRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleInput.trim()) return;

    const res = await addUserRule(newRuleInput.trim());
    if (res.ok) {
      showNotification(`Added custom rule: ${newRuleInput.trim()}`);
      setNewRuleInput("");
      setShowAddRuleModal(false);
    } else {
      alert(res.error || "Failed to add rule");
    }
  };

  const handleImportSubmit = async () => {
    if (!importText.trim()) return;
    const res = await importRules(importText);
    showNotification(`Imported ${res.imported} custom rules`);
    setImportText("");
    setShowImportModal(false);
  };

  const handleExportClick = async () => {
    const text = await exportRules();
    if (!text) {
      showNotification("No custom rules to export");
      return;
    }
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forge_shield_custom_rules.txt";
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Exported custom rules to file");
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (filter === "blocked" && req.status !== "blocked") return false;
      if (filter === "allowed" && req.status !== "allowed") return false;

      if (categoryFilter !== "all") {
        if (req.category !== categoryFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          req.url.toLowerCase().includes(q) ||
          req.name.toLowerCase().includes(q) ||
          req.domain.toLowerCase().includes(q) ||
          (req.rule && req.rule.toLowerCase().includes(q)) ||
          (req.listId && req.listId.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [requests, filter, categoryFilter, searchQuery]);

  const totalBlocked = stats?.blockedCount ?? requests.filter((r) => r.status === "blocked").length;
  const totalAllowed = stats?.allowedCount ?? requests.filter((r) => r.status === "allowed").length;
  const totalRequests = totalBlocked + totalAllowed;
  const blockPercent = totalRequests > 0 ? Math.round((totalBlocked / totalRequests) * 100) : 0;

  const featureToggles: { key: keyof ShieldFeatures; label: string; icon: typeof Ban; color: string }[] = [
    { key: "adBlock", label: "Ad Blocker", icon: Ban, color: "text-red-400" },
    { key: "trackerProtection", label: "Trackers", icon: EyeOff, color: "text-amber-400" },
    { key: "malvertisingProtection", label: "Malvertising", icon: Skull, color: "text-rose-400" },
    { key: "customRules", label: "Custom", icon: FileCode2, color: "text-blue-400" },
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--forge-surface)] text-[11px] select-text">
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/50 gap-2 shrink-0 w-full">
        <div className="flex items-center gap-2">
          {/* Main Shield Status Toggle */}
          <button
            onClick={toggleEnabled}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer shadow-xs border ${
              enabled
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
            }`}
            title="Toggle Forge Shield Master Protection"
          >
            {enabled ? <ShieldCheck size={13} /> : <ShieldX size={13} />}
            <span>{enabled ? "Shield ON" : "Shield OFF"}</span>
          </button>

          {/* 4 Feature Module Quick-Toggles */}
          <div className="flex items-center gap-1 bg-[var(--forge-input)] p-0.5 rounded-md text-[9px] border border-[var(--forge-border)]">
            {featureToggles.map((ft) => {
              const Icon = ft.icon;
              const isActive = features[ft.key] && enabled;
              return (
                <button
                  key={ft.key}
                  onClick={() => toggleFeature(ft.key)}
                  disabled={!enabled}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? "bg-[var(--forge-surface)] text-[var(--forge-text)] shadow-xs"
                      : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] opacity-60 line-through"
                  }`}
                  title={`${ft.label}: ${isActive ? "Active" : "Disabled"}`}
                >
                  <Icon size={10} className={isActive ? ft.color : "text-[var(--forge-text-muted)]"} />
                  <span>{ft.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-2">
          {/* Metrics summary */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--forge-text-muted)] bg-[var(--forge-input)] px-2.5 py-1 rounded border border-[var(--forge-border)]">
            <span>
              Blocked: <strong className="text-red-400">{totalBlocked}</strong> ({blockPercent}%)
            </span>
            <span className="text-[var(--forge-border)]">|</span>
            <span>
              Allowed: <strong className="text-emerald-400">{totalAllowed}</strong>
            </span>
          </div>

          {/* Update filter lists button */}
          <button
            onClick={async () => {
              await updateLists();
              showNotification("Filter lists updated successfully!");
            }}
            disabled={isUpdating}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
              isUpdating
                ? "bg-blue-500/15 text-blue-400 border-blue-500/30 opacity-70 cursor-wait"
                : "bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text)] border-[var(--forge-border)]"
            }`}
            title={lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}` : "Check for filter list updates from open-source repositories"}
          >
            <RefreshCw size={11} className={isUpdating ? "animate-spin text-blue-400" : "text-[var(--forge-text-muted)]"} />
            <span>{isUpdating ? "Updating..." : "Update Lists"}</span>
          </button>

          {/* Clear logs */}
          <button
            onClick={clearLogs}
            title="Clear blocked requests history & reset analytics"
            className="p-1 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] rounded transition-colors cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Tab Navigation Row */}
      <div className="flex items-center justify-between px-3 border-b border-[var(--forge-border)] bg-[var(--forge-surface)] shrink-0 w-full">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("stream")}
            className={`flex items-center gap-1.5 py-2 px-2.5 border-b-2 font-semibold text-[11px] transition-colors cursor-pointer ${
              activeTab === "stream"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <Activity size={12} />
            <span>Live Traffic Stream</span>
            <span className="px-1 py-0.2 rounded-full text-[9px] font-mono bg-[var(--forge-input)] text-[var(--forge-text-muted)]">
              {requests.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("analytics");
              fetchDetailedStats();
            }}
            className={`flex items-center gap-1.5 py-2 px-2.5 border-b-2 font-semibold text-[11px] transition-colors cursor-pointer ${
              activeTab === "analytics"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <BarChart3 size={12} />
            <span>Block Statistics</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("custom_rules");
              fetchCustomRules();
            }}
            className={`flex items-center gap-1.5 py-2 px-2.5 border-b-2 font-semibold text-[11px] transition-colors cursor-pointer ${
              activeTab === "custom_rules"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <SlidersHorizontal size={12} />
            <span>Custom Rules</span>
            <span className="px-1 py-0.2 rounded-full text-[9px] font-mono bg-[var(--forge-input)] text-[var(--forge-text-muted)]">
              {customRules.length}
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="bg-[#FF6B00]/10 border-b border-[#FF6B00]/30 px-3 py-1 text-[10px] text-[#FF6B00] font-semibold flex items-center justify-between animate-fadeIn">
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* TAB 1: Live Traffic Stream */}
      {activeTab === "stream" && (
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          {/* Secondary Filter & Search Row */}
          <div className="flex flex-wrap items-center justify-between px-3 py-1.5 border-b border-[var(--forge-border)] bg-[var(--forge-surface)] shrink-0 gap-2 w-full">
            <div className="flex items-center gap-2">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-0.5 bg-[var(--forge-input)] p-0.5 rounded text-[9px]">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    filter === "all"
                      ? "bg-[var(--forge-surface)] text-[var(--forge-text)] font-bold shadow-xs"
                      : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  }`}
                >
                  All ({requests.length})
                </button>
                <button
                  onClick={() => setFilter("blocked")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    filter === "blocked"
                      ? "bg-red-500/20 text-red-400 font-bold shadow-xs"
                      : "text-[var(--forge-text-muted)] hover:text-red-400"
                  }`}
                >
                  <Ban size={10} />
                  Blocked ({requests.filter((r) => r.status === "blocked").length})
                </button>
                <button
                  onClick={() => setFilter("allowed")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    filter === "allowed"
                      ? "bg-emerald-500/20 text-emerald-400 font-bold shadow-xs"
                      : "text-[var(--forge-text-muted)] hover:text-emerald-400"
                  }`}
                >
                  <CheckCircle2 size={10} />
                  Allowed ({requests.filter((r) => r.status === "allowed").length})
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="hidden sm:flex items-center gap-0.5 bg-[var(--forge-input)] p-0.5 rounded text-[9px]">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    categoryFilter === "all" ? "bg-[var(--forge-surface)] font-bold text-[var(--forge-text)]" : "text-[var(--forge-text-muted)]"
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setCategoryFilter("ad")}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    categoryFilter === "ad" ? "bg-red-500/20 text-red-400 font-bold" : "text-[var(--forge-text-muted)] hover:text-red-400"
                  }`}
                >
                  Ads
                </button>
                <button
                  onClick={() => setCategoryFilter("tracker")}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    categoryFilter === "tracker" ? "bg-amber-500/20 text-amber-400 font-bold" : "text-[var(--forge-text-muted)] hover:text-amber-400"
                  }`}
                >
                  Trackers
                </button>
                <button
                  onClick={() => setCategoryFilter("malvertising")}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    categoryFilter === "malvertising" ? "bg-rose-500/20 text-rose-400 font-bold" : "text-[var(--forge-text-muted)] hover:text-rose-400"
                  }`}
                >
                  Threats
                </button>
                <button
                  onClick={() => setCategoryFilter("custom")}
                  className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                    categoryFilter === "custom" ? "bg-blue-500/20 text-blue-400 font-bold" : "text-[var(--forge-text-muted)] hover:text-blue-400"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Search input */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] w-48 sm:w-64">
              <Search size={11} className="text-[var(--forge-text-muted)] shrink-0" />
              <input
                type="text"
                placeholder="Filter domain, URL, or rule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-[10px] text-[var(--forge-text)] outline-none w-full placeholder:text-[var(--forge-text-muted)] font-mono"
              />
            </div>
          </div>

          {/* Main Request Stream List */}
          <div className="flex-1 overflow-y-auto font-mono text-[10px] divide-y divide-[var(--forge-border)]/40 scrollbar-thin">
            {filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-[var(--forge-text-muted)] italic text-[11px] space-y-2">
                <ShieldAlert size={28} className="mx-auto text-[var(--forge-text-muted)]/50" />
                <p className="font-semibold text-[var(--forge-text)]">No matching requests recorded.</p>
                <p className="text-[10px] max-w-sm mx-auto opacity-75">
                  Browse pages in Forge tabs to inspect live network interception across advertising, tracking, malvertising, and custom rules.
                </p>
              </div>
            ) : (
              filteredRequests.map((req) => {
                const isBlocked = req.status === "blocked";

                let catBadgeColor = "bg-[var(--forge-input)] text-[var(--forge-text-muted)] border-[var(--forge-border)]";
                if (req.category === "ad") catBadgeColor = "bg-red-500/15 text-red-400 border-red-500/30";
                else if (req.category === "tracker") catBadgeColor = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                else if (req.category === "malvertising") catBadgeColor = "bg-rose-500/15 text-rose-400 border-rose-500/30";
                else if (req.category === "custom") catBadgeColor = "bg-blue-500/15 text-blue-400 border-blue-500/30";

                return (
                  <div
                    key={req.id}
                    className={`flex items-center justify-between px-3 py-1.5 transition-colors group ${
                      isBlocked ? "bg-red-500/[0.03] hover:bg-red-500/[0.08]" : "hover:bg-[var(--forge-hover)]"
                    }`}
                  >
                    {/* Left: Status Icon + Resource Info */}
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                          isBlocked ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {isBlocked ? <Ban size={9} /> : <Check size={9} />}
                        {isBlocked ? "Blocked" : "Allowed"}
                      </span>

                      {/* Category Badge */}
                      {req.category && (
                        <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase border shrink-0 ${catBadgeColor}`}>
                          {req.category}
                        </span>
                      )}

                      {/* Resource type badge */}
                      <span className="text-[8px] px-1 py-0.2 rounded bg-[var(--forge-input)] text-[var(--forge-text-muted)] font-mono shrink-0">
                        {req.resourceType}
                      </span>

                      {/* Resource name + domain */}
                      <div className="flex items-baseline gap-1.5 truncate">
                        <span className="font-bold text-[var(--forge-text)] truncate max-w-xs" title={req.name}>
                          {req.name}
                        </span>
                        <span className="text-[9px] text-[var(--forge-text-muted)] truncate" title={req.domain}>
                          {req.domain}
                        </span>
                      </div>

                      {/* Matched rule pill if blocked */}
                      {req.rule && (
                        <span
                          className="hidden lg:inline-flex items-center gap-1 text-[8px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-300 border border-red-500/20 truncate max-w-xs"
                          title={`Matched rule: ${req.rule} (${req.listId || "Custom"})`}
                        >
                          <span className="font-semibold text-[7px] uppercase opacity-70">Rule:</span>
                          <code className="truncate">{req.rule}</code>
                        </span>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      {/* Quick Domain Allow / Block & URL Block */}
                      {req.domain && (
                        <>
                          {isBlocked ? (
                            <button
                              onClick={async () => {
                                await quickAllowDomain(req.domain);
                                showNotification(`Allowed domain: ${req.domain}`);
                              }}
                              className="px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 text-[8px] font-sans font-bold cursor-pointer transition-colors"
                              title={`Allow domain: ${req.domain} (adds @@||${req.domain}^)`}
                            >
                              Allow Domain
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={async () => {
                                  await quickBlockUrl(req.url);
                                  showNotification(`Blocked specific URL: ${req.name}`);
                                }}
                                className="px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 text-[8px] font-sans font-bold cursor-pointer transition-colors"
                                title={`Block this specific URL/page without blocking the whole domain`}
                              >
                                Block URL
                              </button>
                              <button
                                onClick={async () => {
                                  await quickBlockDomain(req.domain);
                                  showNotification(`Blocked domain: ${req.domain}`);
                                }}
                                className="px-1.5 py-0.5 rounded bg-red-500/15 hover:bg-red-500/30 text-red-400 text-[8px] font-sans font-bold cursor-pointer transition-colors"
                                title={`Block entire domain: ${req.domain} (adds ||${req.domain}^)`}
                              >
                                Block Domain
                              </button>
                            </>
                          )}
                        </>
                      )}

                      {/* Copy URL */}
                      <button
                        onClick={() => handleCopy(req.url, req.id)}
                        className="p-1 rounded hover:bg-[var(--forge-input)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors cursor-pointer"
                        title="Copy full URL"
                      >
                        {copiedId === req.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Block Statistics Dashboard */}
      {activeTab === "analytics" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 w-full">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[var(--forge-text-muted)]">
                <span className="text-[10px] uppercase font-bold tracking-wider">Total Blocked</span>
                <Ban size={15} className="text-red-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-red-400">{totalBlocked}</span>
                <span className="text-[10px] text-[var(--forge-text-muted)] font-mono">({blockPercent}% of traffic)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[var(--forge-text-muted)]">
                <span className="text-[10px] uppercase font-bold tracking-wider">Bandwidth Saved</span>
                <HardDrive size={15} className="text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-cyan-400">
                  {formatBytes(detailedStats?.estimatedBandwidthSavedBytes ?? 0)}
                </span>
                <span className="text-[10px] text-[var(--forge-text-muted)]">saved</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[var(--forge-text-muted)]">
                <span className="text-[10px] uppercase font-bold tracking-wider">Estimated Time Saved</span>
                <Clock size={15} className="text-purple-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-purple-400">
                  {((detailedStats?.estimatedTimeSavedMs ?? 0) / 1000).toFixed(2)}s
                </span>
                <span className="text-[10px] text-[var(--forge-text-muted)]">network latency</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[var(--forge-text-muted)]">
                <span className="text-[10px] uppercase font-bold tracking-wider">Filter Rules</span>
                <CheckCircle2 size={15} className="text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-emerald-400">{stats?.totalRules ?? 0}</span>
                <span className="text-[10px] text-[var(--forge-text-muted)]">across {stats?.totalLists ?? 0} lists</span>
              </div>
            </div>
          </div>

          {/* Category Breakdown & Progress Bars */}
          <div className="p-4 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] space-y-3">
            <span className="text-xs font-bold text-[var(--forge-text)] flex items-center gap-1.5">
              <BarChart3 size={14} className="text-[#FF6B00]" />
              Threat & Blocking Categories Breakdown
            </span>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--forge-text-muted)]">Ads & Banners</span>
                  <Ban size={12} className="text-red-400" />
                </div>
                <span className="text-lg font-black font-mono text-red-400 mt-1">
                  {detailedStats?.byCategory.ad ?? 0}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--forge-text-muted)]">Trackers & Telemetry</span>
                  <EyeOff size={12} className="text-amber-400" />
                </div>
                <span className="text-lg font-black font-mono text-amber-400 mt-1">
                  {detailedStats?.byCategory.tracker ?? 0}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--forge-text-muted)]">Malvertising & Exploits</span>
                  <Skull size={12} className="text-rose-400" />
                </div>
                <span className="text-lg font-black font-mono text-rose-400 mt-1">
                  {detailedStats?.byCategory.malvertising ?? 0}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--forge-text-muted)]">Custom User Rules</span>
                  <FileCode2 size={12} className="text-blue-400" />
                </div>
                <span className="text-lg font-black font-mono text-blue-400 mt-1">
                  {detailedStats?.byCategory.custom ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Top Blocked Domains Table */}
          <div className="p-4 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] space-y-3">
            <span className="text-xs font-bold text-[var(--forge-text)] flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-[#FF6B00]" />
              Top Blocked Domains
            </span>

            {(!detailedStats?.topDomains || detailedStats.topDomains.length === 0) ? (
              <p className="text-[10px] text-[var(--forge-text-muted)] italic">
                No domain blocks logged yet in this session.
              </p>
            ) : (
              <div className="border border-[var(--forge-border)] rounded-lg overflow-hidden divide-y divide-[var(--forge-border)]/50 font-mono text-[10px]">
                <div className="grid grid-cols-12 px-3 py-1.5 bg-[var(--forge-input)] font-bold text-[var(--forge-text-muted)] text-[9px] uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-6">Domain</div>
                  <div className="col-span-3">Category</div>
                  <div className="col-span-2 text-right">Blocked</div>
                </div>
                {detailedStats.topDomains.map((item, idx) => (
                  <div key={item.domain} className="grid grid-cols-12 px-3 py-1.5 items-center hover:bg-[var(--forge-hover)]">
                    <div className="col-span-1 text-[var(--forge-text-muted)]">{idx + 1}</div>
                    <div className="col-span-6 font-bold text-[var(--forge-text)] truncate" title={item.domain}>
                      {item.domain}
                    </div>
                    <div className="col-span-3">
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-[var(--forge-input)] text-[var(--forge-text-muted)] border border-[var(--forge-border)]">
                        {item.category}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-bold text-red-400">{item.count}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Custom Rules Manager */}
      {activeTab === "custom_rules" && (
        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4 w-full">
          {/* Rules Action Bar */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--forge-text)] flex items-center gap-1.5">
                <FileCode2 size={14} className="text-[#FF6B00]" />
                User-Defined Filter Rules ({customRules.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddRuleModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#FF6B00] hover:bg-[#e05e00] text-white text-[10px] font-bold transition-colors cursor-pointer"
              >
                <Plus size={12} />
                <span>Add Rule</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text)] border border-[var(--forge-border)] text-[10px] font-bold transition-colors cursor-pointer"
              >
                <Upload size={12} />
                <span>Import</span>
              </button>
              <button
                onClick={handleExportClick}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text)] border border-[var(--forge-border)] text-[10px] font-bold transition-colors cursor-pointer"
              >
                <Download size={12} />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Add Rule Modal Form */}
          {showAddRuleModal && (
            <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[#FF6B00]/40 flex flex-col gap-2 shrink-0 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--forge-text)]">
                <span>Add Rule (Adblock Plus / EasyList Syntax)</span>
                <button onClick={() => setShowAddRuleModal(false)} className="text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] cursor-pointer">
                  &times;
                </button>
              </div>

              <form onSubmit={handleAddRuleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. ||bad-ads.com^ or @@||allow-me.com^ or ||tracker.io^$script"
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  className="flex-1 bg-[var(--forge-input)] border border-[var(--forge-border)] px-3 py-1.5 rounded font-mono text-[11px] text-[var(--forge-text)] outline-none focus:border-[#FF6B00]"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Save Rule
                </button>
              </form>
              <span className="text-[9px] text-[var(--forge-text-muted)]">
                Syntax examples: <code className="text-[#FF6B00]">||example.com^</code> blocks domain, <code className="text-emerald-400">@@||example.com^</code> allowlists domain.
              </span>
            </div>
          )}

          {/* Import Rules Modal */}
          {showImportModal && (
            <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col gap-2 shrink-0 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--forge-text)]">
                <span>Import Filter Rules (Paste One Rule Per Line)</span>
                <button onClick={() => setShowImportModal(false)} className="text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] cursor-pointer">
                  &times;
                </button>
              </div>

              <textarea
                rows={4}
                placeholder="||example.com^&#10;||tracker.net^&#10;@@||allowed-cdn.org^"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full bg-[var(--forge-input)] border border-[var(--forge-border)] p-2 rounded font-mono text-[10px] text-[var(--forge-text)] outline-none focus:border-[#FF6B00]"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1 rounded text-[10px] text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  className="px-4 py-1 bg-[#FF6B00] hover:bg-[#e05e00] text-white rounded text-[10px] font-bold cursor-pointer"
                >
                  Import All Rules
                </button>
              </div>
            </div>
          )}

          {/* Custom Rules List */}
          <div className="flex-1 overflow-y-auto border border-[var(--forge-border)] rounded-xl bg-[var(--forge-surface-elevated)] divide-y divide-[var(--forge-border)]/40 font-mono text-[10px]">
            {customRules.length === 0 ? (
              <div className="p-8 text-center text-[var(--forge-text-muted)] italic space-y-1">
                <p className="font-semibold text-[var(--forge-text)]">No custom rules created.</p>
                <p className="text-[10px] opacity-75">Click "Add Rule" or "Import" to define domain filters or allowlist exemptions.</p>
              </div>
            ) : (
              customRules.map((rule) => {
                const isEnabled = rule.enabled !== false;
                const isException = rule.type === "exception" || rule.raw.startsWith("@@");

                return (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between px-3 py-2 transition-colors hover:bg-[var(--forge-hover)] ${
                      !isEnabled ? "opacity-50 line-through" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 pr-3">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                          isException
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {isException ? "Exception" : "Block"}
                      </span>
                      <code className="text-[11px] font-bold text-[var(--forge-text)] truncate">{rule.raw}</code>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle switch */}
                      <button
                        onClick={() => toggleCustomRule(rule.id, !isEnabled)}
                        className={`p-1 rounded cursor-pointer transition-colors ${
                          isEnabled ? "text-emerald-400 hover:bg-emerald-500/15" : "text-[var(--forge-text-muted)] hover:bg-[var(--forge-input)]"
                        }`}
                        title={isEnabled ? "Disable this rule" : "Enable this rule"}
                      >
                        <Power size={13} />
                      </button>

                      {/* Remove button */}
                      <button
                        onClick={() => removeUserRule(rule.id)}
                        className="p-1 text-[var(--forge-text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition-colors"
                        title="Delete custom rule"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
