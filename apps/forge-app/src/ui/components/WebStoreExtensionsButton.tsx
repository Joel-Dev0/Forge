import React, { useState, useRef, useEffect } from "react";
import {
  ExternalLink,
  Pin,
  PinOff,
  Trash2,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";
import { useExtensionsStore } from "../../core/extensions/useExtensionsStore";
import type { ForgeExtension } from "../../core/extensions/extensionTypes";

interface Props {
  onNavigate?: (url: string) => void;
}

// ═══ Official Google Chrome / Material Design Extension Outlined Puzzle Icon ═══
// Exact 1:1 path from Google's official vector_icons / Material Icons Outlined
export function ChromeExtensionPuzzleIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.5 4.5c.28 0 .5.22.5.5v2h6v6h2c.28 0 .5.22.5.5s-.22.5-.5.5h-2v6h-2.12c-.68-1.75-2.39-3-4.38-3s-3.7 1.25-4.38 3H4v-2.12c1.75-.68 3-2.39 3-4.38 0-1.99-1.24-3.7-2.99-4.38L4 7h6V5c0-.28.22-.5.5-.5m0-2C9.12 2.5 8 3.62 8 5H4c-1.1 0-1.99.9-1.99 2v3.8h.29c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-.3c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7v.3H17c1.1 0 2-.9 2-2v-4c1.38 0 2.5-1.12 2.5-2.5S20.38 11 19 11V7c0-1.1-.9-2-2-2h-4c0-1.38-1.12-2.5-2.5-2.5z" />
    </svg>
  );
}

// Crisp Google Chrome 4-color Wheel Logo
export function ChromeWebStoreIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" fill="none" className={className}>
      <circle cx="96" cy="96" r="96" fill="#4285F4" />
      <path d="M96 48a48 48 0 1 0 0 96 48 48 0 0 0 0-96z" fill="#ffffff" />
      <path d="M96 60a36 36 0 1 0 0 72 36 36 0 0 0 0-72z" fill="#4285F4" />
      <path d="M96 48h83.1A96 96 0 0 0 48 12.9L89.5 84.8A48 48 0 0 1 96 48z" fill="#EA4335" />
      <path d="M96 144l-41.6 72A96 96 0 0 0 179.1 144H96z" fill="#34A853" />
      <path d="M12.9 48a96 96 0 0 0 41.5 120l41.6-72A48 48 0 0 1 12.9 48z" fill="#FBBC05" />
    </svg>
  );
}

// Fallback icon generator if icon string is missing
function renderExtensionIcon(iconSvg?: string, name?: string) {
  if (iconSvg) {
    return (
      <div
        className="w-4 h-4 flex items-center justify-center shrink-0 pointer-events-none drop-shadow-sm select-none"
        dangerouslySetInnerHTML={{ __html: iconSvg }}
      />
    );
  }
  return (
    <div className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white select-none">
      {name ? name.charAt(0).toUpperCase() : "E"}
    </div>
  );
}

export function WebStoreExtensionsButton({ onNavigate }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [moreMenuExtId, setMoreMenuExtId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const {
    extensions,
    actionBadges,
    setManagerOpen,
    togglePinExtension,
    uninstallExtension,
  } = useExtensionsStore();

  const browserExtensions = extensions.filter((e) => e.type === "browser");
  const pinnedExtensions = browserExtensions.filter((e) => e.pinned && e.enabled);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setMoreMenuExtId(null);
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
    setMoreMenuExtId(null);
  };

  // 1:1 Chrome native extension action: opens native popup window or triggers action.onClicked
  const handleExtensionClick = async (ext: ForgeExtension, e: React.MouseEvent<HTMLElement>) => {
    setIsMenuOpen(false);
    setMoreMenuExtId(null);
    const forgeApi = (window as any).forge;
    if (forgeApi?.extensions?.openPopup) {
      try {
        const rect = e.currentTarget.getBoundingClientRect();
        await forgeApi.extensions.openPopup(ext.id, {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      } catch (err) {
        console.warn("[Extensions] Failed to open extension popup:", err);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-1 select-none">
      {/* ═══ 1. Pinned Extension Icons (Immediately to the left of the Puzzle piece, matching Chrome toolbar) ═══ */}
      {pinnedExtensions.map((ext) => {
        const badge = actionBadges[ext.id.toLowerCase()];
        return (
          <button
            key={ext.id}
            type="button"
            onClick={(e) => handleExtensionClick(ext, e)}
            title={badge?.title || ext.name}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--forge-hover)] text-zinc-300 hover:text-white transition-all cursor-pointer relative p-1"
          >
            {renderExtensionIcon(ext.icon, ext.name)}
            {badge?.text && (
              <span
                className="absolute -top-1 -right-1 px-1 min-w-[13px] h-[13px] rounded-full text-[8.5px] font-bold flex items-center justify-center pointer-events-none shadow"
                style={{
                  backgroundColor: badge.backgroundColor || "#1a73e8",
                  color: badge.textColor || "#ffffff",
                }}
              >
                {badge.text}
              </span>
            )}
          </button>
        );
      })}

      {/* ═══ 2. Official Google Chrome Extensions Puzzle Icon Button ═══ */}
      <button
        type="button"
        onClick={() => {
          setMoreMenuExtId(null);
          setIsMenuOpen((prev) => !prev);
        }}
        title="Extensions"
        aria-label="Extensions"
        className={`w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer relative ${
          isMenuOpen
            ? "bg-white/15 text-[#8ab4f8]"
            : "hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-white"
        }`}
      >
        <ChromeExtensionPuzzleIcon size={16} />
      </button>

      {/* ═══ 3. Official Google Chrome Extensions Popover Menu ═══ */}
      {isMenuOpen && (
        <div className="absolute right-0 top-9 z-[10070] w-80 bg-[#292a2d] border border-[#3c4043] rounded-xl shadow-2xl overflow-hidden flex flex-col text-[#e8eaed] font-sans animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/60">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#3c4043] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChromeExtensionPuzzleIcon size={16} className="text-[#8ab4f8]" />
              <h3 className="text-sm font-medium text-[#e8eaed] tracking-tight">
                Extensions
              </h3>
            </div>
            <button
              type="button"
              onClick={handleOpenChromeWebStore}
              title="Open Chrome Web Store"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[#8ab4f8] hover:text-sky-300 text-xs font-medium transition-colors border border-white/10 cursor-pointer"
            >
              <ChromeWebStoreIcon size={13} />
              <span>Web Store</span>
              <ExternalLink size={11} />
            </button>
          </div>

          {/* Extensions List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            {browserExtensions.length === 0 ? (
              <div className="py-7 px-4 text-center text-xs text-[#9aa0a6] flex flex-col items-center justify-center space-y-2.5">
                <div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center text-[#8ab4f8] mb-0.5 border border-white/10">
                  <ChromeExtensionPuzzleIcon size={24} />
                </div>
                <div>
                  <p className="font-semibold text-white text-xs">No extensions installed</p>
                  <p className="text-[11px] text-[#9aa0a6] mt-1 max-w-[230px] leading-relaxed">
                    Install extensions directly from the Chrome Web Store.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenChromeWebStore}
                  className="mt-1 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#8ab4f8] hover:bg-[#a8c7fa] text-[#202124] text-xs font-semibold transition-all shadow-md cursor-pointer"
                >
                  <ChromeWebStoreIcon size={14} />
                  <span>Discover Chrome Extensions</span>
                </button>
              </div>
            ) : (
              browserExtensions.map((ext) => {
                const badge = actionBadges[ext.id.toLowerCase()];
                const isMenuForThisExtOpen = moreMenuExtId === ext.id;

                return (
                  <div
                    key={ext.id}
                    className="relative flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.08] transition-colors text-xs group"
                  >
                    {/* Extension Click Row */}
                    <button
                      type="button"
                      onClick={(e) => handleExtensionClick(ext, e)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group/title"
                    >
                      <div className="w-6 h-6 rounded-md bg-black/40 border border-white/10 flex items-center justify-center shrink-0 relative">
                        {renderExtensionIcon(ext.icon, ext.name)}
                        {badge?.text && (
                          <span
                            className="absolute -top-1 -right-1 px-1 min-w-[11px] h-[11px] rounded-full text-[7.5px] font-bold flex items-center justify-center pointer-events-none shadow"
                            style={{
                              backgroundColor: badge.backgroundColor || "#8ab4f8",
                              color: badge.textColor || "#202124",
                            }}
                          >
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 pr-1">
                        <p className="font-medium text-[#e8eaed] group-hover/title:text-[#8ab4f8] transition-colors truncate text-[12px] leading-tight">
                          {ext.name}
                        </p>
                        <p className="text-[10px] text-[#9aa0a6] truncate mt-0.5">
                          v{ext.version}
                        </p>
                      </div>
                    </button>

                    {/* Action Buttons: Pin to toolbar & Three Dots Menu */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Pin Button */}
                      <button
                        type="button"
                        onClick={() => togglePinExtension(ext.id)}
                        title={ext.pinned ? "Unpin from toolbar" : "Pin to toolbar"}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          ext.pinned
                            ? "text-[#8ab4f8] bg-[#8ab4f8]/15"
                            : "text-[#9aa0a6] hover:text-[#e8eaed] opacity-60 group-hover:opacity-100"
                        }`}
                      >
                        {ext.pinned ? <Pin size={13} fill="currentColor" /> : <PinOff size={13} />}
                      </button>

                      {/* Three Dots More Menu */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoreMenuExtId((prev) => (prev === ext.id ? null : ext.id));
                        }}
                        title="More actions"
                        className={`p-1.5 rounded-lg text-[#9aa0a6] hover:text-[#e8eaed] transition-colors cursor-pointer ${
                          isMenuForThisExtOpen ? "bg-white/10 text-white" : ""
                        }`}
                      >
                        <MoreVertical size={13} />
                      </button>

                      {/* Context Submenu */}
                      {isMenuForThisExtOpen && (
                        <div className="absolute right-2 top-full mt-1 z-[10090] w-48 bg-[#292a2d] border border-[#3c4043] rounded-xl shadow-2xl p-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50">
                          <button
                            type="button"
                            onClick={() => {
                              togglePinExtension(ext.id);
                              setMoreMenuExtId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-[#e8eaed] transition-colors cursor-pointer"
                          >
                            <Pin size={12} className={ext.pinned ? "text-[#8ab4f8]" : ""} />
                            <span>{ext.pinned ? "Unpin from toolbar" : "Pin to toolbar"}</span>
                          </button>

                          {ext.webStoreUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigate) onNavigate(ext.webStoreUrl!);
                                else window.open(ext.webStoreUrl, "_blank");
                                setMoreMenuExtId(null);
                                setIsMenuOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left text-[#8ab4f8] transition-colors cursor-pointer"
                            >
                              <ChromeWebStoreIcon size={12} />
                              <span>View in Chrome Web Store</span>
                            </button>
                          )}

                          <div className="my-1 border-t border-[#3c4043]" />

                          <button
                            type="button"
                            onClick={() => {
                              uninstallExtension(ext.id);
                              setMoreMenuExtId(null);
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-left text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Remove from Chrome</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer (Manage extensions & Chrome Web Store) */}
          <div className="px-3 py-2 border-t border-[#3c4043] bg-white/[0.02] flex items-center justify-between text-xs text-[#9aa0a6]">
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setManagerOpen(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-[#e8eaed] transition-colors cursor-pointer font-medium"
            >
              <SlidersHorizontal size={13} />
              <span>Manage extensions</span>
            </button>

            <button
              type="button"
              onClick={handleOpenChromeWebStore}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-[#8ab4f8] hover:text-sky-300 transition-colors cursor-pointer font-medium"
            >
              <ChromeWebStoreIcon size={13} />
              <span>Chrome Web Store</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
