import { useState } from "react";
import { X, ShieldCheck, Download, Loader2, CheckCircle2, AlertTriangle, AppWindow } from "lucide-react";
import { usePwaStore } from "../../../core/pwa/pwaStore.ts";

export function PwaInstallModal() {
  const activeModalTabId = usePwaStore((s) => s.activeModalTabId);
  const eligibility = usePwaStore((s) => (activeModalTabId ? s.eligibilityByTab[activeModalTabId] : undefined));
  const closeInstallModal = usePwaStore((s) => s.closeInstallModal);
  const installPwa = usePwaStore((s) => s.installPwa);
  const isInstalling = usePwaStore((s) => s.isInstalling);

  const [installError, setInstallError] = useState<string | null>(null);

  if (!activeModalTabId || !eligibility || !eligibility.manifest) {
    return null;
  }

  const manifest = eligibility.manifest;
  const displayName = manifest.name || manifest.shortName || "Web Application";
  const iconUrl = eligibility.bestIconUrl;
  let domain = "";
  try {
    domain = new URL(manifest.startUrl).hostname;
  } catch {
    domain = manifest.startUrl;
  }

  const handleInstallClick = async () => {
    setInstallError(null);
    const result = await installPwa(activeModalTabId);
    if (!result.success) {
      setInstallError(result.error || "Installation failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--forge-text)]">
            <AppWindow size={16} className="text-[#FF6B00]" />
            <span>Install Web Application</span>
          </div>
          <button
            type="button"
            onClick={closeInstallModal}
            className="p-1 rounded-md text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* App Identity Banner */}
          <div className="flex items-center gap-3.5 p-3 rounded-lg bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={displayName}
                className="w-12 h-12 rounded-xl object-contain bg-black/20 p-1 border border-white/10 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center font-bold text-lg border border-[#FF6B00]/30 shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-[var(--forge-text)] truncate">{displayName}</span>
              <span className="text-xs text-[var(--forge-text-muted)] truncate">{domain}</span>
            </div>
          </div>

          {manifest.description && (
            <p className="text-xs text-[var(--forge-text-muted)] leading-relaxed line-clamp-2">
              {manifest.description}
            </p>
          )}

          {/* Security Gate Verification Badges */}
          <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#FF6B00]/5 border border-[#FF6B00]/20 text-xs">
            <div className="flex items-center gap-2 font-medium text-[#FF6B00]">
              <ShieldCheck size={14} className="shrink-0" />
              <span>Forge Security Gate Verified</span>
            </div>
            <div className="flex flex-col gap-1 mt-1 text-[11px] text-[var(--forge-text-muted)]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span>Encrypted connection with validated TLS certificate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span>Verified scope and same-origin integrity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                <span>Runs in isolated desktop window with native OS shortcut</span>
              </div>
            </div>
          </div>

          {installError && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{installError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/20">
          <button
            type="button"
            onClick={closeInstallModal}
            disabled={isInstalling}
            className="px-3 py-1.5 text-xs font-medium text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#FF6B00] hover:bg-[#e05e00] rounded-md shadow-xs shadow-[#FF6B00]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isInstalling ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Installing...</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Install</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
