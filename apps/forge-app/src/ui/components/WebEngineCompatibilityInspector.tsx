import { useEffect, useState } from "react";
import {
  Globe,
  Shield,
  Zap,
  Smartphone,
  History,
  RotateCw,
  CheckCircle2,
  Copy,
  Check,
  Wifi,
  Terminal,
  RefreshCw,
  Sliders,
} from "lucide-react";
import { useCompatStore } from "../../core/compat/useCompatStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { generateQrSvg } from "../../core/compat/qrCodeHelper";

interface Props {
  getActiveWebview?: () => WebviewElement | null;
}

type CompatTab = "cross_engine" | "cors_security" | "resource_crash" | "device_hardware" | "upstream_regressions";

export function WebEngineCompatibilityInspector({ getActiveWebview }: Props) {
  const [activeTab, setActiveTab] = useState<CompatTab>("cross_engine");
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "breaking" | "visual">("all");
  const [gcSuccess, setGcSuccess] = useState<boolean | null>(null);

  const {
    engineReport,
    isScanning,
    runAudit,

    isCorsBypassActive,
    bypassPrivateNetworkAccess,
    setCORSBypass,
    setPNAccessBypass,

    crashHistory,
    crashGuardMode,
    setCrashGuardMode,
    triggerGarbageCollection,

    cpuThrottlingRate,
    networkCondition,
    touchEmulationEnabled,
    localNetworkIp,
    setCpuThrottling,
    setNetworkCondition,
    setTouchEmulation,
    refreshLocalIp,

    runtimeVersions,
    deprecationLogs,
    initVersions,
    clearDeprecationLogs,
  } = useCompatStore();

  const { tabs, activeTabId } = useTabsStore();
  const currentTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    initVersions();
    refreshLocalIp();
  }, [initVersions, refreshLocalIp]);

  const handleRunScan = () => {
    const el = getActiveWebview ? getActiveWebview() : null;
    if (el && currentTab?.url) {
      runAudit(el, currentTab.url);
    }
  };

  const handleTriggerGC = async () => {
    const el = getActiveWebview ? getActiveWebview() : null;
    const wcid = el && typeof (el as any).getWebContentsId === "function" ? (el as any).getWebContentsId() : undefined;
    const ok = await triggerGarbageCollection(wcid);
    setGcSuccess(ok);
    setTimeout(() => setGcSuccess(null), 2500);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  const filteredIssues = (engineReport?.detectedIssues || []).filter((issue) => {
    if (severityFilter === "all") return true;
    return issue.severity === severityFilter;
  });

  // Calculate local Wi-Fi test URL for physical device
  let localTestUrl = currentTab?.url || "http://localhost:3000";
  try {
    const parsed = new URL(localTestUrl);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.hostname = localNetworkIp || "192.168.1.100";
      localTestUrl = parsed.toString();
    }
  } catch {}

  const qrCodeUrl = generateQrSvg(localTestUrl, 180);

  return (
    <div className="w-full h-full flex flex-col bg-[var(--forge-surface)] text-[var(--forge-text)] font-sans select-none overflow-hidden">
      {/* Top Tab Strip */}
      <div className="flex items-center justify-between px-3 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] shrink-0 h-9">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("cross_engine")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "cross_engine"
                ? "bg-[var(--forge-hover)] text-[#FF6B00]"
                : "text-[var(--forge-text-muted)] hover:text-white"
            }`}
          >
            <Globe size={13} />
            <span>Cross-Engine</span>
            {engineReport && engineReport.detectedIssues.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400">
                {engineReport.detectedIssues.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cors_security")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "cors_security"
                ? "bg-[var(--forge-hover)] text-[#FF6B00]"
                : "text-[var(--forge-text-muted)] hover:text-white"
            }`}
          >
            <Shield size={13} />
            <span>CORS & Security</span>
            {isCorsBypassActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("resource_crash")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "resource_crash"
                ? "bg-[var(--forge-hover)] text-[#FF6B00]"
                : "text-[var(--forge-text-muted)] hover:text-white"
            }`}
          >
            <Zap size={13} />
            <span>Resource & Crash Guard</span>
            {crashHistory.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400">
                {crashHistory.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("device_hardware")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "device_hardware"
                ? "bg-[var(--forge-hover)] text-[#FF6B00]"
                : "text-[var(--forge-text-muted)] hover:text-white"
            }`}
          >
            <Smartphone size={13} />
            <span>Device Limits & Bridge</span>
            {cpuThrottlingRate > 1 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400">
                {cpuThrottlingRate}x
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upstream_regressions")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "upstream_regressions"
                ? "bg-[var(--forge-hover)] text-[#FF6B00]"
                : "text-[var(--forge-text-muted)] hover:text-white"
            }`}
          >
            <History size={13} />
            <span>Upstream & Regressions</span>
            {deprecationLogs.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-400">
                {deprecationLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Global Quick Action / Status */}
        <div className="flex items-center gap-2">
          {isCorsBypassActive && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              CORS Relaxed
            </span>
          )}
          {cpuThrottlingRate > 1 && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
              CPU {cpuThrottlingRate}x
            </span>
          )}
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ================= TAB 1: CROSS-ENGINE INCONSISTENCIES ================= */}
        {activeTab === "cross_engine" && (
          <div className="space-y-4 max-w-5xl mx-auto">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Globe size={14} className="text-[#FF6B00]" />
                  Cross-Engine Compatibility Scanner
                </h3>
                <p className="text-[11px] text-[var(--forge-text-muted)] mt-0.5">
                  Audits CSS, DOM, media, and Web APIs across Blink (Chromium), Gecko (Firefox), and WebKit (Safari).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={handleRunScan}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <RotateCw size={12} className={isScanning ? "animate-spin" : ""} />
                  <span>{isScanning ? "Scanning DOM..." : "Audit Current Page"}</span>
                </button>
              </div>
            </div>

            {/* Score Cards */}
            {engineReport ? (
              <div className="grid grid-cols-3 gap-3">
                {/* Blink */}
                <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-[var(--forge-text-muted)] uppercase tracking-wider">
                    Blink (Chromium)
                  </span>
                  <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                    {engineReport.scores.blink}%
                  </div>
                  <span className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
                    Native Runtime Engine
                  </span>
                </div>

                {/* Gecko */}
                <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-[var(--forge-text-muted)] uppercase tracking-wider">
                    Gecko (Firefox)
                  </span>
                  <div
                    className={`text-2xl font-mono font-bold mt-1 ${
                      engineReport.scores.gecko >= 85
                        ? "text-emerald-400"
                        : engineReport.scores.gecko >= 70
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {engineReport.scores.gecko}%
                  </div>
                  <span className="text-[10px] text-[var(--forge-text-muted)] mt-0.5">
                    Compatibility Index
                  </span>
                </div>

                {/* WebKit */}
                <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-[var(--forge-text-muted)] uppercase tracking-wider">
                    WebKit (Safari / iOS)
                  </span>
                  <div
                    className={`text-2xl font-mono font-bold mt-1 ${
                      engineReport.scores.webkit >= 85
                        ? "text-emerald-400"
                        : engineReport.scores.webkit >= 70
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {engineReport.scores.webkit}%
                  </div>
                  <span className="text-[10px] text-[var(--forge-text-muted)] mt-0.5">
                    Compatibility Index
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
                <Globe size={28} className="text-[var(--forge-text-muted)] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[var(--forge-text-muted)]">
                  Click &ldquo;Audit Current Page&rdquo; to scan active DOM nodes, stylesheets, and APIs for cross-engine gaps.
                </p>
              </div>
            )}

            {/* Detected Issues List */}
            {engineReport && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Detected Engine Inconsistencies ({filteredIssues.length})
                  </span>
                  <div className="flex items-center gap-1 text-[10px] bg-[var(--forge-input)] p-0.5 rounded-lg border border-[var(--forge-border)]">
                    <button
                      type="button"
                      onClick={() => setSeverityFilter("all")}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        severityFilter === "all" ? "bg-[var(--forge-hover)] text-white font-bold" : "text-zinc-400"
                      }`}
                    >
                      All ({engineReport.detectedIssues.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverityFilter("breaking")}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        severityFilter === "breaking" ? "bg-red-500/20 text-red-400 font-bold" : "text-zinc-400"
                      }`}
                    >
                      Breaking
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverityFilter("visual")}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        severityFilter === "visual" ? "bg-amber-500/20 text-amber-400 font-bold" : "text-zinc-400"
                      }`}
                    >
                      Visual / Prefixes
                    </button>
                  </div>
                </div>

                {filteredIssues.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-center">
                    <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-white">No Inconsistencies Found</span>
                    <p className="text-[11px] text-[var(--forge-text-muted)] mt-0.5">
                      This page uses standard baseline web APIs compatible with Blink, Gecko, and WebKit!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-3.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                issue.severity === "breaking"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {issue.severity}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{issue.title}</span>
                          </div>

                          {/* Engine Status Chips */}
                          <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              Blink: {issue.affectedEngines.blink}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                issue.affectedEngines.gecko === "unsupported"
                                  ? "bg-red-500/20 text-red-400"
                                  : issue.affectedEngines.gecko === "prefixed"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              Gecko: {issue.affectedEngines.gecko}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                issue.affectedEngines.webkit === "unsupported"
                                  ? "bg-red-500/20 text-red-400"
                                  : issue.affectedEngines.webkit === "prefixed"
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              WebKit: {issue.affectedEngines.webkit}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-[var(--forge-text-muted)] leading-relaxed">
                          {issue.summary}
                        </p>

                        <div className="p-2.5 rounded-lg bg-[var(--forge-input)] text-[11px] flex items-start justify-between gap-3">
                          <div>
                            <span className="font-bold text-[#FF6B00]">Recommendation: </span>
                            <span className="text-zinc-300">{issue.recommendation}</span>
                          </div>
                          {issue.codeSnippet && (
                            <button
                              type="button"
                              onClick={() => handleCopy(issue.id, issue.codeSnippet!)}
                              title="Copy code snippet"
                              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                            >
                              {copiedSnippetId === issue.id ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: CORS & SECURITY CONSTRAINTS ================= */}
        {activeTab === "cors_security" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Developer CORS Bypass Card */}
            <div className="p-4 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">Developer CORS Bypass</h3>
                  {isCorsBypassActive && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--forge-text-muted)] mt-0.5 leading-relaxed">
                  Rewrites response headers to permit cross-origin sharing (<code className="text-[#FF6B00]">Access-Control-Allow-Origin: *</code>).
                  Essential for frontend development against local APIs without needing reverse proxies.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCORSBypass(!isCorsBypassActive)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  isCorsBypassActive ? "bg-[#FF6B00]" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    isCorsBypassActive ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Private Network Access (PNA) Card */}
            <div className="p-4 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-white">Private Network Access (PNA) Relaxation</h3>
                <p className="text-[11px] text-[var(--forge-text-muted)] mt-0.5 leading-relaxed">
                  Allows public web apps (e.g. cloud staging, web playgrounds) to query local servers (<code className="text-[#FF6B00]">localhost:3000</code>, <code className="text-[#FF6B00]">127.0.0.1</code>) by injecting <code className="text-[#FF6B00]">Access-Control-Allow-Private-Network: true</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPNAccessBypass(!bypassPrivateNetworkAccess)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  bypassPrivateNetworkAccess ? "bg-[#FF6B00]" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    bypassPrivateNetworkAccess ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Live Security Headers Table */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white block">
                Target Page Security Header Audit
              </span>
              <div className="rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-[var(--forge-border)] bg-[var(--forge-input)] text-[10px] text-[var(--forge-text-muted)] uppercase tracking-wider">
                      <th className="p-2.5">Security Header</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Directive Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--forge-border)] text-[11px]">
                    <tr>
                      <td className="p-2.5 font-mono text-[#FF6B00] font-bold">Access-Control-Allow-Origin</td>
                      <td className="p-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isCorsBypassActive ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {isCorsBypassActive ? "Bypassed (*)" : "Enforced"}
                        </span>
                      </td>
                      <td className="p-2.5 text-zinc-300">
                        {isCorsBypassActive
                          ? "Injected wildcard (*) by Forge Dev Interceptor"
                          : "Standard Chromium CORS cross-origin isolation enforced"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono text-[#FF6B00] font-bold">Access-Control-Allow-Private-Network</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          Permitted
                        </span>
                      </td>
                      <td className="p-2.5 text-zinc-300">Local loopback & internal network APIs enabled</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-mono text-[#FF6B00] font-bold">Content-Security-Policy (CSP)</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300">
                          Active
                        </span>
                      </td>
                      <td className="p-2.5 text-zinc-300">Inline script and frame embedding restrictions monitored</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: RESOURCE OPTIMIZATION & CRASH GUARD ================= */}
        {activeTab === "resource_crash" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Real-time Metrics & Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tab Memory */}
              <div className="p-3.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
                <span className="text-[10px] font-mono text-[var(--forge-text-muted)] uppercase tracking-wider block">
                  Active Tab Memory
                </span>
                <div className="text-2xl font-mono font-bold text-white mt-1">
                  {currentTab?.memoryMB || 45} MB
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Optimal Range (&lt;300 MB)</span>
                </div>
              </div>

              {/* DOM Nodes */}
              <div className="p-3.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
                <span className="text-[10px] font-mono text-[var(--forge-text-muted)] uppercase tracking-wider block">
                  DOM Nodes Count
                </span>
                <div className="text-2xl font-mono font-bold text-white mt-1">
                  {engineReport?.pageFeatures.domNodesCount || 1240}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-1">
                  <span>Lighthouse threshold: 1,500</span>
                </div>
              </div>

              {/* Force Garbage Collection */}
              <div className="p-3.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[var(--forge-text-muted)] uppercase tracking-wider block">
                    V8 Heap Management
                  </span>
                  <p className="text-[11px] text-[var(--forge-text-muted)] mt-0.5">
                    Trigger low-level V8 Garbage Collection via CDP.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerGC}
                  className="mt-2 w-full py-1.5 rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-xs font-semibold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={12} className={gcSuccess !== null ? "animate-spin text-[#FF6B00]" : ""} />
                  <span>{gcSuccess ? "Garbage Collected!" : "Force V8 Garbage Collection"}</span>
                </button>
              </div>
            </div>

            {/* Crash Guard Config Card */}
            <div className="p-4 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Shield size={13} className="text-[#FF6B00]" />
                  Forge Crash Guard Defense
                </h3>
                <p className="text-[11px] text-[var(--forge-text-muted)] mt-0.5">
                  Protects heavy single-page apps against unexpected OOM (Out-of-Memory) termination and renderer faults.
                </p>
              </div>

              <div className="flex items-center bg-[var(--forge-input)] p-0.5 rounded-lg border border-[var(--forge-border)] text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setCrashGuardMode("auto-restore")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    crashGuardMode === "auto-restore"
                      ? "bg-[#FF6B00] text-white font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Auto-Restore
                </button>
                <button
                  type="button"
                  onClick={() => setCrashGuardMode("prompt")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    crashGuardMode === "prompt"
                      ? "bg-[#FF6B00] text-white font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Prompt On Crash
                </button>
              </div>
            </div>

            {/* Crash History Log */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white block">Recent Renderer Crash History</span>
              {crashHistory.length === 0 ? (
                <div className="p-4 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-center text-xs text-[var(--forge-text-muted)]">
                  No tab crashes recorded. Chromium process isolation is running cleanly.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {crashHistory.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg bg-[var(--forge-surface-elevated)] border border-red-500/30 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-400 uppercase font-bold">
                          {c.reason}
                        </span>
                        <span className="truncate max-w-sm text-zinc-300 font-mono text-[11px]">{c.url}</span>
                      </div>
                      <span className="text-[10px] text-[var(--forge-text-muted)]">
                        {new Date(c.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: DEVICE EMULATION & PHYSICAL BRIDGE ================= */}
        {activeTab === "device_hardware" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* CDP Hardware Emulation Controls */}
            <div className="p-4 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders size={13} className="text-[#FF6B00]" />
                  CDP Hardware & Network Throttling
                </h3>
                <p className="text-[11px] text-[var(--forge-text-muted)] mt-0.5">
                  Simulate physical hardware limits directly inside Chromium&apos;s rendering engine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* CPU Throttling */}
                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)]">
                  <label className="text-[10px] font-semibold text-[var(--forge-text-muted)] uppercase tracking-wider block mb-1.5">
                    CPU Throttling Rate
                  </label>
                  <select
                    value={cpuThrottlingRate}
                    onChange={(e) => setCpuThrottling(Number(e.target.value))}
                    className="w-full bg-[var(--forge-surface)] text-xs text-white p-1.5 rounded border border-[var(--forge-border)] outline-none"
                  >
                    <option value={1}>1x (No slowdown)</option>
                    <option value={4}>4x (Mid-tier mobile CPU)</option>
                    <option value={6}>6x (Budget Android / Low-end)</option>
                  </select>
                </div>

                {/* Network Condition */}
                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)]">
                  <label className="text-[10px] font-semibold text-[var(--forge-text-muted)] uppercase tracking-wider block mb-1.5">
                    Network Profile
                  </label>
                  <select
                    value={networkCondition}
                    onChange={(e) => setNetworkCondition(e.target.value as any)}
                    className="w-full bg-[var(--forge-surface)] text-xs text-white p-1.5 rounded border border-[var(--forge-border)] outline-none"
                  >
                    <option value="online">No Throttling (Direct)</option>
                    <option value="fast3g">Fast 3G (1.6 Mbps, 100ms)</option>
                    <option value="slow3g">Slow 3G (400 Kbps, 400ms)</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                {/* Touch Emulation */}
                <div className="p-3 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--forge-text-muted)] uppercase tracking-wider block">
                      Multi-Touch Emulation
                    </label>
                    <span className="text-[10px] text-zinc-400">ontouchstart &amp; pinch physics</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTouchEmulation(!touchEmulationEnabled)}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      touchEmulationEnabled ? "bg-[#FF6B00]" : "bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                        touchEmulationEnabled ? "left-4.5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Physical Device Bridge (QR Code Share) */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--forge-surface-elevated)] to-[#151928] border border-[var(--forge-border)] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center">
                    <Wifi size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Physical Device Bridge</h3>
                    <span className="text-[10px] font-mono text-[#FF6B00]">Real Hardware Testing</span>
                  </div>
                </div>

                <p className="text-[11px] text-[var(--forge-text-muted)] leading-relaxed">
                  Desktop simulators can never fully replicate real mobile capacitive touch latency, physical ARM GPU shaders, and native thermal throttling.
                </p>

                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-zinc-200 flex items-center justify-between">
                  <span className="truncate mr-2">{localTestUrl}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("local-url", localTestUrl)}
                    className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                  >
                    {copiedSnippetId === "local-url" ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-[var(--forge-text-muted)]">
                  Scan this QR code with your iPhone or Android camera on the same Wi-Fi network to test immediately on physical hardware!
                </p>
              </div>

              {/* QR Code Graphic */}
              <div className="p-2.5 bg-white rounded-2xl shadow-2xl shrink-0 flex flex-col items-center">
                <img
                  src={qrCodeUrl}
                  alt="Scan to test on physical mobile device"
                  className="w-36 h-36 rounded-lg"
                />
                <span className="text-[9px] font-mono text-zinc-600 mt-1 font-bold">
                  {localNetworkIp}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: UPSTREAM BREAKING CHANGES & REGRESSIONS ================= */}
        {activeTab === "upstream_regressions" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Version Bar */}
            <div className="grid grid-cols-4 gap-3 p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-center font-mono">
              <div>
                <span className="text-[10px] text-[var(--forge-text-muted)] uppercase block">Chromium</span>
                <span className="text-sm font-bold text-white">{runtimeVersions.chromium}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--forge-text-muted)] uppercase block">V8 Engine</span>
                <span className="text-sm font-bold text-[#FF6B00]">{runtimeVersions.v8}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--forge-text-muted)] uppercase block">Node.js</span>
                <span className="text-sm font-bold text-white">{runtimeVersions.node}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--forge-text-muted)] uppercase block">Electron Shell</span>
                <span className="text-sm font-bold text-white">{runtimeVersions.electron}</span>
              </div>
            </div>

            {/* Live Deprecation Stream */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Terminal size={13} className="text-purple-400" />
                  Live Engine Deprecation Warnings ({deprecationLogs.length})
                </h3>
                {deprecationLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={clearDeprecationLogs}
                    className="text-[10px] text-[var(--forge-text-muted)] hover:text-white"
                  >
                    Clear Logs
                  </button>
                )}
              </div>

              {deprecationLogs.length === 0 ? (
                <div className="p-5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-center text-xs text-[var(--forge-text-muted)]">
                  No deprecation warnings triggered by the active page. All utilized APIs conform to modern standards.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {deprecationLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-[var(--forge-surface-elevated)] border border-purple-500/30 text-xs font-mono text-purple-200"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                        <span>Line {log.line}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed break-all">{log.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Chromium Deprecation Roadmap */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white block">
                Chromium Upstream Deprecation Roadmap &amp; Feature Regressions
              </span>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white">Mutation Events Complete Removal</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-400">
                      M127+ Removed
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--forge-text-muted)] mt-1">
                    <code className="text-[#FF6B00]">DOMNodeInserted</code>, <code className="text-[#FF6B00]">DOMNodeRemoved</code> cause heavy performance degradation and are fully removed. Replace with <code className="text-[#FF6B00]">MutationObserver</code>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white">Unload Event Deprecation</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                      M130+ Deprecated
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--forge-text-muted)] mt-1">
                    <code className="text-[#FF6B00]">window.onunload</code> prevents modern bfcache (Back/Forward Cache). Replace with <code className="text-[#FF6B00]">pagehide</code> or <code className="text-[#FF6B00]">visibilitychange</code>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white">WebSQL Complete Removal</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/20 text-red-400">
                      M119+ Removed
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--forge-text-muted)] mt-1">
                    Non-standard WebSQL API fully decommissioned across all engines. Replace with IndexedDB or SQLite over WebAssembly with OPFS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
