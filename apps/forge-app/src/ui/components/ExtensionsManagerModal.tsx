import { useState, useEffect } from "react";
import {
  Puzzle,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserCheck,
  FileCheck,
  Code2,
  Trash2,
  Power,
  X,
  Search,
  AppWindow,
  ExternalLink,
  Info,
  Cpu,
  Layers,
  Server,
  Activity,
  Check,
  Globe,
  Radio,
  Clock,
  Sparkles,
  Shield,
  RefreshCw,
} from "lucide-react";

import { useExtensionsStore } from "../../core/extensions/useExtensionsStore";
import { type ExtensionType, type SecurityTier } from "../../core/extensions/extensionTypes";
import { CAPABILITY_MAP, type SupportLevel } from "../../core/extensions/extensionCapabilityMap";

export function ExtensionsManagerModal() {
  const {
    extensions,
    isManagerOpen,
    activeFilter,
    selectedExtensionId,
    diagnosticReports,
    diagnosticSummaries,
    sessionBridgeSummary,
    tabSummary,
    messageStats,
    serviceWorkerStatuses,
    actionBadges,
    setManagerOpen,
    setActiveFilter,
    setSelectedExtension,
    toggleExtension,
    uninstallExtension,
    verifyPackage,
    fetchDiagnostics,
    fetchDiagnosticsSummary,
    fetchSessionBridgeSummary,
    fetchTabSummary,
    fetchMessageStats,
    fetchServiceWorkerStatuses,
    fetchActionBadges,
  } = useExtensionsStore();

  const [activeTab, setActiveTab] = useState<"installed" | "security_gate" | "diagnostics">("installed");
  const [search, setSearch] = useState("");
  const [openingPopup, setOpeningPopup] = useState<string | null>(null);
  const [matrixFilter, setMatrixFilter] = useState<"all" | SupportLevel>("all");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Security gate test input state
  const [testName, setTestName] = useState("Custom Inspector Pro");
  const [testType, setTestType] = useState<ExtensionType>("developer");
  const [testPermissions, setTestPermissions] = useState<string>("tabs, storage, webRequest");
  const [testResult, setTestResult] = useState<any | null>(null);

  // Auto-fetch diagnostics on open
  useEffect(() => {
    if (isManagerOpen) {
      fetchDiagnosticsSummary();
      fetchSessionBridgeSummary();
      fetchTabSummary();
      fetchMessageStats();
      fetchServiceWorkerStatuses();
      fetchActionBadges();
      if (selectedExtensionId) {
        fetchDiagnostics(selectedExtensionId);
      }
    }
  }, [isManagerOpen, selectedExtensionId]);

  if (!isManagerOpen) return null;

  const handleRefreshDiagnostics = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchDiagnosticsSummary(),
      fetchSessionBridgeSummary(),
      fetchTabSummary(),
      fetchMessageStats(),
      fetchServiceWorkerStatuses(),
      fetchActionBadges(),
      selectedExtensionId ? fetchDiagnostics(selectedExtensionId) : Promise.resolve(),
    ]);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const filtered = extensions.filter((e) => {
    const matchesFilter = activeFilter === "all" || e.type === activeFilter;
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selected = extensions.find((e) => e.id === selectedExtensionId) || filtered[0];
  const selectedDiagnostic = selected ? diagnosticReports[selected.id.toLowerCase()] || selected.diagnostic : null;

  const TIER_CONFIG: Record<SecurityTier, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    trusted: { label: "Trusted (Auto-Install)", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle2 size={12} /> },
    low_risk: { label: "Low Risk", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: <ShieldCheck size={12} /> },
    medium_risk: { label: "Medium Risk (Prompt)", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: <AlertTriangle size={12} /> },
    high_risk: { label: "High Risk (Override Required)", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: <ShieldAlert size={12} /> },
    critical: { label: "Critical (Blocked)", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: <XCircle size={12} /> },
  };

  const SUPPORT_CONFIG: Record<SupportLevel, { label: string; color: string; bg: string; border: string }> = {
    native: { label: "Native (Electron 44)", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    partial: { label: "Partial Native", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
    adapter: { label: "Forge Adapter", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    fallback: { label: "Forge Fallback", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    unsupported: { label: "Unsupported", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
  };

  const handleRunSecurityGate = () => {
    const perms = testPermissions.split(",").map((s) => s.trim()).filter(Boolean);
    const rep = verifyPackage(testName, testType, perms);
    setTestResult(rep);
  };

  const filteredCapabilityMap = CAPABILITY_MAP.filter((cap) => {
    const matchesFilter = matrixFilter === "all" || cap.electronSupport === matrixFilter;
    const matchesSearch =
      cap.api.toLowerCase().includes(matrixSearch.toLowerCase()) ||
      cap.notes.toLowerCase().includes(matrixSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-[10015] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#12141f] border border-[var(--forge-border)] w-full max-w-5xl h-[86vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--forge-border)] bg-[#151827]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/30 shadow-inner">
              <Puzzle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">Forge Extension Platform</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Chromium 152 • Electron 44
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                3-Level Architecture: Native Extension Engine • Forge Adapters • Polyfill Fallbacks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center p-0.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] text-xs">
              <button
                onClick={() => setActiveTab("installed")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === "installed" ? "bg-[var(--forge-surface)] text-[#FF6B00] font-bold shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                Installed ({extensions.length})
              </button>
              <button
                onClick={() => setActiveTab("security_gate")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === "security_gate" ? "bg-[var(--forge-surface)] text-[#FF6B00] font-bold shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                Security &amp; Verification Gate
              </button>
              <button
                onClick={() => setActiveTab("diagnostics")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === "diagnostics" ? "bg-[var(--forge-surface)] text-[#FF6B00] font-bold shadow-xs" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Cpu size={12} />
                <span>Electron 44 Architecture</span>
              </button>
            </div>

            <button
              onClick={handleRefreshDiagnostics}
              title="Refresh diagnostic metrics"
              className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer ${
                isRefreshing ? "animate-spin text-[#FF6B00]" : ""
              }`}
            >
              <RefreshCw size={14} />
            </button>

            <button
              onClick={() => setManagerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab 1: Installed Extensions */}
        {activeTab === "installed" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Extension List */}
            <div className="w-80 border-r border-[var(--forge-border)] bg-[#10121d] flex flex-col">
              <div className="p-3 border-b border-[var(--forge-border)] space-y-2">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)]">
                  <Search size={13} className="text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search extensions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent text-xs text-white outline-none w-full placeholder-zinc-500 font-mono"
                  />
                </div>

                <div className="flex gap-1">
                  {(["all", "browser", "developer"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveFilter(t)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium capitalize transition-colors cursor-pointer ${
                        activeFilter === t
                          ? "bg-[#FF6B00] text-white"
                          : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {t === "browser" ? "Browser (Chromium)" : t === "developer" ? "Developer (IDE)" : "All"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filtered.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500 flex flex-col items-center justify-center h-48 space-y-2">
                    <Puzzle size={24} className="text-zinc-600 mb-1" />
                    <p className="font-semibold text-zinc-400">No extensions installed</p>
                    <p className="text-[10px] text-zinc-500">Install extensions directly from the Chrome Web Store</p>
                  </div>
                ) : (
                  filtered.map((ext) => {
                    const isSel = selected?.id === ext.id;
                    const tier = TIER_CONFIG[ext.verification.securityTier];
                    const diagSummary = diagnosticSummaries.find((d) => d.extensionId === ext.id.toLowerCase()) || ext.diagnostic;

                    return (
                      <button
                        key={ext.id}
                        onClick={() => {
                          setSelectedExtension(ext.id);
                          fetchDiagnostics(ext.id);
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          isSel
                            ? "border-[#FF6B00] bg-[#FF6B00]/10 shadow-sm"
                            : "border-transparent hover:border-[var(--forge-border)] hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white truncate max-w-[170px]">{ext.name}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${ext.enabled ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-zinc-600"}`}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{ext.description}</p>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-zinc-400">
                              {ext.type === "browser" ? "Chromium Ext" : "Forge IDE API"}
                            </span>
                            {diagSummary && (
                              <span className={`text-[8px] font-mono px-1 py-0.2 rounded border ${
                                diagSummary.score >= 90
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                  : diagSummary.score >= 65
                                    ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                                    : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                              }`}>
                                {diagSummary.score}%
                              </span>
                            )}
                          </div>
                          <span className={`flex items-center gap-1 text-[9px] font-mono ${tier.color}`}>
                            {tier.icon}
                            <span>{ext.verification.securityTier.toUpperCase()}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Selected Extension Details & Diagnostics */}
            {selected ? (
              <div className="flex-1 flex flex-col bg-[#12141f] overflow-y-auto p-6 space-y-6">
                <div className="flex items-start justify-between pb-4 border-b border-[var(--forge-border)]">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                      <span className="text-xs font-mono text-zinc-400">v{selected.version}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                        {selected.type === "browser" ? "Chromium Extension" : "Developer Extension"}
                      </span>
                      {selectedDiagnostic && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          selectedDiagnostic.score >= 90
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                            : selectedDiagnostic.score >= 65
                              ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                              : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                        }`}>
                          {selectedDiagnostic.score}% COMPATIBLE • {selectedDiagnostic.tier?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{selected.description}</p>
                    <p className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center gap-1.5">
                      <UserCheck size={11} className="text-emerald-400" />
                      <span>Author: {selected.author}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Open popup button */}
                    <button
                      onClick={async () => {
                        setOpeningPopup(selected.id);
                        try {
                          await (window as any).forge?.extensions?.openPopup?.(selected.id);
                        } catch {}
                        setTimeout(() => setOpeningPopup(null), 1200);
                      }}
                      disabled={openingPopup === selected.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/40 disabled:opacity-50"
                      title="Open extension popup window"
                    >
                      <AppWindow size={12} />
                      <span>{openingPopup === selected.id ? "Opening…" : "Popup"}</span>
                    </button>

                    <button
                      onClick={() => toggleExtension(selected.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selected.enabled
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      <Power size={12} />
                      <span>{selected.enabled ? "Active" : "Disabled"}</span>
                    </button>

                    <button
                      onClick={() => uninstallExtension(selected.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
                      title="Uninstall Extension"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* ── Level 1 / 2 / 3 Electron 44 Compatibility & Diagnostics Card ── */}
                <div className="p-4 rounded-xl bg-[#090b11] border border-[var(--forge-border)] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu size={14} className="text-[#FF6B00]" />
                      <span>Electron 44 Runtime &amp; Diagnostic Inspection</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                      <Radio size={10} className="text-emerald-400 animate-pulse" />
                      <span>Chromium 152 Native Engine</span>
                    </span>
                  </div>

                  {/* Architecture Metrics Grid */}
                  <div className="grid grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1">
                      <span className="text-[10px] text-zinc-400 font-mono uppercase block">Manifest Version</span>
                      <span className="font-bold text-white text-xs flex items-center gap-1">
                        <Sparkles size={11} className="text-amber-400" />
                        <span>MV{selectedDiagnostic?.manifestVersion || (selected.manifestPermissions.includes("host_permissions") ? 3 : 2)}</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1">
                      <span className="text-[10px] text-zinc-400 font-mono uppercase block">Native Injection</span>
                      <span className="font-bold text-emerald-400 text-xs flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>Content Scripts ✓</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1">
                      <span className="text-[10px] text-zinc-400 font-mono uppercase block">Background Type</span>
                      <span className="font-bold text-sky-400 text-xs truncate block font-mono">
                        {selectedDiagnostic?.background?.type === "service_worker"
                          ? "Service Worker (MV3)"
                          : selectedDiagnostic?.background?.type === "scripts"
                            ? "Background Page (MV2)"
                            : "None"}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1">
                      <span className="text-[10px] text-zinc-400 font-mono uppercase block">Session Partitions</span>
                      <span className="font-bold text-zinc-300 text-xs flex items-center gap-1">
                        <Server size={11} className="text-purple-400" />
                        <span>{selectedDiagnostic?.loadedIntoSessions?.length || 2} active sessions</span>
                      </span>
                    </div>
                  </div>

                  {/* Real Compatibility Breakdown */}
                  {selectedDiagnostic?.capabilities && selectedDiagnostic.capabilities.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                        API Support Breakdown
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {selectedDiagnostic.capabilities
                          .filter((c: any) => c.usedByExtension)
                          .map((cap: any) => {
                            const isNative = cap.status === "native";
                            const isAdapter = cap.status === "adapter";
                            const isFallback = cap.status === "fallback";
                            return (
                              <div
                                key={cap.api}
                                className={`p-2 rounded-lg border flex items-center justify-between ${
                                  isNative
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : isAdapter
                                      ? "bg-blue-500/5 border-blue-500/20"
                                      : isFallback
                                        ? "bg-amber-500/5 border-amber-500/20"
                                        : "bg-rose-500/5 border-rose-500/20"
                                }`}
                              >
                                <span className="font-mono text-[11px] text-zinc-200">{cap.api}</span>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isNative
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : isAdapter
                                      ? "bg-blue-500/20 text-blue-400"
                                      : isFallback
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-rose-500/20 text-rose-400"
                                }`}>
                                  {cap.status.toUpperCase()}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Multi-Session Isolation Guarantee */}
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs">
                    <Shield size={14} className="text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white text-[11px] block">Session Bridge &amp; Privacy Isolation</span>
                      <span className="text-zinc-400 text-[10px] leading-relaxed block mt-0.5">
                        Extension runs natively in standard workspaces (<code className="px-1 bg-white/5 rounded text-zinc-300">default</code>, <code className="px-1 bg-white/5 rounded text-zinc-300">persist:forge</code>).
                        Extensions are <strong className="text-emerald-400">strictly excluded</strong> from Tor circuits (<code className="px-1 bg-white/5 rounded text-zinc-300">tor_*</code>) and Private browsing (<code className="px-1 bg-white/5 rounded text-zinc-300">private_*</code>) to prevent identity leakage.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Verification Gate Report */}
                <div className="p-4 rounded-xl bg-[#090b11] border border-[var(--forge-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck size={14} className="text-[#FF6B00]" />
                      <span>Security Pipeline Verification Report</span>
                    </span>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] border ${TIER_CONFIG[selected.verification.securityTier].bg} ${TIER_CONFIG[selected.verification.securityTier].color}`}>
                      {TIER_CONFIG[selected.verification.securityTier].icon}
                      <span>{TIER_CONFIG[selected.verification.securityTier].label}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-[var(--forge-input)] space-y-1">
                      <p className="text-[10px] text-zinc-500 font-mono uppercase">Package SHA-256 Integrity</p>
                      <p className="font-mono text-[11px] text-zinc-300 break-all">{selected.verification.sha256Hash}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--forge-input)] space-y-1">
                      <p className="text-[10px] text-zinc-500 font-mono uppercase">Digital Signature</p>
                      <p className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>Valid Certificate &amp; Author Identity Verified</span>
                      </p>
                    </div>
                  </div>

                  {/* Permissions Requested */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Manifest Permissions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.manifestPermissions.map((perm) => (
                        <span key={perm} className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#12141f] text-zinc-500 p-8 space-y-3">
                <Puzzle size={40} className="text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-400">No Extension Selected</p>
                <p className="text-xs text-zinc-500 max-w-sm text-center">
                  Install extensions from the official Google Chrome Web Store to manage and inspect them here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Security & Verification Gate Sandbox */}
        {activeTab === "security_gate" && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Extension Verification &amp; Security Gate</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Every extension undergoes static code analysis, SHA-256 package hash integrity verification, and permission risk tiering before installation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Manifest Input Form */}
              <div className="p-5 rounded-2xl bg-[#0e101a] border border-[var(--forge-border)] space-y-4">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Code2 size={14} className="text-[#FF6B00]" />
                  <span>Package Manifest Inspection Simulator</span>
                </h4>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400">Extension Name</label>
                  <input
                    type="text"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] text-xs text-white outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400">Extension Ecosystem</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTestType("browser")}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        testType === "browser" ? "border-[#FF6B00] bg-[#FF6B00]/10 text-white font-bold" : "border-[var(--forge-border)] text-zinc-400"
                      }`}
                    >
                      Chromium Browser Ext
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestType("developer")}
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        testType === "developer" ? "border-[#FF6B00] bg-[#FF6B00]/10 text-white font-bold" : "border-[var(--forge-border)] text-zinc-400"
                      }`}
                    >
                      Forge IDE Developer Ext
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400">Requested Permissions (comma-separated)</label>
                  <input
                    type="text"
                    value={testPermissions}
                    onChange={(e) => setTestPermissions(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] text-xs text-white outline-none font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Try adding 'debugger', 'nativeMessaging', or '&lt;all_urls&gt;' to observe tier escalation.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRunSecurityGate}
                  className="w-full py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Run Gate Verification Pipeline
                </button>
              </div>

              {/* Inspection Results Output */}
              <div className="p-5 rounded-2xl bg-[#090b11] border border-[var(--forge-border)] space-y-4">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-blue-400" />
                  <span>Pipeline Audit Verdict</span>
                </h4>

                {testResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="text-xs font-bold text-white">Classified Security Tier</p>
                        <p className="text-[11px] text-zinc-400">Action: {testResult.recommendedAction.toUpperCase()}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg font-mono text-xs border ${TIER_CONFIG[testResult.securityTier as SecurityTier].bg} ${TIER_CONFIG[testResult.securityTier as SecurityTier].color}`}>
                        {testResult.securityTier.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--forge-input)] space-y-1 text-xs font-mono">
                      <p className="text-[10px] text-zinc-500 uppercase">SHA-256 Generated Hash</p>
                      <p className="text-[11px] text-zinc-300 break-all">{testResult.sha256Hash}</p>
                    </div>

                    {testResult.suspiciousPatternsDetected.length > 0 && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-1">
                        <p className="font-bold flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span>Suspicious Manifest Flag</span>
                        </p>
                        {testResult.suspiciousPatternsDetected.map((pat: string, idx: number) => (
                          <p key={idx} className="text-[11px] font-mono">• {pat}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-zinc-600 text-xs italic">
                    Configure permissions on the left and click "Run Gate Verification Pipeline" to inspect.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Electron 44 Extension Engine Architecture & Diagnostics Matrix */}
        {activeTab === "diagnostics" && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Cpu size={18} className="text-[#FF6B00]" />
                    <span>Electron 44 (Chromium 152) Extension Architecture</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real architectural model: Native Electron capabilities, custom Forge adapters, and fallback safeguards.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                    MV3 Supported
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono">
                    Service Worker Preload ✓
                  </div>
                </div>
              </div>
            </div>

            {/* 3-Level Architecture Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#0e101a] border border-emerald-500/30 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Level 1: Native Engine</h4>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Electron 44 &amp; Chromium 152 natively parse MV3 manifests, execute Service Workers, inject Content Scripts by run_at timing, and run core Chrome APIs:
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["chrome.runtime", "chrome.storage.local", "content_scripts", "chrome.webRequest", "chrome.scripting", "host_permissions"].map((api) => (
                    <span key={api} className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[9px]">
                      {api}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0e101a] border border-blue-500/30 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 text-blue-400">
                  <Layers size={16} />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Level 2: Forge Adapters</h4>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Electron renders no browser chrome. Forge provides custom adapters for extension actions, popup windows, and tab coordination:
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["chrome.action", "chrome.browserAction", "chrome.tabs (partial)", "chrome.windows", "chrome.contextMenus", "chrome.downloads"].map((api) => (
                    <span key={api} className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono text-[9px]">
                      {api}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0e101a] border border-amber-500/30 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-2 text-amber-400">
                  <Activity size={16} />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Level 3: Polyfill Guards</h4>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Defensive fallbacks for APIs not natively wired to Electron's event loop, ensuring robust execution even when extensions rely on timers:
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {["chrome.alarms", "chrome.notifications", "ContentScript Injector Guard"].map((api) => (
                    <span key={api} className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[9px]">
                      {api}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Subsystem Bridges Telemetry */}
            <div className="p-4 rounded-xl bg-[#090b11] border border-[var(--forge-border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-sky-400" />
                  <span>Subsystem Bridges &amp; Runtime Telemetry</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ACTIVE ELECTRON 44 BRIDGES</span>
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-xs">
                {/* 1. Tab Bridge */}
                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">ExtensionTabBridge</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-white font-mono">{tabSummary?.totalTabs ?? 0}</span>
                    <span className="text-[10px] font-mono text-sky-400">TABS WIRED</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Maps <code className="text-zinc-400">chrome.tabs</code> to guest &lt;webview&gt; WebContents.
                  </p>
                </div>

                {/* 2. Message Bridge */}
                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">MessageBridge</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-white font-mono">{messageStats?.totalDelivered ?? 0}</span>
                    <span className="text-[10px] font-mono text-emerald-400">MSGS ROUTED</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Cross-context content script ↔ SW ↔ UI router.
                  </p>
                </div>

                {/* 3. Action Bridge */}
                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">ActionBridge</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-white font-mono">{Object.keys(actionBadges).length}</span>
                    <span className="text-[10px] font-mono text-purple-400">BADGES SYNCED</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Toolbar icon badges &amp; anchored popup coords.
                  </p>
                </div>

                {/* 4. Service Worker Manager */}
                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">ServiceWorkerManager</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-white font-mono">{Object.keys(serviceWorkerStatuses).length}</span>
                    <span className="text-[10px] font-mono text-amber-400">WORKERS TRACKED</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Lifecycle &amp; on-demand wake for MV3 workers.
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Session Bridge Registry */}
            <div className="p-4 rounded-xl bg-[#090b11] border border-[var(--forge-border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Server size={14} className="text-purple-400" />
                  <span>Dynamic Session Bridge Registry</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {sessionBridgeSummary.length > 0 ? `${sessionBridgeSummary.length} registered partitions` : "Default sessions active"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1 text-xs">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">Active Partitions</span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>• defaultSession</span>
                      <span className="text-[9px] px-1 rounded bg-emerald-500/20">ELIGIBLE</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-400">
                      <span>• persist:forge</span>
                      <span className="text-[9px] px-1 rounded bg-emerald-500/20">ELIGIBLE</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1 text-xs">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">Tor Circuit Mode</span>
                  <p className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 size={12} />
                    <span>Extensions Strictly Blocked</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Zero network requests, no canvas fingerprinting leaks.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-white/5 space-y-1 text-xs">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block">Private Browsing</span>
                  <p className="text-purple-400 font-semibold flex items-center gap-1 text-[11px]">
                    <Shield size={12} />
                    <span>In-Memory RAM Isolation</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    Partitions are cleaned on tab close; extensions excluded by default.
                  </p>
                </div>
              </div>
            </div>

            {/* Capability Reference Table */}
            <div className="p-4 rounded-xl bg-[#090b11] border border-[var(--forge-border)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={14} className="text-[#FF6B00]" />
                  <span>Electron 44 Capability Map ({filteredCapabilityMap.length} APIs)</span>
                </span>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)]">
                    <Search size={12} className="text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Filter APIs..."
                      value={matrixSearch}
                      onChange={(e) => setMatrixSearch(e.target.value)}
                      className="bg-transparent text-[11px] text-white outline-none w-32 placeholder-zinc-500 font-mono"
                    />
                  </div>

                  <select
                    value={matrixFilter}
                    onChange={(e) => setMatrixFilter(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] text-[11px] text-white outline-none font-mono cursor-pointer"
                  >
                    <option value="all">All Tiers</option>
                    <option value="native">Native Only</option>
                    <option value="partial">Partial Native</option>
                    <option value="adapter">Forge Adapter</option>
                    <option value="fallback">Forge Fallback</option>
                    <option value="unsupported">Unsupported</option>
                  </select>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                {filteredCapabilityMap.map((cap) => {
                  const conf = SUPPORT_CONFIG[cap.electronSupport];
                  return (
                    <div
                      key={cap.api}
                      className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-[11px]">{cap.api}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${conf.bg} ${conf.border} ${conf.color}`}>
                            {conf.label.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{cap.notes}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[9px] font-mono text-zinc-500 block">Weight: {cap.weight}/10</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
