import { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldOff,
  RotateCw,
  Ban,
  EyeOff,
  Skull,
  FileCode2,
  HardDrive,
  Clock,
} from "lucide-react";
import { useAdBlockStore, type ShieldFeatures } from "../../core/adblock/useAdBlockStore";

interface Props {
  currentUrl: string;
  onReload: () => void;
}

function extractHostname(urlStr: string): string {
  try {
    if (!urlStr || urlStr === "about:blank") return "New Tab";
    const parsed = new URL(urlStr);
    return parsed.hostname || urlStr;
  } catch {
    return urlStr || "Current Site";
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ShieldsButton({ currentUrl, onReload }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    enabled,
    toggleEnabled,
    features,
    toggleFeature,
    detailedStats,
    customRules,
    isSiteProtected,
    toggleSiteProtection,
    getBlockedCountForDomain,
    stats,
    fetchDetailedStats,
  } = useAdBlockStore();

  const domain = extractHostname(currentUrl);
  const isProtectedOnSite = isSiteProtected(domain);
  const siteBlockedCount = getBlockedCountForDomain(domain);
  const totalBlocked = stats?.blockedCount ?? 0;
  const isBlank = !currentUrl || currentUrl === "about:blank" || domain === "New Tab";

  useEffect(() => {
    if (isOpen) {
      fetchDetailedStats().catch(() => {});
    }
  }, [isOpen, fetchDetailedStats]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  const isEffectivelyActive = enabled && isProtectedOnSite;

  const featureItems: {
    key: keyof ShieldFeatures;
    title: string;
    subtitle: string;
    icon: typeof Ban;
    badgeCount?: number;
    color: string;
  }[] = [
    {
      key: "adBlock",
      title: "Ad Blocker",
      subtitle: "Banners, video ads & cosmetics",
      icon: Ban,
      badgeCount: detailedStats?.byCategory.ad,
      color: "text-red-400",
    },
    {
      key: "trackerProtection",
      title: "Tracker Protection",
      subtitle: "Telemetry & tracking parameters",
      icon: EyeOff,
      badgeCount: detailedStats?.byCategory.tracker,
      color: "text-amber-400",
    },
    {
      key: "malvertisingProtection",
      title: "Malvertising Shield",
      subtitle: "Cryptominers & malicious exploits",
      icon: Skull,
      badgeCount: detailedStats?.byCategory.malvertising,
      color: "text-rose-400",
    },
    {
      key: "customRules",
      title: "Custom Rules",
      subtitle: `${customRules.length} user rule${customRules.length === 1 ? "" : "s"} defined`,
      icon: FileCode2,
      badgeCount: detailedStats?.byCategory.custom,
      color: "text-blue-400",
    },
  ];

  return (
    <div className="relative flex items-center">
      {/* Navigation Bar Shield Button */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        title={
          enabled
            ? isProtectedOnSite
              ? `Forge Shield: Active (${siteBlockedCount} blocked on this site)`
              : `Forge Shield: Disabled for ${domain}`
            : "Forge Shield: Completely OFF"
        }
        className={`h-5.5 px-1.5 rounded flex items-center gap-1 transition-all cursor-pointer select-none text-[11px] font-semibold border ${
          isEffectivelyActive
            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
            : enabled && !isProtectedOnSite
            ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
            : "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
        }`}
      >
        {isEffectivelyActive ? (
          <ShieldCheck size={13} className="shrink-0 text-emerald-400" />
        ) : enabled && !isProtectedOnSite ? (
          <ShieldAlert size={13} className="shrink-0 text-amber-400" />
        ) : (
          <ShieldX size={13} className="shrink-0 text-red-400" />
        )}

        {/* Small blocked count badge on current site if > 0 */}
        {isEffectivelyActive && siteBlockedCount > 0 && (
          <span className="font-mono text-[10px] font-bold text-emerald-400">
            {siteBlockedCount}
          </span>
        )}

        {!enabled && (
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">
            OFF
          </span>
        )}
      </button>

      {/* Forge Shield Popover Menu */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-2 w-84 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] shadow-2xl rounded-xl z-50 overflow-hidden text-[11px] select-none animate-fadeIn"
          style={{ backdropFilter: "blur(12px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-[var(--forge-border)] bg-[var(--forge-surface)]/60">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-lg border ${
                  isEffectivelyActive
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-red-500/15 text-red-400 border-red-500/30"
                }`}
              >
                {isEffectivelyActive ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[12px] text-[var(--forge-text)]">
                  Forge Shield
                </span>
                <span
                  className="text-[10px] text-[var(--forge-text-muted)] truncate max-w-[170px] font-mono"
                  title={domain}
                >
                  {domain}
                </span>
              </div>
            </div>

            {/* Status Pill */}
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                isEffectivelyActive
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-red-500/20 text-red-300 border-red-500/40"
              }`}
            >
              {isEffectivelyActive ? "Shields UP" : "Shields DOWN"}
            </span>
          </div>

          {/* Main Global Protection Toggle */}
          <div className="p-3 border-b border-[var(--forge-border)] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-[11px] text-[var(--forge-text)]">
                  Master Shield Switch
                </span>
                <span className="text-[10px] text-[var(--forge-text-muted)]">
                  {enabled ? "All protections active" : "Forge Shield is completely paused"}
                </span>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={toggleEnabled}
                role="switch"
                aria-checked={enabled}
                className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer border ${
                  enabled
                    ? "bg-emerald-500 border-emerald-400"
                    : "bg-[var(--forge-input)] border-[var(--forge-border)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-md ${
                    enabled ? "translate-x-4.5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Per-site protection switch (only if on a real webpage) */}
            {!isBlank && (
              <div className="flex items-center justify-between pt-2 border-t border-[var(--forge-border)]/60">
                <div className="flex flex-col">
                  <span className="font-semibold text-[11px] text-[var(--forge-text)]">
                    Protect this site
                  </span>
                  <span className="text-[10px] text-[var(--forge-text-muted)]">
                    {isProtectedOnSite
                      ? "Shield active on this domain"
                      : "Allowlisted (protections skipped)"}
                  </span>
                </div>

                <button
                  onClick={() => toggleSiteProtection(domain)}
                  role="switch"
                  aria-checked={isProtectedOnSite}
                  disabled={!enabled}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer border ${
                    !enabled
                      ? "opacity-40 cursor-not-allowed bg-[var(--forge-input)] border-[var(--forge-border)]"
                      : isProtectedOnSite
                      ? "bg-emerald-500 border-emerald-400"
                      : "bg-[var(--forge-input)] border-[var(--forge-border)]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform shadow-md ${
                      isProtectedOnSite && enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* 4 Functional Protection Modules */}
          <div className="px-3 py-2 border-b border-[var(--forge-border)] bg-[var(--forge-surface)]/20 flex flex-col gap-1.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-[var(--forge-text-muted)]">
              Protection Modules
            </span>

            {featureItems.map((item) => {
              const Icon = item.icon;
              const isActive = features[item.key] && enabled;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[var(--forge-surface-hover)]/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={item.color} />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[11px] text-[var(--forge-text)]">
                          {item.title}
                        </span>
                        {item.badgeCount !== undefined && item.badgeCount > 0 && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-[var(--forge-input)] text-[var(--forge-text-muted)] border border-[var(--forge-border)]">
                            {item.badgeCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[var(--forge-text-muted)]">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleFeature(item.key)}
                    role="switch"
                    aria-checked={features[item.key]}
                    disabled={!enabled}
                    className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer border ${
                      !enabled
                        ? "opacity-40 cursor-not-allowed bg-[var(--forge-input)] border-[var(--forge-border)]"
                        : isActive
                        ? "bg-emerald-500 border-emerald-400"
                        : "bg-[var(--forge-input)] border-[var(--forge-border)]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-md ${
                        features[item.key] ? "translate-x-3.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Block Statistics Overview Card (5th Module) */}
          <div className="p-3 bg-[var(--forge-surface)]/40 border-b border-[var(--forge-border)] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-extrabold text-[var(--forge-text-muted)]">
              <span>Shield Analytics</span>
              <span className="font-mono text-emerald-400 lowercase text-[10px]">
                {totalBlocked} blocked total
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-2 p-1.5 rounded-md bg-[var(--forge-input)] border border-[var(--forge-border)]">
                <HardDrive size={13} className="text-cyan-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-[var(--forge-text-muted)]">Data Saved</span>
                  <span className="font-mono font-bold text-[10px] text-[var(--forge-text)]">
                    {formatBytes(detailedStats?.estimatedBandwidthSavedBytes ?? 0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-1.5 rounded-md bg-[var(--forge-input)] border border-[var(--forge-border)]">
                <Clock size={13} className="text-purple-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-[var(--forge-text-muted)]">Time Saved</span>
                  <span className="font-mono font-bold text-[10px] text-[var(--forge-text)]">
                    {((detailedStats?.estimatedTimeSavedMs ?? 0) / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="p-2 bg-[var(--forge-surface)]/60 flex items-center gap-1.5">
            <button
              onClick={() => {
                onReload();
                setIsOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text)] border border-[var(--forge-border)] font-semibold transition-colors cursor-pointer"
              title="Reload page to apply shield updates"
            >
              <RotateCw size={11} />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
