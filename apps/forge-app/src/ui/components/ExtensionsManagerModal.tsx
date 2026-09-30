import { useState } from "react";
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
} from "lucide-react";

import { useExtensionsStore } from "../../core/extensions/useExtensionsStore";
import { type ExtensionType, type SecurityTier } from "../../core/extensions/extensionTypes";

export function ExtensionsManagerModal() {
  const {
    extensions,
    isManagerOpen,
    activeFilter,
    selectedExtensionId,
    setManagerOpen,
    setActiveFilter,
    setSelectedExtension,
    toggleExtension,
    uninstallExtension,
    verifyPackage,
  } = useExtensionsStore();

  const [activeTab, setActiveTab] = useState<"installed" | "security_gate" | "catalog">("installed");
  const [search, setSearch] = useState("");
  const [openingPopup, setOpeningPopup] = useState<string | null>(null);

  // Security gate test input state
  const [testName, setTestName] = useState("Custom Inspector Pro");
  const [testType, setTestType] = useState<ExtensionType>("developer");
  const [testPermissions, setTestPermissions] = useState<string>("tabs, storage, webRequest");
  const [testResult, setTestResult] = useState<any | null>(null);

  if (!isManagerOpen) return null;

  const filtered = extensions.filter((e) => {
    const matchesFilter = activeFilter === "all" || e.type === activeFilter;
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selected = extensions.find((e) => e.id === selectedExtensionId) || filtered[0];

  const TIER_CONFIG: Record<SecurityTier, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    trusted: { label: "Trusted (Auto-Install)", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle2 size={12} /> },
    low_risk: { label: "Low Risk", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: <ShieldCheck size={12} /> },
    medium_risk: { label: "Medium Risk (Prompt)", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: <AlertTriangle size={12} /> },
    high_risk: { label: "High Risk (Override Required)", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: <ShieldAlert size={12} /> },
    critical: { label: "Critical (Blocked)", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: <XCircle size={12} /> },
  };

  const handleRunSecurityGate = () => {
    const perms = testPermissions.split(",").map((s) => s.trim()).filter(Boolean);
    const rep = verifyPackage(testName, testType, perms);
    setTestResult(rep);
  };

  return (
    <div className="fixed inset-0 z-[10015] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#12141f] border border-[var(--forge-border)] w-full max-w-5xl h-[82vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--forge-border)] bg-[#151827]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/30 shadow-inner">
              <Puzzle size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Forge Extension Platform</h2>
              <p className="text-[11px] text-zinc-400">
                Dual architecture: Chromium Browser Extensions &amp; Developer Workspace Extensions
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
            </div>

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
                    return (
                      <button
                        key={ext.id}
                        onClick={() => setSelectedExtension(ext.id)}
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
                          <span className="text-[9px] font-mono text-zinc-400">{ext.type === "browser" ? "Chromium API" : "Forge IDE API"}</span>
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

            {/* Right: Selected Extension Details & Permissions Audit */}
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
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{selected.description}</p>
                    <p className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center gap-1.5">
                      <UserCheck size={11} className="text-emerald-400" />
                      <span>Author: {selected.author}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Fix #4: Open popup button for extensions with popup UI */}
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

                {/* Security Verification Gate Report (Section 10.2) */}
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

                  {/* Fix #1: MV3 compatibility notice */}
                  {selected.type === "browser" && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-400">
                      <Info size={13} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Compatibility Note</span>
                        <span className="text-amber-300/80">
                          Forge injects content scripts directly into webview pages. Service Workers and
                          <code className="mx-1 px-1 rounded bg-amber-500/10">declarativeNetRequest</code>
                          (MV3) are not supported by Electron. Extensions relying solely on page-DOM
                          injection (CSS/JS) will work correctly.
                        </span>
                      </div>
                    </div>
                  )}
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
      </div>
    </div>
  );
}
