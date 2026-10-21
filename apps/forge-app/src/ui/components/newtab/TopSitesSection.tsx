import { useMemo, useState } from "react";
import { Flame, X, RotateCcw, TrendingUp } from "lucide-react";
import {
  selectTopSites,
  useTopSitesStore,
  MIN_RECURRING_VISITS,
  type TopSite,
} from "../../../core/topsites/useTopSitesStore";

interface Props {
  onNavigate: (url: string) => void;
  limit?: number;
  minVisits?: number;
}

const ACCENTS = ["#FF6B00", "#3B82F6", "#10B981", "#A855F7", "#EC4899", "#EAB308", "#06B6D4", "#EF4444"];

function accentFor(host: string): string {
  let hash = 0;
  for (let i = 0; i < host.length; i++) hash = (hash * 31 + host.charCodeAt(i)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

function formatVisits(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function SiteIcon({ site }: { site: TopSite }) {
  const [failed, setFailed] = useState(false);
  const accent = accentFor(site.host);
  const src = site.favicon || `https://www.google.com/s2/favicons?domain=${site.host}&sz=64`;

  if (failed) {
    return (
      <span className="text-base font-bold uppercase" style={{ color: accent }}>
        {site.host.charAt(0)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className="w-6 h-6 rounded-md object-contain"
    />
  );
}

/**
 * "Most Visited" tiles for the New Tab page.
 * Subscribes directly to the Top Sites store, so ranking, visit counters,
 * titles and favicons update live while browsing.
 *
 * Dynamically highlights recurring pages the user actively visits or resorts to,
 * automatically setting aside pages that the user has stopped using.
 */
export function TopSitesSection({ onNavigate, limit = 12, minVisits = MIN_RECURRING_VISITS }: Props) {
  const sites = useTopSitesStore((s) => s.sites);
  const hidden = useTopSitesStore((s) => s.hidden);
  const hideSite = useTopSitesStore((s) => s.hideSite);
  const restoreHidden = useTopSitesStore((s) => s.restoreHidden);

  const topSites = useMemo(
    () => selectTopSites({ sites, hidden }, limit, minVisits),
    [sites, hidden, limit, minVisits]
  );

  return (
    <section
      aria-label="Most visited sites"
      className="w-full rounded-2xl bg-[var(--forge-surface)]/55 border border-[var(--forge-border)]/70 backdrop-blur-md shadow-xl overflow-hidden"
      style={{ borderTop: "2px solid rgba(255,107,0,0.5)" }}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[var(--forge-border)]/60 bg-[var(--forge-surface-elevated)]/30">
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-[#FF6B00]" />
          <h2 className="text-xs font-bold text-[var(--forge-text)] tracking-tight">Most Visited</h2>
          <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--forge-text-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>

        {hidden.length > 0 && (
          <button
            type="button"
            onClick={restoreHidden}
            className="flex items-center gap-1 text-[10px] font-medium text-[var(--forge-text-muted)] hover:text-[#FF6B00] transition-colors cursor-pointer"
            title="Show removed sites again"
          >
            <RotateCcw size={10} />
            <span>Restore {hidden.length} removed</span>
          </button>
        )}
      </div>

      {topSites.length === 0 ? (
        <div className="flex items-center justify-center gap-2 px-5 py-8 text-[11px] text-[var(--forge-text-muted)]">
          <TrendingUp size={14} className="text-[#FF6B00]" />
          <span>Sites with recurring visits will appear here based on recent activity.</span>
        </div>
      ) : (
        <ul className="flex flex-wrap items-center gap-3 p-4 m-0 list-none">
          {topSites.map((site) => {
            const accent = accentFor(site.host);
            const tooltip = `${site.title === site.host ? site.host : `${site.title} (${site.host})`}\n${formatVisits(site.visits)} visit${site.visits === 1 ? "" : "s"} • Active ${timeAgo(site.lastVisitedAt)}`;
            return (
              <li key={site.host} className="relative group animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={() => onNavigate(site.url)}
                  title={tooltip}
                  aria-label={site.title || site.host}
                  className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md hover:scale-105 hover:-translate-y-0.5"
                  style={{
                    backgroundColor: `${accent}14`,
                    borderColor: `${accent}33`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = accent;
                    e.currentTarget.style.backgroundColor = `${accent}26`;
                    e.currentTarget.style.boxShadow = `0 4px 14px ${accent}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${accent}33`;
                    e.currentTarget.style.backgroundColor = `${accent}14`;
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  <SiteIcon site={site} />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hideSite(site.host);
                  }}
                  title="Remove from Most Visited"
                  aria-label={`Remove ${site.host} from Most Visited`}
                  className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] text-[var(--forge-text-muted)] hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer shadow z-10"
                >
                  <X size={10} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
