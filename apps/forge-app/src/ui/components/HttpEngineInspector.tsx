import { useState } from "react";
import {
  Send,
  ShieldCheck,
  Clock,
  Layers,
  Code,
  FileText,
  Trash2,
  AlertCircle,

} from "lucide-react";
import { useHttpEngineStore, type HttpMethod } from "../../core/engine/useHttpEngineStore";

export function HttpEngineInspector() {
  const {
    url,
    method,
    headersText,
    bodyText,
    isLoading,
    error,
    response,
    history,
    inspectorTab,
    setUrl,
    setMethod,
    setHeadersText,
    setBodyText,
    setInspectorTab,
    sendRequest,
    loadHistoryItem,
    clearHistory,
  } = useHttpEngineStore();

  const [requestTab, setRequestTab] = useState<"headers" | "body">("headers");

  const methods: HttpMethod[] = ["GET", "POST", "PUT", "DELETE"];

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (status >= 300 && status < 400) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (status >= 400 && status < 500) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    return "bg-rose-500/20 text-rose-400 border-rose-500/30";
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden text-xs bg-[var(--forge-surface)] text-[var(--forge-text)]">
      {/* ── Request Control Bar ── */}
      <div className="flex items-center gap-2 p-2 border-b border-[var(--forge-border)] bg-[var(--forge-bg)] shrink-0 w-full">
        {/* Method selector */}
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className="h-8 px-2 rounded font-bold text-xs bg-[var(--forge-surface)] border border-[var(--forge-border)] text-[#FF6B00] outline-none cursor-pointer"
        >
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* URL Input */}
        <div className="flex-1 flex items-center h-8 px-2.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] focus-within:border-[#FF6B00] transition-colors">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendRequest()}
            placeholder="Enter HTTP/HTTPS URL (e.g. https://httpbin.org/get)"
            className="w-full bg-transparent outline-none font-mono text-xs text-[var(--forge-text)] placeholder-[var(--forge-text-muted)]"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={sendRequest}
          disabled={isLoading || !url.trim()}
          className="flex items-center gap-1.5 h-8 px-3.5 rounded bg-[#FF6B00] hover:bg-[#FF8533] disabled:opacity-50 text-white font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={13} />
          )}
          <span>{isLoading ? "Connecting..." : "Send"}</span>
        </button>

        {/* Preset quick test shortcuts */}
        <div className="hidden lg:flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setUrl("https://httpbin.org/get");
              setMethod("GET");
            }}
            className="px-2 py-1 rounded text-[10px] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors"
          >
            GET Example
          </button>
          <button
            onClick={() => {
              setUrl("https://httpbin.org/post");
              setMethod("POST");
            }}
            className="px-2 py-1 rounded text-[10px] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors"
          >
            POST Example
          </button>
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Left pane: Request Configuration & History */}
        <div className="w-72 border-r border-[var(--forge-border)] flex flex-col overflow-hidden shrink-0 bg-[var(--forge-bg)]">
          {/* Config Tab Strip */}
          <div className="flex items-center border-b border-[var(--forge-border)] px-2 h-7 bg-[var(--forge-surface)]">
            <button
              onClick={() => setRequestTab("headers")}
              className={`px-2.5 h-full border-b-2 font-medium transition-colors ${
                requestTab === "headers"
                  ? "border-[#FF6B00] text-[#FF6B00]"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              Headers
            </button>
            <button
              onClick={() => setRequestTab("body")}
              className={`px-2.5 h-full border-b-2 font-medium transition-colors ${
                requestTab === "body"
                  ? "border-[#FF6B00] text-[#FF6B00]"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              Body {method !== "GET" && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] inline-block ml-1" />}
            </button>
          </div>

          {/* Config Tab Body */}
          <div className="p-2 flex-1 overflow-auto">
            {requestTab === "headers" && (
              <div className="flex flex-col h-full gap-1">
                <span className="text-[10px] text-[var(--forge-text-muted)] uppercase tracking-wider font-semibold">
                  Custom Request Headers (Key: Value)
                </span>
                <textarea
                  value={headersText}
                  onChange={(e) => setHeadersText(e.target.value)}
                  className="flex-1 w-full p-2 bg-[var(--forge-input)] border border-[var(--forge-border)] rounded font-mono text-[11px] text-[var(--forge-text)] outline-none resize-none"
                  placeholder="Header-Name: value&#10;Authorization: Bearer xyz"
                  spellCheck={false}
                />
              </div>
            )}

            {requestTab === "body" && (
              <div className="flex flex-col h-full gap-1">
                <span className="text-[10px] text-[var(--forge-text-muted)] uppercase tracking-wider font-semibold">
                  Payload (JSON / Text for POST/PUT)
                </span>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  disabled={method === "GET"}
                  className="flex-1 w-full p-2 bg-[var(--forge-input)] border border-[var(--forge-border)] rounded font-mono text-[11px] text-[var(--forge-text)] outline-none resize-none disabled:opacity-40"
                  placeholder='{\n  "key": "value"\n}'
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {/* History Strip */}
          <div className="h-40 border-t border-[var(--forge-border)] flex flex-col overflow-hidden bg-[var(--forge-surface)]">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[var(--forge-border)] text-[10px] text-[var(--forge-text-muted)] font-semibold uppercase tracking-wider">
              <span>Recent Engine Calls ({history.length})</span>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="hover:text-red-400 transition-colors p-0.5"
                  title="Clear history"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[var(--forge-border)]">
              {history.length === 0 ? (
                <p className="p-3 text-[11px] text-[var(--forge-text-muted)] italic text-center">
                  No requests executed yet
                </p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--forge-hover)] cursor-pointer transition-colors"
                  >
                    <span className="font-bold text-[10px] text-[#FF6B00]">{item.method}</span>
                    <span className={`text-[10px] px-1 rounded font-mono border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                    <span className="flex-1 truncate text-[11px] font-mono text-[var(--forge-text-secondary)]">
                      {item.url}
                    </span>
                    <span className="text-[10px] text-[var(--forge-text-muted)] font-mono shrink-0">
                      {item.duration}ms
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right pane: Response, Timing Waterfall & Wire Details */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--forge-surface)]">
          {error && (
            <div className="m-3 p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-start gap-2 text-red-400">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">HTTP Engine Error:</span> {error}
              </div>
            </div>
          )}

          {!response && !error && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--forge-text-muted)]">
              <div className="w-12 h-12 rounded-full bg-[var(--forge-surface-elevated)] flex items-center justify-center text-[#FF6B00] mb-3">
                <Send size={22} />
              </div>
              <h3 className="text-sm font-bold text-[var(--forge-text)] mb-1">
                Forge Native HTTP Engine — Stage A
              </h3>
              <p className="text-xs max-w-md mb-4">
                Execute GET, POST, and HTTPS requests through raw TCP/TLS sockets. Inspect microsecond
                telemetry, wire streams, and response headers without Chromium overhead.
              </p>
              <button
                onClick={sendRequest}
                className="px-4 py-1.5 rounded bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] hover:border-[#FF6B00] text-[var(--forge-text)] font-medium transition-all"
              >
                Run Default GET Test
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[var(--forge-text-muted)] animate-pulse">
              <div className="w-10 h-10 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="font-mono text-xs text-[var(--forge-text)]">
                Handshaking TCP & TLS sockets for {url}...
              </p>
            </div>
          )}

          {response && !isLoading && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Status Header */}
              <div className="flex items-center gap-3 px-3 py-2 border-b border-[var(--forge-border)] bg-[var(--forge-bg)] shrink-0 flex-wrap">
                <div className={`px-2 py-0.5 rounded font-bold font-mono border text-xs ${getStatusColor(response.status)}`}>
                  {response.status} {response.statusText}
                </div>

                <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--forge-text-secondary)]">
                  <Clock size={12} className="text-[#FF6B00]" />
                  <span>Total: {response.timing.total} ms</span>
                </div>

                <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--forge-text-secondary)]">
                  <span>Size: {(response.contentLength / 1024).toFixed(2)} KB</span>
                </div>

                {response.security && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                    <ShieldCheck size={11} />
                    <span>{response.security.protocol || "HTTPS"}</span>
                    {response.security.cipher && (
                      <span className="text-[var(--forge-text-muted)] truncate max-w-[120px]">
                        ({response.security.cipher})
                      </span>
                    )}
                  </div>
                )}

                {response.redirectCount > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono">
                    ({response.redirectCount} redirects followed)
                  </span>
                )}
              </div>

              {/* Timing Waterfall Strip */}
              <div className="px-3 py-1.5 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] flex flex-col gap-1 shrink-0">
                <div className="flex items-center justify-between text-[10px] text-[var(--forge-text-muted)] font-mono">
                  <span>DNS: {response.timing.dns}ms</span>
                  <span>TCP: {response.timing.tcp}ms</span>
                  {response.timing.tls > 0 && <span>TLS: {response.timing.tls}ms</span>}
                  <span>TTFB: {response.timing.ttfb}ms</span>
                  <span>Download: {response.timing.download}ms</span>
                </div>

                {/* Progress bar visual */}
                <div className="w-full h-1.5 rounded-full bg-[var(--forge-input)] flex overflow-hidden">
                  <div style={{ width: `${Math.max(5, (response.timing.dns / response.timing.total) * 100)}%` }} className="bg-sky-500" title="DNS Lookup" />
                  <div style={{ width: `${Math.max(5, (response.timing.tcp / response.timing.total) * 100)}%` }} className="bg-blue-500" title="TCP Handshake" />
                  {response.timing.tls > 0 && (
                    <div style={{ width: `${Math.max(5, (response.timing.tls / response.timing.total) * 100)}%` }} className="bg-indigo-500" title="TLS Handshake" />
                  )}
                  <div style={{ width: `${Math.max(5, (response.timing.ttfb / response.timing.total) * 100)}%` }} className="bg-amber-500" title="Time To First Byte" />
                  <div style={{ width: `${Math.max(5, (response.timing.download / response.timing.total) * 100)}%` }} className="bg-emerald-500" title="Download" />
                </div>
              </div>

              {/* Inspector Tabs */}
              <div className="flex items-center border-b border-[var(--forge-border)] px-3 h-8 bg-[var(--forge-bg)] shrink-0 gap-1">
                {[
                  { id: "body", label: "Response Body", icon: <Code size={12} /> },
                  { id: "headers", label: "Response Headers", icon: <FileText size={12} /> },
                  { id: "wire", label: "Raw Wire Stream", icon: <Layers size={12} /> },
                  { id: "security", label: "TLS & Security", icon: <ShieldCheck size={12} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setInspectorTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 h-full border-b-2 font-medium transition-colors ${
                      inspectorTab === tab.id
                        ? "border-[#FF6B00] text-[#FF6B00]"
                        : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Inspector Content */}
              <div className="flex-1 overflow-auto p-3 font-mono text-[11px]">
                {inspectorTab === "body" && (
                  <pre className="whitespace-pre-wrap select-text text-[var(--forge-text)] break-all leading-relaxed">
                    {response.body || "(Empty body)"}
                  </pre>
                )}

                {inspectorTab === "headers" && (
                  <div className="border border-[var(--forge-border)] rounded overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[var(--forge-surface-elevated)] border-b border-[var(--forge-border)] text-[10px] text-[var(--forge-text-muted)] uppercase">
                          <th className="p-2">Header</th>
                          <th className="p-2">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--forge-border)]">
                        {Object.entries(response.headers).map(([k, v]) => (
                          <tr key={k} className="hover:bg-[var(--forge-hover)] transition-colors">
                            <td className="p-2 font-bold text-[#FF6B00] w-1/3 select-text">{k}</td>
                            <td className="p-2 text-[var(--forge-text-secondary)] select-text break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {inspectorTab === "wire" && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block mb-1">
                        Client Request Sent to Socket:
                      </span>
                      <pre className="p-2.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] text-sky-400 whitespace-pre-wrap select-text break-all">
                        {response.rawRequest}
                      </pre>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block mb-1">
                        Raw Response Headers Received:
                      </span>
                      <pre className="p-2.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] text-emerald-400 whitespace-pre-wrap select-text break-all">
                        {response.rawResponseHeaders}
                      </pre>
                    </div>
                  </div>
                )}

                {inspectorTab === "security" && (
                  <div className="border border-[var(--forge-border)] rounded p-3 bg-[var(--forge-surface-elevated)] flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      <span className="font-bold text-xs">TLS Handshake Details</span>
                    </div>

                    {response.security ? (
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono mt-2">
                        <div>
                          <span className="text-[var(--forge-text-muted)] block text-[10px]">PROTOCOL</span>
                          <span>{response.security.protocol || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[var(--forge-text-muted)] block text-[10px]">CIPHER SUITE</span>
                          <span>{response.security.cipher || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[var(--forge-text-muted)] block text-[10px]">SERVER NAME (SNI)</span>
                          <span>{response.security.serverName || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[var(--forge-text-muted)] block text-[10px]">CERTIFICATE ISSUER</span>
                          <span>{response.security.certIssuer || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[var(--forge-text-muted)] block text-[10px]">SUBJECT</span>
                          <span>{response.security.certSubject || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[var(--forge-text-muted)] block text-[10px]">VALID UNTIL</span>
                          <span>{response.security.certValidTo || "N/A"}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-amber-400 text-xs">Plain unencrypted HTTP connection (no TLS).</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
