import { useEffect, useMemo } from "react";
import {
  Circle,
  Pause,
  Trash2,
  Search,
  FileText,
  Code,
  Clock,
  X,
  Radio,
} from "lucide-react";
import { useNetworkStore, matchesFilter, type FilterCategory } from "../../core/network/useNetworkStore";

export function NetworkInspector() {
  const {
    entries,
    selectedId,
    filterType,
    searchQuery,
    isRecording,
    detailTab,
    initNetworkListener,
    setSelectedId,
    setFilterType,
    setSearchQuery,
    setDetailTab,
    toggleRecording,
    clearEntries,
    fetchResponseBody,
  } = useNetworkStore();

  // Attach IPC listener for webview network events
  useEffect(() => {
    const cleanup = initNetworkListener();
    return cleanup;
  }, [initNetworkListener]);

  // Selected entry
  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) || null,
    [entries, selectedId]
  );

  // Automatically fetch response body if selected entry has none yet
  useEffect(() => {
    if (selectedEntry && !selectedEntry.responseBody && selectedEntry.state === "completed") {
      fetchResponseBody(selectedEntry.id);
    }
  }, [selectedEntry, fetchResponseBody]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (!matchesFilter(e, filterType)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return e.url.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.method.toLowerCase().includes(q);
      }
      return true;
    });
  }, [entries, filterType, searchQuery]);

  // Summary statistics
  const totalSize = useMemo(() => {
    return entries.reduce((acc, e) => acc + (e.size || 0), 0);
  }, [entries]);

  const filterCategories: { id: FilterCategory; label: string }[] = [
    { id: "all",   label: "All" },
    { id: "fetch", label: "Fetch/XHR" },
    { id: "doc",   label: "Doc" },
    { id: "js",    label: "JS" },
    { id: "css",   label: "CSS" },
    { id: "img",   label: "Img" },
    { id: "other", label: "Other" },
  ];

  const getStatusBadge = (status: number, state: string) => {
    if (state === "pending") {
      return <span className="text-[10px] text-amber-400 font-mono animate-pulse">Pending</span>;
    }
    if (state === "failed") {
      return <span className="text-[10px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono">Failed</span>;
    }
    let color = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (status >= 300 && status < 400) color = "bg-sky-500/20 text-sky-400 border-sky-500/30";
    if (status >= 400 && status < 500) color = "bg-amber-500/20 text-amber-400 border-amber-500/30";
    if (status >= 500) color = "bg-rose-500/20 text-rose-400 border-rose-500/30";

    return (
      <span className={`text-[10px] px-1 py-0.5 rounded font-mono border ${color}`}>
        {status || "200"}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden text-xs bg-[var(--forge-surface)] text-[var(--forge-text)] select-none">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[var(--forge-border)] bg-[var(--forge-bg)] shrink-0 flex-wrap w-full">
        {/* Record / Pause */}
        <button
          onClick={toggleRecording}
          title={isRecording ? "Pause capturing network" : "Resume capturing network"}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
            isRecording ? "text-red-500 hover:bg-red-500/10" : "text-[var(--forge-text-muted)] hover:bg-[var(--forge-hover)]"
          }`}
        >
          {isRecording ? <Circle size={10} fill="currentColor" /> : <Pause size={12} />}
        </button>

        {/* Clear */}
        <button
          onClick={clearEntries}
          title="Clear network log"
          className="w-6 h-6 flex items-center justify-center rounded text-[var(--forge-text-muted)] hover:text-red-400 hover:bg-[var(--forge-hover)] transition-colors"
        >
          <Trash2 size={12} />
        </button>

        <div className="w-px h-4 bg-[var(--forge-border)] mx-1" />

        {/* Search */}
        <div className="flex items-center gap-1.5 h-6 px-2 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] focus-within:border-[#FF6B00] transition-colors w-44 sm:w-56">
          <Search size={11} className="text-[var(--forge-text-muted)] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by URL / name..."
            className="w-full bg-transparent outline-none font-mono text-[11px] text-[var(--forge-text)] placeholder-[var(--forge-text-muted)]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-0.5 bg-[var(--forge-input)] p-0.5 rounded">
          {filterCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterType(c.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                filterType === c.id
                  ? "bg-[var(--forge-surface)] text-[#FF6B00] shadow-xs font-semibold"
                  : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Metrics Summary */}
        <div className="ml-auto flex items-center gap-2 text-[10px] text-[var(--forge-text-muted)] font-mono shrink-0">
          <span>{filteredEntries.length} requests</span>
          <span>•</span>
          <span>{(totalSize / 1024).toFixed(1)} KB</span>
        </div>
      </div>

      {/* ── Main View Area ── */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Network Requests Table */}
        <div className={`flex flex-col overflow-hidden ${selectedEntry ? "w-1/2 border-r border-[var(--forge-border)]" : "w-full"}`}>
          {/* Table Header */}
          <div className="flex items-center h-6 px-2 bg-[var(--forge-bg)] border-b border-[var(--forge-border)] text-[10px] font-bold text-[var(--forge-text-muted)] uppercase shrink-0 w-full">
            <span className="flex-1 min-w-[120px] truncate px-1">Name</span>
            <span className="w-20 text-center shrink-0">Status</span>
            <span className="w-16 text-center shrink-0">Type</span>
            <span className="w-16 text-center shrink-0">Method</span>
            <span className="w-20 text-right px-2 shrink-0">Size</span>
            <span className="w-20 text-right px-2 shrink-0">Time</span>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--forge-border)]">
            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-[var(--forge-text-muted)] text-center">
                <Radio size={24} className="mb-2 text-[#FF6B00] opacity-80" />
                <p className="font-semibold text-[var(--forge-text)]">Inspector Red Listening</p>
                <p className="text-[11px] max-w-sm mt-1">
                  Navigate or browse any website in Forge to automatically capture all requests, headers, payloads, and response bodies in real-time.
                </p>
              </div>
            ) : (
              filteredEntries.map((e) => {
                const isSelected = e.id === selectedId;
                return (
                  <div
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={`flex items-center h-7 px-2 cursor-pointer text-[11px] font-mono transition-colors ${
                      isSelected
                        ? "bg-[#FF6B00]/15 text-[var(--forge-text)] font-semibold"
                        : "hover:bg-[var(--forge-hover)] text-[var(--forge-text-secondary)]"
                    }`}
                  >
                    <span className="flex-1 min-w-[120px] truncate px-1 font-sans text-[11px] text-[var(--forge-text)]" title={e.url}>
                      {e.name}
                    </span>
                    <span className="w-20 text-center shrink-0">{getStatusBadge(e.status, e.state)}</span>
                    <span className="w-16 text-center shrink-0 uppercase text-[10px] text-[var(--forge-text-muted)]">
                      {e.resourceType}
                    </span>
                    <span className="w-16 text-center shrink-0 font-bold text-[10px] text-[#FF6B00]">
                      {e.method}
                    </span>
                    <span className="w-20 text-right px-2 shrink-0 text-[10px] text-[var(--forge-text-muted)]">
                      {e.size > 0 ? `${(e.size / 1024).toFixed(1)} KB` : "-"}
                    </span>
                    <span className="w-20 text-right px-2 shrink-0 text-[10px] text-[var(--forge-text-muted)]">
                      {e.duration > 0 ? `${e.duration}ms` : "-"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Detail Inspector Drawer (When entry is selected) ── */}
        {selectedEntry && (
          <div className="w-1/2 flex flex-col overflow-hidden bg-[var(--forge-surface)]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--forge-border)] bg-[var(--forge-bg)] shrink-0">
              <div className="flex items-center gap-2 truncate pr-2">
                <span className="font-bold text-[#FF6B00] text-xs">{selectedEntry.method}</span>
                <span className="truncate text-xs font-semibold text-[var(--forge-text)]" title={selectedEntry.url}>
                  {selectedEntry.name}
                </span>
                {getStatusBadge(selectedEntry.status, selectedEntry.state)}
              </div>

              <button
                onClick={() => setSelectedId(null)}
                className="w-5 h-5 flex items-center justify-center rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors shrink-0"
              >
                <X size={12} />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex items-center border-b border-[var(--forge-border)] px-3 h-7 bg-[var(--forge-bg)] shrink-0 gap-1">
              {[
                { id: "headers",  label: "Headers",       icon: <FileText size={11} /> },
                { id: "payload",  label: "Payload / Body",icon: <Code size={11} /> },
                { id: "response", label: "Response Body", icon: <FileText size={11} /> },
                { id: "timing",   label: "Timing",        icon: <Clock size={11} /> },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 h-full border-b-2 font-medium text-[11px] transition-colors ${
                    detailTab === t.id
                      ? "border-[#FF6B00] text-[#FF6B00]"
                      : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-auto p-3 font-mono text-[11px]">
              {/* 1. Headers View */}
              {detailTab === "headers" && (
                <div className="flex flex-col gap-4">
                  {/* General */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#FF6B00] tracking-wider block mb-1.5">
                      General
                    </span>
                    <div className="p-2.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col gap-1">
                      <div><span className="text-[var(--forge-text-muted)] font-sans">Request URL:</span> <span className="select-text break-all text-[var(--forge-text)]">{selectedEntry.url}</span></div>
                      <div><span className="text-[var(--forge-text-muted)] font-sans">Request Method:</span> <span className="text-[#FF6B00] font-bold">{selectedEntry.method}</span></div>
                      <div><span className="text-[var(--forge-text-muted)] font-sans">Status Code:</span> <span>{selectedEntry.status} {selectedEntry.statusText}</span></div>
                      {selectedEntry.mimeType && <div><span className="text-[var(--forge-text-muted)] font-sans">Content-Type:</span> <span>{selectedEntry.mimeType}</span></div>}
                    </div>
                  </div>

                  {/* Response Headers */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#FF6B00] tracking-wider block mb-1.5">
                      Response Headers ({Object.keys(selectedEntry.responseHeaders).length})
                    </span>
                    <div className="border border-[var(--forge-border)] rounded overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <tbody className="divide-y divide-[var(--forge-border)]">
                          {Object.entries(selectedEntry.responseHeaders).map(([k, v]) => (
                            <tr key={k} className="hover:bg-[var(--forge-hover)] transition-colors">
                              <td className="p-2 font-bold text-[#FF6B00] w-1/3 select-text">{k}</td>
                              <td className="p-2 text-[var(--forge-text-secondary)] select-text break-all">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Request Headers */}
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#FF6B00] tracking-wider block mb-1.5">
                      Request Headers ({Object.keys(selectedEntry.requestHeaders).length})
                    </span>
                    <div className="border border-[var(--forge-border)] rounded overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <tbody className="divide-y divide-[var(--forge-border)]">
                          {Object.entries(selectedEntry.requestHeaders).map(([k, v]) => (
                            <tr key={k} className="hover:bg-[var(--forge-hover)] transition-colors">
                              <td className="p-2 font-bold text-[#FF6B00] w-1/3 select-text">{k}</td>
                              <td className="p-2 text-[var(--forge-text-secondary)] select-text break-all">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Payload / POST Body */}
              {detailTab === "payload" && (
                <div className="flex flex-col h-full">
                  <span className="text-[10px] uppercase font-bold text-[#FF6B00] tracking-wider block mb-1.5">
                    Request Payload
                  </span>
                  {selectedEntry.postData ? (
                    <pre className="flex-1 p-3 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] whitespace-pre-wrap select-text text-[var(--forge-text)] break-all leading-relaxed overflow-auto">
                      {selectedEntry.postData}
                    </pre>
                  ) : (
                    <div className="p-6 text-center text-[var(--forge-text-muted)] italic">
                      No payload or POST body data was sent with this request.
                    </div>
                  )}
                </div>
              )}

              {/* 3. Response Body View */}
              {detailTab === "response" && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#FF6B00] tracking-wider">
                      Response Body {selectedEntry.responseBody && `(${selectedEntry.responseBody.length} bytes)`}
                    </span>
                    {!selectedEntry.responseBody && selectedEntry.state === "completed" && (
                      <button
                        onClick={() => fetchResponseBody(selectedEntry.id)}
                        className="text-[10px] text-[#FF6B00] hover:underline"
                      >
                        Fetch response body
                      </button>
                    )}
                  </div>

                  {selectedEntry.responseBody ? (
                    <pre className="flex-1 p-3 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] whitespace-pre-wrap select-text text-[var(--forge-text)] break-all leading-relaxed overflow-auto">
                      {selectedEntry.responseBody}
                    </pre>
                  ) : (
                    <div className="p-6 text-center text-[var(--forge-text-muted)] italic">
                      {selectedEntry.state === "pending"
                        ? "Request is still pending..."
                        : "Response body was not cached or is not text-based."}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Timing View */}
              {detailTab === "timing" && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] uppercase font-bold text-[#FF6B00] tracking-wider block">
                    Execution Timings
                  </span>
                  <div className="p-3 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--forge-text-muted)]">Status:</span>
                      <span className="font-bold">{selectedEntry.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--forge-text-muted)]">Total Duration:</span>
                      <span className="font-bold text-[#FF6B00]">{selectedEntry.duration} ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--forge-text-muted)]">Transfer Size:</span>
                      <span>{(selectedEntry.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--forge-text-muted)]">Start Time:</span>
                      <span>{new Date(selectedEntry.startTime).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
