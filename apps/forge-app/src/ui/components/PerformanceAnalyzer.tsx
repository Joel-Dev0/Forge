import { useEffect, useState } from "react";
import {
  Gauge,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  usePerformanceStore,
  fetchMetricsScript,
  type PerformanceSnapshot,
} from "../../core/performance/usePerformanceStore";

interface Props {
  getActiveWebview?: () => WebviewElement | null;
}

export function PerformanceAnalyzer({ getActiveWebview }: Props) {
  const { currentSnapshot, isLoading, setSnapshot, setIsLoading } = usePerformanceStore();
  const [activeView, setActiveView] = useState<"overview" | "waterfall" | "audits">("overview");

  const runAudit = async () => {
    setIsLoading(true);
    try {
      const wv = getActiveWebview ? getActiveWebview() : null;
      if (wv) {
        const metrics: PerformanceSnapshot = await wv.executeJavaScript(fetchMetricsScript);
        if (metrics) {
          setSnapshot(metrics);
        }
      } else {
        // Fallback demo snapshot
        setSnapshot({
          score: 88,
          vitals: { lcp: 1420, fcp: 780, cls: 0.015, ttfb: 145, domLoad: 680, windowLoad: 1100 },
          resources: {
            scripts: { count: 8, size: 420 * 1024 },
            stylesheets: { count: 3, size: 65 * 1024 },
            images: { count: 12, size: 850 * 1024 },
            fonts: { count: 2, size: 80 * 1024 },
            fetch: { count: 6, size: 35 * 1024 },
            others: { count: 4, size: 20 * 1024 },
          },
          waterfall: [
            { name: "index.html", type: "navigation", startTime: 0, duration: 145, size: 12000 },
            { name: "main.js", type: "script", startTime: 150, duration: 220, size: 210000 },
            { name: "style.css", type: "css", startTime: 160, duration: 90, size: 45000 },
            { name: "hero.png", type: "img", startTime: 250, duration: 380, size: 420000 },
            { name: "api/data", type: "fetch", startTime: 400, duration: 110, size: 15000 },
          ],
          audits: [
            {
              id: "img-opt",
              type: "opportunity",
              title: "Modern WebP/AVIF Image Formats",
              description: "Serve images in next-gen formats to reduce total payload.",
              savings: "Save ~240 KB",
            },
            {
              id: "cache-opt",
              type: "good",
              title: "Efficient Cache Policy",
              description: "Static resources served with immutable caching headers.",
            },
          ],
          timestamp: Date.now(),
        });
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!currentSnapshot) {
      runAudit();
    }
  }, []);

  const snap = currentSnapshot;
  const score = snap?.score ?? 85;

  let scoreBadgeColor = "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  let scoreLabel = "Good (Fast)";
  if (score < 70 && score >= 50) {
    scoreBadgeColor = "text-amber-400 border-amber-500/40 bg-amber-500/10";
    scoreLabel = "Needs Work";
  } else if (score < 50) {
    scoreBadgeColor = "text-red-400 border-red-500/40 bg-red-500/10";
    scoreLabel = "Poor (Slow)";
  }

  // Calculate total resources weight
  const totalBytes = snap
    ? snap.resources.scripts.size +
      snap.resources.stylesheets.size +
      snap.resources.images.size +
      snap.resources.fonts.size +
      snap.resources.fetch.size +
      snap.resources.others.size
    : 1;

  const getPercent = (size: number) => Math.round((size / totalBytes) * 100) || 1;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[var(--forge-surface)] text-[11px] select-text">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/40 shrink-0 w-full">
        <div className="flex items-center gap-3">
          {/* Overall Score Dial */}
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border font-mono font-bold ${scoreBadgeColor}`}>
            <Gauge size={15} />
            <span className="text-[13px]">{score}</span>
            <span className="text-[9px] font-sans font-semibold">/ 100 — {scoreLabel}</span>
          </div>

          {/* Sub-view switcher */}
          <div className="flex items-center gap-1 bg-[var(--forge-input)] p-0.5 rounded-md">
            <button
              onClick={() => setActiveView("overview")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                activeView === "overview"
                  ? "bg-[var(--forge-surface)] text-[#FF6B00] shadow-xs"
                  : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              Web Vitals
            </button>
            <button
              onClick={() => setActiveView("waterfall")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                activeView === "waterfall"
                  ? "bg-[var(--forge-surface)] text-[#FF6B00] shadow-xs"
                  : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              Loading Waterfall
            </button>
            <button
              onClick={() => setActiveView("audits")}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                activeView === "audits"
                  ? "bg-[var(--forge-surface)] text-[#FF6B00] shadow-xs"
                  : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              Audit & Tips ({snap?.audits.length || 0})
            </button>
          </div>
        </div>

        <button
          onClick={runAudit}
          disabled={isLoading}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[10px] font-semibold text-[var(--forge-text)] transition-colors cursor-pointer"
        >
          <RefreshCw size={11} className={isLoading ? "animate-spin text-[#FF6B00]" : ""} />
          <span>Re-Analyze</span>
        </button>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin space-y-3 w-full">
        {/* Overview: Web Vitals Grid & Resource Weight */}
        {activeView === "overview" && snap && (
          <>
            {/* Core Web Vitals 4 Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[9px] text-[var(--forge-text-muted)] uppercase font-semibold">
                  <span>LCP (Largest Paint)</span>
                  <span className="text-emerald-400 font-bold">&lt; 2.5s</span>
                </div>
                <div className="text-[16px] font-bold font-mono text-[var(--forge-text)] my-1">
                  {(snap.vitals.lcp / 1000).toFixed(2)}s
                </div>
                <div className="text-[8px] text-[var(--forge-text-muted)]">Time when main content is visible</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[9px] text-[var(--forge-text-muted)] uppercase font-semibold">
                  <span>FCP (First Paint)</span>
                  <span className="text-emerald-400 font-bold">&lt; 1.8s</span>
                </div>
                <div className="text-[16px] font-bold font-mono text-[var(--forge-text)] my-1">
                  {(snap.vitals.fcp / 1000).toFixed(2)}s
                </div>
                <div className="text-[8px] text-[var(--forge-text-muted)]">First DOM element rendered</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[9px] text-[var(--forge-text-muted)] uppercase font-semibold">
                  <span>CLS (Layout Shift)</span>
                  <span className="text-emerald-400 font-bold">&lt; 0.1</span>
                </div>
                <div className="text-[16px] font-bold font-mono text-[var(--forge-text)] my-1">
                  {snap.vitals.cls.toFixed(3)}
                </div>
                <div className="text-[8px] text-[var(--forge-text-muted)]">Visual stability measurement</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex flex-col justify-between">
                <div className="flex items-center justify-between text-[9px] text-[var(--forge-text-muted)] uppercase font-semibold">
                  <span>TTFB (Server Time)</span>
                  <span className="text-emerald-400 font-bold">&lt; 200ms</span>
                </div>
                <div className="text-[16px] font-bold font-mono text-[var(--forge-text)] my-1">
                  {snap.vitals.ttfb} ms
                </div>
                <div className="text-[8px] text-[var(--forge-text-muted)]">Initial server response time</div>
              </div>
            </div>

            {/* Resource Weight Stacked Bar */}
            <div className="p-3 rounded-lg bg-[var(--forge-surface-elevated)]/30 border border-[var(--forge-border)] flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-[var(--forge-text)] flex items-center gap-1.5">
                  <HardDrive size={13} className="text-[#FF6B00]" />
                  Total Page Weight: {Math.round(totalBytes / 1024)} KB
                </span>
                <span className="text-[var(--forge-text-muted)] font-mono font-normal">
                  Load Time: {snap.vitals.windowLoad} ms
                </span>
              </div>

              {/* Progress Stacked Bar */}
              <div className="w-full h-3 rounded-full bg-[var(--forge-input)] overflow-hidden flex">
                <div style={{ width: `${getPercent(snap.resources.scripts.size)}%` }} className="bg-amber-400" title="Scripts" />
                <div style={{ width: `${getPercent(snap.resources.stylesheets.size)}%` }} className="bg-sky-400" title="Styles" />
                <div style={{ width: `${getPercent(snap.resources.images.size)}%` }} className="bg-purple-400" title="Images" />
                <div style={{ width: `${getPercent(snap.resources.fonts.size)}%` }} className="bg-emerald-400" title="Fonts" />
                <div style={{ width: `${getPercent(snap.resources.fetch.size)}%` }} className="bg-rose-400" title="Fetch/XHR" />
                <div style={{ width: `${getPercent(snap.resources.others.size)}%` }} className="bg-zinc-500" title="Others" />
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-6 gap-2 mt-1 font-mono text-[9px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[var(--forge-text-muted)]">JS:</span>
                  <span className="font-bold text-[var(--forge-text)]">{Math.round(snap.resources.scripts.size / 1024)}K</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span className="text-[var(--forge-text-muted)]">CSS:</span>
                  <span className="font-bold text-[var(--forge-text)]">{Math.round(snap.resources.stylesheets.size / 1024)}K</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-[var(--forge-text-muted)]">Img:</span>
                  <span className="font-bold text-[var(--forge-text)]">{Math.round(snap.resources.images.size / 1024)}K</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[var(--forge-text-muted)]">Font:</span>
                  <span className="font-bold text-[var(--forge-text)]">{Math.round(snap.resources.fonts.size / 1024)}K</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-[var(--forge-text-muted)]">API:</span>
                  <span className="font-bold text-[var(--forge-text)]">{Math.round(snap.resources.fetch.size / 1024)}K</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  <span className="text-[var(--forge-text-muted)]">Other:</span>
                  <span className="font-bold text-[var(--forge-text)]">{Math.round(snap.resources.others.size / 1024)}K</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loading Waterfall Timeline */}
        {activeView === "waterfall" && snap && (
          <div className="flex flex-col gap-1.5 font-mono text-[9px]">
            <div className="flex items-center justify-between pb-1 border-b border-[var(--forge-border)] text-[9px] uppercase font-bold text-[var(--forge-text-muted)]">
              <span>Resource Name & Type</span>
              <span>Timeline (0 - {snap.vitals.windowLoad}ms)</span>
            </div>

            {snap.waterfall.map((res, i) => {
              const maxTime = Math.max(snap.vitals.windowLoad, 1000);
              const leftPercent = Math.min(95, (res.startTime / maxTime) * 100);
              const widthPercent = Math.max(3, Math.min(100 - leftPercent, (res.duration / maxTime) * 100));

              let barColor = "bg-amber-400";
              if (res.type.includes("css")) barColor = "bg-sky-400";
              if (res.type.includes("img") || res.type.includes("image")) barColor = "bg-purple-400";
              if (res.type.includes("fetch") || res.type.includes("xml")) barColor = "bg-rose-400";

              return (
                <div key={i} className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-[var(--forge-hover)]">
                  <div className="w-48 truncate text-[var(--forge-text)] flex items-center gap-1">
                    <span className="text-zinc-500 text-[8px]">{res.type}</span>
                    <span>{res.name}</span>
                  </div>

                  <div className="flex-1 h-3.5 bg-[var(--forge-input)] rounded relative overflow-hidden">
                    <div
                      style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                      className={`absolute top-0 bottom-0 rounded ${barColor}`}
                      title={`${res.name}: ${res.duration}ms (${Math.round(res.size / 1024)}KB)`}
                    />
                  </div>

                  <div className="w-16 text-right text-[var(--forge-text-muted)] shrink-0">
                    {res.duration}ms
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Audits & Optimization Suggestions */}
        {activeView === "audits" && snap && (
          <div className="space-y-2">
            {snap.audits.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/30 flex items-start gap-3"
              >
                {item.type === "good" ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-[var(--forge-text)]">{item.title}</span>
                    {item.savings && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-500/20 text-amber-300">
                        {item.savings}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--forge-text-muted)] mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}