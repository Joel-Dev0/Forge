import React, { useState, useRef, useEffect } from "react";
import {
  Puzzle,
  ExternalLink,
  Pin,
  PinOff,
  Power,
  Plus,
  Trash2,
  Check,
  X,
  Shield,
  AlertTriangle,
  Cpu,
} from "lucide-react";
import { useExtensionsStore } from "../../core/extensions/useExtensionsStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";
import { useSessionsStore } from "../../core/sessions/useSessionsStore";
import type { ForgeExtension } from "../../core/extensions/extensionTypes";

interface Props {
  onNavigate?: (url: string) => void;
}

// Fallback icon generator if icon string is missing
function renderExtensionIcon(iconSvg?: string, name?: string) {
  if (iconSvg) {
    return (
      <div
        className="w-4.5 h-4.5 flex items-center justify-center shrink-0 pointer-events-none drop-shadow-sm select-none"
        dangerouslySetInnerHTML={{ __html: iconSvg }}
      />
    );
  }
  return (
    <div className="w-4.5 h-4.5 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
      {name ? name.charAt(0) : "E"}
    </div>
  );
}

export function WebStoreExtensionsButton({ onNavigate }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const { tabs, activeTabId } = useTabsStore();
  const { getSession } = useSessionsStore();
  const activeTabObj = tabs.find((t) => t.id === activeTabId);
  const currentSession = getSession(activeTabObj?.sessionId);
  const isTor = currentSession.mode === "tor" || activeTabObj?.sessionId === "tor" || activeTabObj?.sessionId?.startsWith("tor_");
  const isPrivate = currentSession.mode === "private" || activeTabObj?.sessionId === "private" || activeTabObj?.sessionId?.startsWith("private_");

  const {
    extensions,
    diagnosticSummaries,
    actionBadges,
    setManagerOpen,
    toggleExtension,
    togglePinExtension,
    uninstallExtension,
    installFromWebStoreUrl,
  } = useExtensionsStore();

  const browserExtensions = extensions.filter((e) => e.type === "browser");
  const pinnedExtensions = browserExtensions.filter((e) => e.pinned && e.enabled);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
        setActivePopupId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleOpenChromeWebStore = () => {
    const url = "https://chromewebstore.google.com/";
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.open(url, "_blank");
    }
    setIsMenuOpen(false);
  };

  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallFromInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isInstalling) return;

    setIsInstalling(true);
    setActionFeedback("Downloading & installing extension package...");
    try {
      const res = await installFromWebStoreUrl(urlInput.trim());
      setActionFeedback(res.message);
      setTimeout(() => setActionFeedback(null), 4000);
      if (res.success) setUrlInput("");
    } catch (err: any) {
      setActionFeedback(`Installation failed: ${err?.message || "Unknown error"}`);
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setIsInstalling(false);
    }
  };

  const handlePinnedIconClick = async (ext: ForgeExtension, e: React.MouseEvent<HTMLButtonElement>) => {
    setIsMenuOpen(false);
    const forgeApi = (window as any).forge;
    if (forgeApi?.extensions?.getPopupInfo) {
      try {
        const popupInfo = await forgeApi.extensions.getPopupInfo(ext.id);
        if (popupInfo?.hasPopup && forgeApi.extensions.openPopup) {
          const rect = e.currentTarget.getBoundingClientRect();
          await forgeApi.extensions.openPopup(ext.id, {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
          return;
        }
      } catch {}
    }
    setActivePopupId((prev) => (prev === ext.id ? null : ext.id));
  };

  const activeExt = extensions.find((e) => e.id === activePopupId);

  return (
    <div ref={containerRef} className="relative flex items-center gap-1 select-none">
      {/* ═══ 1. Pinned Extension Icons (From Chrome Web Store) ═══ */}
      {pinnedExtensions.map((ext) => {
        const badge = actionBadges[ext.id.toLowerCase()];
        return (
          <button
            key={ext.id}
            type="button"
            onClick={(e) => handlePinnedIconClick(ext, e)}
            title={badge?.title || ext.name}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer relative p-1 ${
              activePopupId === ext.id
                ? "bg-[var(--forge-hover)] ring-1 ring-[#FF6B00]/40 shadow-sm"
                : "hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white"
            }`}
          >
            {renderExtensionIcon(ext.icon, ext.name)}
            {badge?.text && (
              <span
                className="absolute -top-1 -right-1 px-1 min-w-[13px] h-[13px] rounded-full text-[8.5px] font-bold flex items-center justify-center pointer-events-none shadow"
                style={{
                  backgroundColor: badge.backgroundColor || "#FF6B00",
                  color: badge.textColor || "#ffffff",
                }}
              >
                {badge.text}
              </span>
            )}
          </button>
        );
      })}

      {/* ═══ 2. Chrome Extension Puzzle Piece Hub Button ═══ */}
      <button
        type="button"
        onClick={() => {
          setActivePopupId(null);
          setIsMenuOpen((prev) => !prev);
        }}
        title="Extensions (Chrome Web Store)"
        className={`w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
          isMenuOpen
            ? "bg-[#FF6B00]/20 text-[#FF6B00]"
            : "hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-white"
        }`}
      >
        <Puzzle size={15} />
      </button>

      {/* ═══ 3. Extension Action Popup for Pinned Extension ═══ */}
      {activePopupId && activeExt && (
        <div
          ref={popupRef}
          className="absolute right-0 top-9 z-[10080] w-80 bg-[#1c1c1f]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden font-sans select-none animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150 ring-1 ring-black/60 text-zinc-200"
        >
          <div className="p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                  {renderExtensionIcon(activeExt.icon, activeExt.name)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{activeExt.name}</h4>
                  <p className="text-[10px] text-zinc-400 truncate">v{activeExt.version} • {activeExt.author}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePopupId(null)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 space-y-1.5 text-xs">
              <p className="text-[11px] text-zinc-300 leading-relaxed">{activeExt.description}</p>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-400">Active on current page</span>
              </div>
            </div>

            {activeExt.manifestPermissions && activeExt.manifestPermissions.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Manifest Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {activeExt.manifestPermissions.map((p) => (
                    <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
              {activeExt.webStoreUrl && (
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate(activeExt.webStoreUrl!);
                    else window.open(activeExt.webStoreUrl, "_blank");
                    setActivePopupId(null);
                  }}
                  className="flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  <span>Chrome Store page</span>
                  <ExternalLink size={11} />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  uninstallExtension(activeExt.id);
                  setActivePopupId(null);
                }}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 ml-auto transition-colors cursor-pointer"
              >
                <Trash2 size={11} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 4. Extensions Popover Dropdown (Opened by Puzzle button) ═══ */}
      {isMenuOpen && (
        <div className="absolute right-0 top-9 z-[10070] w-96 bg-[#1e1e1e]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[var(--forge-text)] font-sans animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/60">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Puzzle size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Chrome Web Store Extensions</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ONLINE
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Manage pinned Google Chrome extensions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setManagerOpen(true);
                }}
                title="Open Extensions Manager & Matrix"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-mono transition-colors cursor-pointer border border-white/10"
              >
                <Cpu size={11} className="text-[#FF6B00]" />
                <span>Matrix</span>
              </button>
              <button
                type="button"
                onClick={handleOpenChromeWebStore}
                title="Open Chrome Web Store in browser"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-[10px] font-bold transition-all shadow cursor-pointer"
              >
                <span>Web Store</span>
                <ExternalLink size={10} />
              </button>
            </div>
          </div>

          {/* Tor Mode Policy Alert */}
          {isTor && (
            <div className="mx-3 mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[11px] text-amber-200">Extensions Disabled in Tor Mode</div>
                <div className="text-[10px] text-amber-300/80 leading-tight">
                  Third-party extensions are locked down to prevent external network requests, fingerprinting, and IP leaks.
                </div>
              </div>
            </div>
          )}

          {/* Private Window Policy Notice */}
          {isPrivate && !isTor && (
            <div className="mx-3 mt-2.5 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-start gap-2">
              <Shield size={14} className="text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[11px] text-purple-200">Private Window Extension Policy</div>
                <div className="text-[10px] text-purple-300/80 leading-tight">
                  Extensions do not run automatically in private sessions to ensure local RAM isolation.
                </div>
              </div>
            </div>
          )}

          {/* Direct Install Input Box */}
          <form
            onSubmit={handleInstallFromInput}
            className="p-3 border-b border-white/10 bg-black/20 flex items-center gap-1.5"
          >
            <input
              type="text"
              placeholder="Paste Web Store URL or ID to install..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[11px] bg-black/40 border border-white/10 rounded-lg text-white outline-none focus:border-[#FF6B00] transition-colors"
            />
            <button
              type="submit"
              disabled={!urlInput.trim() || isInstalling}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              {isInstalling ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <Plus size={12} />
                  <span>Install</span>
                </>
              )}
            </button>
          </form>

          {/* Feedback banner */}
          {actionFeedback && (
            <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-1.5 animate-in fade-in">
              <Check size={12} />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Extensions List */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-1">
            {browserExtensions.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 mb-1">
                  <Puzzle size={20} />
                </div>
                <p className="font-semibold text-white">No extensions installed</p>
                <p className="text-[11px] text-zinc-400 max-w-[240px] leading-relaxed">
                  Only extensions you add from the official Google Chrome Web Store will appear here.
                </p>
                <button
                  type="button"
                  onClick={handleOpenChromeWebStore}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold transition-all shadow cursor-pointer"
                >
                  <ExternalLink size={12} />
                  <span>Browse Chrome Web Store</span>
                </button>
              </div>
            ) : (
              browserExtensions.map((ext) => {
                const diag = diagnosticSummaries.find((d) => d.extensionId === ext.id.toLowerCase()) || ext.diagnostic;
                const badge = actionBadges[ext.id.toLowerCase()];
                return (
                <div
                  key={ext.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.05] transition-colors text-xs group"
                >
                  <button
                    type="button"
                    onClick={(e) => handlePinnedIconClick(ext, e)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group/title"
                  >
                    <div className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 relative">
                      {renderExtensionIcon(ext.icon, ext.name)}
                      {badge?.text && (
                        <span
                          className="absolute -top-1 -right-1 px-1 min-w-[11px] h-[11px] rounded-full text-[7.5px] font-bold flex items-center justify-center pointer-events-none shadow"
                          style={{
                            backgroundColor: badge.backgroundColor || "#FF6B00",
                            color: badge.textColor || "#ffffff",
                          }}
                        >
                          {badge.text}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white group-hover/title:text-sky-300 transition-colors truncate text-[11px] leading-tight">
                        {ext.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] text-zinc-400 truncate">
                          v{ext.version}
                        </p>
                        {badge?.text && (
                          <span
                            className="text-[8px] font-bold px-1 py-0.2 rounded"
                            style={{
                              backgroundColor: `${badge.backgroundColor || "#FF6B00"}25`,
                              color: badge.backgroundColor || "#FF6B00",
                            }}
                          >
                            {badge.text}
                          </span>
                        )}
                        {diag && (
                          <span className={`text-[8px] font-mono px-1 py-0.2 rounded border ${
                            diag.score >= 90
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                              : diag.score >= 65
                                ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                                : "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          }`}>
                            {diag.score}%
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Pin / Unpin Button */}
                    <button
                      type="button"
                      onClick={() => togglePinExtension(ext.id)}
                      title={ext.pinned ? "Unpin from toolbar" : "Pin to toolbar"}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        ext.pinned
                          ? "text-[#0078d4] bg-[#0078d4]/15"
                          : "text-zinc-500 hover:text-zinc-300 opacity-60 group-hover:opacity-100"
                      }`}
                    >
                      {ext.pinned ? <Pin size={13} fill="currentColor" /> : <PinOff size={13} />}
                    </button>

                    {/* Enable / Disable Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExtension(ext.id)}
                      title={ext.enabled ? "Disable extension" : "Enable extension"}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        ext.enabled
                          ? "text-emerald-400 bg-emerald-500/15"
                          : "text-zinc-500 bg-zinc-800"
                      }`}
                    >
                      <Power size={13} />
                    </button>

                    {/* Uninstall */}
                    <button
                      type="button"
                      onClick={() => uninstallExtension(ext.id)}
                      title="Remove extension"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
