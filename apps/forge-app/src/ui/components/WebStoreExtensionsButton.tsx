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
  Settings,
  X,
  Shield,
  Smartphone,
  Music,
  Camera,
  Gauge,
  Layers,
  Code2,
  RefreshCw,
  AlertTriangle,
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
  const [activeTab, setActiveTab] = useState<"installed" | "catalog">("installed");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Extension specific mockup states
  const [ublockEnabled, setUblockEnabled] = useState(true);
  const [shazamListening, setShazamListening] = useState(false);
  const [screenshotProgress, setScreenshotProgress] = useState(false);

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
    toggleExtension,
    togglePinExtension,
    uninstallExtension,
    installFromWebStoreUrl,
  } = useExtensionsStore();

  const browserExtensions = extensions.filter((e) => e.type === "browser");
  const pinnedExtensions = browserExtensions.filter((e) => e.pinned && e.enabled);
  const enabledCount = browserExtensions.filter((e) => e.enabled).length;

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

  const handleInstallFromInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const res = installFromWebStoreUrl(urlInput.trim());
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(null), 3500);
    setUrlInput("");
    setActiveTab("installed");
  };

  const handlePinnedIconClick = (ext: ForgeExtension) => {
    setIsMenuOpen(false);
    setActivePopupId((prev) => (prev === ext.id ? null : ext.id));
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-1 select-none">
      {/* ═══ 1. Pinned Extension Icons (Exact match to Chrome Toolbar) ═══ */}
      {pinnedExtensions.map((ext) => (
        <button
          key={ext.id}
          type="button"
          onClick={() => handlePinnedIconClick(ext)}
          title={`${ext.name}`}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer relative p-1 ${
            activePopupId === ext.id
              ? "bg-[var(--forge-hover)] ring-1 ring-[#FF6B00]/40 shadow-sm"
              : "hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white"
          }`}
        >
          {renderExtensionIcon(ext.icon, ext.name)}
        </button>
      ))}

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

      {/* ═══ 3. Interactive Popups for Pinned Extensions ═══ */}
      {activePopupId && (
        <div
          ref={popupRef}
          className="absolute right-0 top-9 z-[10080] w-80 bg-[#1c1c1f]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden font-sans select-none animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150 ring-1 ring-black/60 text-zinc-200"
        >
          {/* Popup: Wappalyzer */}
          {activePopupId === "ext-wappalyzer" && (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[#491775] flex items-center justify-center text-white text-xs font-bold">
                    w
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Wappalyzer</h4>
                    <p className="text-[10px] text-zinc-400">Technologies detected on this page</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                  <span className="font-semibold text-white">JavaScript Framework</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    React 19.2.4
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                  <span className="font-semibold text-white">Build Tool & Bundler</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    Vite 6.2
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                  <span className="font-semibold text-white">UI Styles</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    Tailwind CSS
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                  <span className="font-semibold text-white">Programming Language</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    TypeScript 5.8
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Popup: Responsive Viewer */}
          {activePopupId === "ext-responsive-viewer" && (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-blue-400" />
                  <h4 className="text-xs font-bold text-white">Responsive Viewer</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="p-2 rounded bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/40 text-left transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-white">Desktop HD</p>
                  <p className="text-[10px] text-zinc-400">1920 × 1080</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="p-2 rounded bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/40 text-left transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-white">Laptop Air</p>
                  <p className="text-[10px] text-zinc-400">1366 × 768</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="p-2 rounded bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/40 text-left transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-white">iPhone 15 Pro</p>
                  <p className="text-[10px] text-zinc-400">393 × 852</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="p-2 rounded bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/40 text-left transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-white">iPad Pro 11"</p>
                  <p className="text-[10px] text-zinc-400">834 × 1194</p>
                </button>
              </div>
            </div>
          )}

          {/* Popup: Shazam */}
          {activePopupId === "ext-shazam" && (
            <div className="p-4 text-center space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#0088FF] flex items-center justify-center text-white text-xs font-bold">
                    S
                  </div>
                  <h4 className="text-xs font-bold text-white">Shazam</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="py-3 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShazamListening(!shazamListening)}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    shazamListening
                      ? "bg-[#0088FF] ring-8 ring-[#0088FF]/30 scale-105 animate-pulse text-white"
                      : "bg-[#0088FF]/20 text-[#0088FF] hover:bg-[#0088FF] hover:text-white"
                  }`}
                >
                  <Music size={26} />
                </button>
                <p className="text-xs font-semibold text-white mt-3">
                  {shazamListening ? "Listening to tab audio..." : "Click to Shazam"}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Identify music playing in YouTube, Spotify, or videos
                </p>
              </div>
            </div>
          )}

          {/* Popup: React Developer Tools */}
          {activePopupId === "ext-react-devtools" && (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Code2 size={16} className="text-[#61DAFB]" />
                  <h4 className="text-xs font-bold text-white">React Developer Tools</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="p-2 rounded bg-[#20232A] border border-[#61DAFB]/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#61DAFB] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>React 19.2.4 detected</span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Environment: Development (Vite HMR Active)
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="flex-1 py-1.5 rounded bg-[#61DAFB]/20 hover:bg-[#61DAFB]/30 text-[#61DAFB] font-bold text-xs transition-colors cursor-pointer"
                >
                  Components
                </button>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="flex-1 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Profiler
                </button>
              </div>
            </div>
          )}

          {/* Popup: uBlock Origin */}
          {activePopupId === "ext-ublock-origin" && (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-rose-500" />
                  <h4 className="text-xs font-bold text-white">uBlock Origin</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="flex flex-col items-center py-2">
                <button
                  type="button"
                  onClick={() => setUblockEnabled(!ublockEnabled)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    ublockEnabled
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
                      : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                  }`}
                >
                  <Power size={24} />
                </button>
                <p className="text-xs font-bold text-white mt-2">
                  {ublockEnabled ? "Shield Protection Active" : "Disabled on this page"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-white/5 border border-white/5">
                  <p className="text-lg font-bold text-white">24</p>
                  <p className="text-[10px] text-zinc-400">Blocked on page</p>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/5">
                  <p className="text-lg font-bold text-white">3,412</p>
                  <p className="text-[10px] text-zinc-400">Total blocked</p>
                </div>
              </div>
            </div>
          )}

          {/* Popup: GoFullPage */}
          {activePopupId === "ext-gofullpage" && (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-blue-500" />
                  <h4 className="text-xs font-bold text-white">GoFullPage</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <p className="text-xs text-zinc-400">
                Capture the entire webpage from top to bottom into high-resolution PNG or PDF.
              </p>

              <button
                type="button"
                onClick={() => {
                  setScreenshotProgress(true);
                  setTimeout(() => {
                    setScreenshotProgress(false);
                    setActivePopupId(null);
                  }, 1200);
                }}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {screenshotProgress ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Capturing Full Page...</span>
                  </>
                ) : (
                  <>
                    <Camera size={13} />
                    <span>Capture Full Page</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Popup: Lighthouse */}
          {activePopupId === "ext-lighthouse" && (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-amber-500" />
                  <h4 className="text-xs font-bold text-white">Lighthouse</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePopupId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="p-1.5 rounded bg-white/5">
                  <span className="text-emerald-400 font-bold text-sm">98</span>
                  <p className="text-[9px] text-zinc-400 truncate">Perf</p>
                </div>
                <div className="p-1.5 rounded bg-white/5">
                  <span className="text-emerald-400 font-bold text-sm">95</span>
                  <p className="text-[9px] text-zinc-400 truncate">A11y</p>
                </div>
                <div className="p-1.5 rounded bg-white/5">
                  <span className="text-emerald-400 font-bold text-sm">100</span>
                  <p className="text-[9px] text-zinc-400 truncate">Best</p>
                </div>
                <div className="p-1.5 rounded bg-white/5">
                  <span className="text-emerald-400 font-bold text-sm">100</span>
                  <p className="text-[9px] text-zinc-400 truncate">SEO</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivePopupId(null)}
                className="w-full py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs transition-colors cursor-pointer"
              >
                Generate Fresh Report
              </button>
            </div>
          )}
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
              disabled={!urlInput.trim()}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            >
              <Plus size={12} />
              <span>Install</span>
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
              <div className="p-4 text-center text-xs text-zinc-400">
                No browser extensions installed.
              </div>
            ) : (
              browserExtensions.map((ext) => (
                <div
                  key={ext.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.05] transition-colors text-xs group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                      {renderExtensionIcon(ext.icon, ext.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate text-[11px] leading-tight">
                        {ext.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">
                        v{ext.version} • {ext.author}
                      </p>
                    </div>
                  </div>

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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
