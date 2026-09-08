import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowDownRight,
  Copy,
  Check,
  Send,
  Search,
  Code,
  FileJson,
  Terminal,
} from "lucide-react";
import { useNetworkStore } from "../../core/network/useNetworkStore";
import {
  useApiMonitorStore,
  computeApiMetrics,
  generateCurlCommand,
} from "../../core/api-monitor/useApiMonitorStore";
import { useHttpEngineStore, type HttpMethod } from "../../core/engine/useHttpEngineStore";

interface Props {
  onSwitchToEngineStudio?: () => void;
}

export function ApiMonitor({ onSwitchToEngineStudio }: Props) {
  const entries = useNetworkStore((s) => s.entries);
  const {
    selectedApiId,
    methodFilter,
    statusFilter,
    searchQuery,
    activeDetailTab,
    setSelectedApiId,
    setMethodFilter,
    setStatusFilter,
    setSearchQuery,
    setActiveDetailTab,
  } = useApiMonitorStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter only API endpoints (fetch, xhr, or url containing /api)
  const apiEntries = entries.filter((e) => {
    const isApi = e.resourceType === "fetch" || e.resourceType === "xhr" || e.url.includes("/api/") || e.mimeType?.includes("json");
    if (!isApi) return false;

    if (methodFilter !== "ALL" && e.method !== methodFilter) return false;

    if (statusFilter === "2xx" && (e.status < 200 || e.status >= 300)) return false;
    if (statusFilter === "4xx" && (e.status < 400 || e.status >= 500)) return false;
    if (statusFilter === "5xx" && (e.status < 500 || e.status >= 600)) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.url.toLowerCase().includes(q) && !e.name.toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });

  const metrics = computeApiMetrics(entries);
  const selectedEntry = entries.find((e) => e.id === selectedApiId) || apiEntries[0] || null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSendToHttpEngine = (entry: NetworkEntry) => {
    const engine = useHttpEngineStore.getState();
    engine.setUrl(entry.url);
    if (["GET", "POST", "PUT", "DELETE", "HEAD"].includes(entry.method)) {
      engine.setMethod(entry.method as HttpMethod);
    }
    if (entry.postData) {
      engine.setBodyText(entry.postData);
    }
    if (entry.requestHeaders) {
      const headersStr = Object.entries(entry.requestHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      engine.setHeadersText(headersStr);
    }

    if (onSwitchToEngineStudio) {
      onSwitchToEngineStudio();
    }
  };

  const formatJson = (raw?: string) => {
    if (!raw) return "No payload";
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  // Parse URL query parameters
  const parseQueryParams = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      const params: [string, string][] = [];
      url.searchParams.forEach((v, k) => params.push([k, v]));
      return params;
    } catch {
      return [];
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--forge-surface)] text-[11px] select-text">
      {/* Top KPI Summary Ribbon */}
      <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/40 shrink-0 w-full">
        <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)]">
          <Activity size={14} className="text-[#FF6B00]" />
          <div>
            <div className="text-[9px] text-[var(--forge-text-muted)] uppercase font-semibold">Total Calls</div>
            <div className="text-[12px] font-bold font-mono text-[var(--forge-text)]">{metrics.totalCalls}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)]">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <div>
            <div className="text-[9px] text-[var(--forge-text-muted)] uppercase font-semibold">Success Rate</div>
            <div className="text-[12px] font-bold font-mono text-emerald-400">{metrics.successRate}%</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)]">
          <Clock size={14} className="text-sky-400" />
          <div>
            <div className="text-[9px] text-[var(--forge-text-muted)] uppercase font-semibold">Avg Latency</div>
            <div className="text-[12px] font-bold font-mono text-sky-400">{metrics.avgDuration} ms</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)]">
          <AlertCircle size={14} className={metrics.errorCount > 0 ? "text-red-400" : "text-zinc-500"} />
          <div>
            <div className="text-[9px] text-[var(--forge-text-muted)] uppercase font-semibold">Errors (4xx/5xx)</div>
            <div className={`text-[12px] font-bold font-mono ${metrics.errorCount > 0 ? "text-red-400" : "text-[var(--forge-text)]"}`}>
              {metrics.errorCount}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)]">
          <ArrowDownRight size={14} className="text-purple-400" />
          <div>
            <div className="text-[9px] text-[var(--forge-text-muted)] uppercase font-semibold">Transferred</div>
            <div className="text-[12px] font-bold font-mono text-purple-400">
              {metrics.totalBytes > 1024 * 1024
                ? `${(metrics.totalBytes / (1024 * 1024)).toFixed(2)} MB`
                : `${Math.round(metrics.totalBytes / 1024)} KB`}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/20 shrink-0 w-full">
        <div className="flex items-center gap-2">
          {/* Method filter pills */}
          <div className="flex items-center gap-0.5 bg-[var(--forge-input)] p-0.5 rounded text-[9px]">
            {(["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-1.5 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                  methodFilter === m
                    ? "bg-[var(--forge-surface)] text-[#FF6B00] shadow-xs"
                    : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-0.5 bg-[var(--forge-input)] p-0.5 rounded text-[9px]">
            {(["ALL", "2xx", "4xx", "5xx"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-1.5 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
                  statusFilter === s
                    ? "bg-[var(--forge-surface)] text-[var(--forge-text)] shadow-xs"
                    : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Search filter */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] w-48">
          <Search size={10} className="text-[var(--forge-text-muted)]" />
          <input
            type="text"
            placeholder="Search API route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-[9px] text-[var(--forge-text)] outline-none w-full"
          />
        </div>
      </div>

      {/* Main Split Layout: Left = List, Right = Deep Inspector */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Left: Endpoint List */}
        <div className="w-1/2 border-r border-[var(--forge-border)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-1">
            {apiEntries.length === 0 ? (
              <div className="p-4 text-center text-[var(--forge-text-muted)] text-[10px] italic">
                No API calls recorded yet. Navigate in the browser or trigger network actions to inspect endpoints.
              </div>
            ) : (
              apiEntries.map((entry) => {
                const isSelected = selectedEntry?.id === entry.id;

                let methodColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                if (entry.method === "POST") methodColor = "bg-sky-500/15 text-sky-400 border-sky-500/30";
                if (entry.method === "PUT" || entry.method === "PATCH") methodColor = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                if (entry.method === "DELETE") methodColor = "bg-red-500/15 text-red-400 border-red-500/30";

                let statusBadge = "text-emerald-400";
                if (entry.status >= 400 && entry.status < 500) statusBadge = "text-amber-400";
                if (entry.status >= 500 || entry.state === "failed") statusBadge = "text-red-400";

                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedApiId(entry.id)}
                    className={`flex items-center gap-2 p-2 mb-1 rounded-md cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[var(--forge-surface-elevated)] border-[#FF6B00]/40 shadow-xs"
                        : "border-transparent hover:bg-[var(--forge-hover)]"
                    }`}
                  >
                    {/* Method pill */}
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold border ${methodColor}`}>
                      {entry.method}
                    </span>

                    {/* Status */}
                    <span className={`font-mono text-[9px] font-bold ${statusBadge}`}>
                      {entry.status || (entry.state === "pending" ? "..." : "ERR")}
                    </span>

                    {/* Endpoint path */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[var(--forge-text)] truncate font-mono">
                        {entry.url}
                      </p>
                    </div>

                    {/* Latency */}
                    <span className="text-[9px] text-[var(--forge-text-muted)] font-mono shrink-0">
                      {entry.duration ? `${entry.duration}ms` : "-"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detailed API Inspector */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-[var(--forge-surface-elevated)]/15">
          {selectedEntry ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Actions */}
              <div className="p-2 border-b border-[var(--forge-border)] flex items-center justify-between bg-[var(--forge-surface-elevated)]/40">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-[10px] text-[#FF6B00]">
                    {selectedEntry.method}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--forge-text)] truncate">
                    {selectedEntry.url}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleSendToHttpEngine(selectedEntry)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-[9px] cursor-pointer shadow-xs transition-colors"
                    title="Load into Forge Stage A HTTP Engine"
                  >
                    <Send size={10} />
                    Send to Engine
                  </button>

                  <button
                    onClick={() => handleCopy(generateCurlCommand(selectedEntry), "curl")}
                    className="p-1 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] rounded transition-colors cursor-pointer"
                    title="Copy as cURL"
                  >
                    {copiedId === "curl" ? <Check size={12} className="text-emerald-400" /> : <Terminal size={12} />}
                  </button>
                </div>
              </div>

              {/* Inspector Sub-tabs */}
              <div className="flex items-center px-2 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/30">
                <button
                  onClick={() => setActiveDetailTab("response")}
                  className={`flex items-center gap-1 px-3 py-1.5 border-b-2 font-semibold text-[10px] transition-colors cursor-pointer ${
                    activeDetailTab === "response"
                      ? "border-[#FF6B00] text-[#FF6B00]"
                      : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  }`}
                >
                  <FileJson size={11} /> Response JSON
                </button>
                <button
                  onClick={() => setActiveDetailTab("payload")}
                  className={`flex items-center gap-1 px-3 py-1.5 border-b-2 font-semibold text-[10px] transition-colors cursor-pointer ${
                    activeDetailTab === "payload"
                      ? "border-[#FF6B00] text-[#FF6B00]"
                      : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  }`}
                >
                  <Code size={11} /> Request Body
                </button>
                <button
                  onClick={() => setActiveDetailTab("headers")}
                  className={`flex items-center gap-1 px-3 py-1.5 border-b-2 font-semibold text-[10px] transition-colors cursor-pointer ${
                    activeDetailTab === "headers"
                      ? "border-[#FF6B00] text-[#FF6B00]"
                      : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  }`}
                >
                  Headers
                </button>
                <button
                  onClick={() => setActiveDetailTab("curl")}
                  className={`flex items-center gap-1 px-3 py-1.5 border-b-2 font-semibold text-[10px] transition-colors cursor-pointer ${
                    activeDetailTab === "curl"
                      ? "border-[#FF6B00] text-[#FF6B00]"
                      : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  }`}
                >
                  cURL
                </button>
              </div>

              {/* Sub-tab: Response JSON */}
              {activeDetailTab === "response" && (
                <div className="flex-1 flex flex-col overflow-hidden p-2 relative">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[9px] uppercase font-bold text-[var(--forge-text-muted)]">
                      Status: {selectedEntry.status} {selectedEntry.statusText} | Size: {selectedEntry.size} bytes
                    </span>
                    <button
                      onClick={() => handleCopy(selectedEntry.responseBody || "", "resp")}
                      className="p-1 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] cursor-pointer"
                      title="Copy response JSON"
                    >
                      {copiedId === "resp" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <pre className="flex-1 overflow-auto bg-[var(--forge-input)] border border-[var(--forge-border)] p-2.5 rounded font-mono text-[10px] text-emerald-400 leading-relaxed scrollbar-thin">
                    {formatJson(selectedEntry.responseBody)}
                  </pre>
                </div>
              )}

              {/* Sub-tab: Request Body */}
              {activeDetailTab === "payload" && (
                <div className="flex-1 flex flex-col overflow-hidden p-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[9px] uppercase font-bold text-[var(--forge-text-muted)]">Request Payload</span>
                    {selectedEntry.postData && (
                      <button
                        onClick={() => handleCopy(selectedEntry.postData || "", "req")}
                        className="p-1 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] cursor-pointer"
                      >
                        {copiedId === "req" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>
                  <pre className="flex-1 overflow-auto bg-[var(--forge-input)] border border-[var(--forge-border)] p-2.5 rounded font-mono text-[10px] text-sky-300 leading-relaxed scrollbar-thin">
                    {formatJson(selectedEntry.postData)}
                  </pre>
                </div>
              )}

              {/* Sub-tab: Headers & Query Params */}
              {activeDetailTab === "headers" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                  {/* Query Parameters */}
                  {parseQueryParams(selectedEntry.url).length > 0 && (
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block mb-1">
                        Query Parameters
                      </span>
                      <div className="bg-[var(--forge-input)] border border-[var(--forge-border)] rounded overflow-hidden">
                        {parseQueryParams(selectedEntry.url).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between px-2 py-1 border-b border-[var(--forge-border)] last:border-b-0 font-mono text-[10px]">
                            <span className="text-sky-400 font-bold">{k}:</span>
                            <span className="text-[var(--forge-text)]">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response Headers */}
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block mb-1">
                      Response Headers
                    </span>
                    <div className="bg-[var(--forge-input)] border border-[var(--forge-border)] rounded overflow-hidden">
                      {Object.entries(selectedEntry.responseHeaders || {}).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between px-2 py-1 border-b border-[var(--forge-border)] last:border-b-0 font-mono text-[10px]">
                          <span className="text-amber-400 font-bold">{k}:</span>
                          <span className="text-[var(--forge-text)] truncate max-w-xs">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Request Headers */}
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block mb-1">
                      Request Headers
                    </span>
                    <div className="bg-[var(--forge-input)] border border-[var(--forge-border)] rounded overflow-hidden">
                      {Object.entries(selectedEntry.requestHeaders || {}).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between px-2 py-1 border-b border-[var(--forge-border)] last:border-b-0 font-mono text-[10px]">
                          <span className="text-sky-400 font-bold">{k}:</span>
                          <span className="text-[var(--forge-text)] truncate max-w-xs">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab: cURL Replay */}
              {activeDetailTab === "curl" && (
                <div className="flex-1 p-3 flex flex-col gap-2">
                  <span className="text-[9px] uppercase font-bold text-[var(--forge-text-muted)]">
                    Executable cURL Command
                  </span>
                  <pre className="flex-1 overflow-auto bg-[var(--forge-input)] border border-[var(--forge-border)] p-3 rounded font-mono text-[10px] text-amber-300 leading-relaxed scrollbar-thin">
                    {generateCurlCommand(selectedEntry)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-[var(--forge-text-muted)] italic text-[10px]">
              Select an API endpoint to inspect headers, request body, and response JSON.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}