import React, { useState, useRef, useEffect } from "react";
import {
  RotateCw,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Settings,
  Star,
  Download,
  Check,
  Power,
  Trash2,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  ListFilter,
  X,
  Loader2,
  Globe,
  Sparkles,
} from "lucide-react";
import {
  useIdeExtensionsStore,
  type IdeExtension,
} from "../../core/extensions/useIdeExtensionsStore";

interface Props {
  onOpenModal?: () => void;
  onSelectExtension?: (ext: IdeExtension) => void;
  compact?: boolean;
}

function renderExtensionIcon(iconSvg: string, name: string) {
  if (!iconSvg) {
    return (
      <div className="w-9 h-9 rounded-[2px] bg-[#0078d4]/20 border border-[#0078d4]/30 flex items-center justify-center text-white font-bold text-xs">
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  if (
    iconSvg.startsWith("http://") ||
    iconSvg.startsWith("https://") ||
    iconSvg.startsWith("data:image")
  ) {
    return (
      <img
        src={iconSvg}
        alt={name}
        className="w-9 h-9 rounded-[2px] object-contain bg-black/40 p-0.5"
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = "none";
        }}
      />
    );
  }
  return (
    <div
      className="w-9 h-9 rounded-[2px] bg-black/40 flex items-center justify-center shrink-0 overflow-hidden"
      dangerouslySetInnerHTML={{ __html: iconSvg }}
    />
  );
}

export function IdeExtensionsSidebarView({ onOpenModal, onSelectExtension, compact = false }: Props) {
  const {
    extensions,
    installExtension,
    uninstallExtension,
    toggleExtension,
    installFromUrlOrId,
    searchOnlineMarketplace,
  } = useIdeExtensionsStore();

  const [search, setSearch] = useState("");
  const [isInstalledOpen, setIsInstalledOpen] = useState(true);
  const [isRecommendedOpen, setIsRecommendedOpen] = useState(true);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(true);
  const [activeGearMenuId, setActiveGearMenuId] = useState<string | null>(null);
  const [showDirectInstall, setShowDirectInstall] = useState(false);
  const [directInstallInput, setDirectInstallInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [marketplaceResults, setMarketplaceResults] = useState<IdeExtension[]>([]);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const gearMenuRef = useRef<HTMLDivElement | null>(null);

  // Close gear popup on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (gearMenuRef.current && !gearMenuRef.current.contains(e.target as Node)) {
        setActiveGearMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const q = search.toLowerCase().trim();

  // Installed extensions
  const installedList = extensions.filter(
    (e) =>
      e.installed &&
      (!q ||
        e.name.toLowerCase().includes(q) ||
        e.publisher.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q))
  );

  // Recommended extensions (when not searching)
  const recommendedList = extensions.filter(
    (e) =>
      !e.installed &&
      (!q ||
        e.name.toLowerCase().includes(q) ||
        e.publisher.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q))
  );

  // Live marketplace search with 250ms debounce
  useEffect(() => {
    if (!q) {
      setMarketplaceResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsMarketplaceOpen(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchOnlineMarketplace(q);
        const installedIds = new Set(
          extensions.filter((e) => e.installed).map((e) => e.id.toLowerCase())
        );
        const uninstalledMatches = results.filter(
          (e) => !installedIds.has(e.id.toLowerCase())
        );
        setMarketplaceResults(uninstalledMatches);
      } catch (err) {
        console.warn("[IdeExtensions] Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [q, extensions, searchOnlineMarketplace]);

  const handleDirectInstallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directInstallInput.trim()) return;
    const res = installFromUrlOrId(directInstallInput);
    setFeedback(res.message);
    setTimeout(() => setFeedback(null), 3500);
    setDirectInstallInput("");
    setShowDirectInstall(false);
  };

  const handleInstallExtension = async (ext: IdeExtension) => {
    setInstallingId(ext.id);
    const res = installFromUrlOrId(ext.id);
    setFeedback(res.message);
    setTimeout(() => {
      setInstallingId(null);
      setTimeout(() => setFeedback(null), 3000);
    }, 400);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setFeedback(`Copied "${id}" to clipboard`);
    setTimeout(() => setFeedback(null), 2500);
    setActiveGearMenuId(null);
  };

  const isSearchMode = q.length > 0;

  return (
    <div className="flex-1 w-full h-full overflow-hidden flex flex-col bg-[#181818] text-[#cccccc] select-none text-xs font-sans border-r border-[#2d2d2d]">
      {/* ═══ Top Header ═══ */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2d2d2d] bg-[#181818] shrink-0">
        <span className="text-[11px] font-semibold text-[#cccccc] tracking-wide">
          Extensions
        </span>

        <div className="flex items-center gap-1 text-[#cccccc]">
          <button
            type="button"
            onClick={() => {
              setFeedback("Refreshing extension catalog...");
              setTimeout(() => setFeedback(null), 1200);
            }}
            title="Refresh Extensions"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCw size={13} />
          </button>

          <button
            type="button"
            onClick={() => setShowDirectInstall((prev) => !prev)}
            title="More Actions / Install by ID"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* ═══ Search & Marketplace Notice ═══ */}
      <div className="p-2 border-b border-[#2d2d2d] space-y-1.5 shrink-0 bg-[#181818]">
        {/* Search input with icons */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-[2px] bg-[#313131] border border-[#3c3c3c] focus-within:border-[#007fd4] transition-colors">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Extensions in Marketplace"
            className="flex-1 bg-transparent text-[11px] text-[#ffffff] outline-none placeholder-[#8c8c8c] min-w-0"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-[#8c8c8c] hover:text-white cursor-pointer shrink-0"
            >
              <X size={11} />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[#8c8c8c] shrink-0">
              <ListFilter size={11} className="hover:text-white cursor-pointer" title="Filter" />
              <SlidersHorizontal size={11} className="hover:text-white cursor-pointer" title="More Filters" />
            </div>
          )}
        </div>

        {/* Direct Install Box (revealed on ... click) */}
        {showDirectInstall && (
          <form
            onSubmit={handleDirectInstallSubmit}
            className="flex items-center gap-1.5 pt-1 animate-in fade-in duration-150"
          >
            <input
              type="text"
              placeholder="Paste extension ID (e.g. ritwickdey.liveserver)..."
              value={directInstallInput}
              onChange={(e) => setDirectInstallInput(e.target.value)}
              className="flex-1 px-2 py-1 text-[11px] bg-[#252526] border border-[#3c3c3c] rounded-[2px] text-white outline-none focus:border-[#007fd4]"
            />
            <button
              type="submit"
              disabled={!directInstallInput.trim()}
              className="px-2.5 py-1 rounded-[2px] bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-40 text-white text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
            >
              Install
            </button>
          </form>
        )}

        {/* Feedback pill */}
        {feedback && (
          <div className="px-2 py-0.5 rounded-[2px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] flex items-center gap-1 animate-in fade-in">
            <Check size={11} />
            <span className="truncate">{feedback}</span>
          </div>
        )}

        {/* Callout Notice from screenshot */}
        <p className="text-[11px] text-[#cccccc] leading-snug px-0.5 pt-0.5">
          By default, Antigravity IDE uses{" "}
          <a
            href="https://open-vsx.org"
            target="_blank"
            rel="noreferrer"
            className="text-[#3794ff] hover:underline"
          >
            Open VSX
          </a>{" "}
          as a marketplace. This can be changed in{" "}
          <span
            onClick={onOpenModal}
            className="text-[#3794ff] hover:underline cursor-pointer"
          >
            Antigravity IDE settings
          </span>
          .
        </p>
      </div>

      {/* ═══ Scrollable Extension Sections ═══ */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 no-scrollbar bg-[#181818]">
        {/* ── SECTION 1: INSTALLED ── */}
        <div className="flex flex-col">
          {/* Section Accordion Header */}
          <button
            type="button"
            onClick={() => setIsInstalledOpen((prev) => !prev)}
            className="w-full px-2 py-1.5 flex items-center justify-between text-left hover:bg-[#2a2d2e] transition-colors cursor-pointer font-bold text-[#cccccc] text-[11px] select-none"
          >
            <div className="flex items-center gap-1">
              {isInstalledOpen ? <ChevronDown size={13} className="text-[#cccccc]" /> : <ChevronRight size={13} className="text-[#cccccc]" />}
              <span>Installed</span>
            </div>
            <span className="px-1.5 py-0.2 rounded-full bg-[#37373d] text-[10px] text-[#cccccc] font-sans">
              {installedList.length}
            </span>
          </button>

          {/* Installed Items List */}
          {isInstalledOpen && (
            <div className="flex flex-col">
              {installedList.length === 0 ? (
                <div className="px-6 py-3 text-center text-[#808080] text-[11px]">
                  No installed extensions found.
                </div>
              ) : (
                installedList.map((ext) => {
                  const isMenuOpen = activeGearMenuId === ext.id;

                  return (
                    <div
                      key={ext.id}
                      className="group relative flex items-start gap-2.5 px-3 py-2 hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                      onClick={() => {
                        if (onSelectExtension) onSelectExtension(ext);
                        else if (ext.marketplaceUrl) window.open(ext.marketplaceUrl, "_blank");
                      }}
                    >
                      {/* Extension Icon (36x36) */}
                      <div className="mt-0.5 shrink-0">
                        {renderExtensionIcon(ext.iconSvg, ext.name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[12px] font-bold text-[#ffffff] truncate leading-tight">
                            {ext.name}
                          </h4>
                          {!ext.enabled && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                              Disabled
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#969696] truncate mt-0.5 leading-snug">
                          {ext.description}
                        </p>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#808080]">
                          <span className="truncate">{ext.publisher}</span>
                        </div>
                      </div>

                      {/* Gear Icon Action */}
                      <div className="absolute right-2.5 top-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveGearMenuId(isMenuOpen ? null : ext.id);
                          }}
                          title="Manage extension"
                          className="w-6 h-6 flex items-center justify-center rounded text-[#858585] hover:text-[#ffffff] hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Settings size={14} />
                        </button>

                        {/* Gear Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            ref={gearMenuRef}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 w-48 rounded bg-[#252526] border border-[#454545] shadow-2xl py-1 z-50 text-xs font-medium text-[#cccccc] animate-in fade-in duration-100"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                toggleExtension(ext.id);
                                setActiveGearMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer"
                            >
                              <Power size={12} className={ext.enabled ? "text-amber-400" : "text-emerald-400"} />
                              <span>{ext.enabled ? "Disable Extension" : "Enable Extension"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                uninstallExtension(ext.id);
                                setActiveGearMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Uninstall Extension</span>
                            </button>

                            <div className="my-1 border-t border-[#454545]" />

                            <button
                              type="button"
                              onClick={() => handleCopyId(ext.id)}
                              className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-[#094771] hover:text-white transition-colors cursor-pointer"
                            >
                              <Copy size={12} />
                              <span>Copy Extension ID</span>
                            </button>

                            <a
                              href={ext.marketplaceUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setActiveGearMenuId(null)}
                              className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-[#094771] hover:text-white transition-colors"
                            >
                              <ExternalLink size={12} />
                              <span>Open in Marketplace</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 2: MARKETPLACE SEARCH RESULTS (When searching) ── */}
        {isSearchMode && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setIsMarketplaceOpen((prev) => !prev)}
              className="w-full px-2 py-1.5 flex items-center justify-between text-left hover:bg-[#2a2d2e] transition-colors cursor-pointer font-bold text-[#cccccc] text-[11px] select-none"
            >
              <div className="flex items-center gap-1">
                {isMarketplaceOpen ? <ChevronDown size={13} className="text-[#cccccc]" /> : <ChevronRight size={13} className="text-[#cccccc]" />}
                <span>Marketplace</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-[#37373d] text-[10px] text-[#cccccc] font-sans">
                {isSearching ? "..." : marketplaceResults.length}
              </span>
            </button>

            {isMarketplaceOpen && (
              <div className="flex flex-col">
                {isSearching ? (
                  <div className="px-4 py-4 text-center text-[#808080] text-[11px] flex items-center justify-center gap-2">
                    <Loader2 size={13} className="animate-spin text-[#0078d4]" />
                    <span>Searching Open VSX Marketplace...</span>
                  </div>
                ) : marketplaceResults.length === 0 ? (
                  <div className="px-6 py-4 text-center text-[#808080] text-[11px] space-y-2">
                    <p>No extensions found matching "{search}".</p>
                    <a
                      href={`https://open-vsx.org/extension?q=${encodeURIComponent(search)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#3794ff] hover:underline"
                    >
                      <Globe size={11} /> Search Open-VSX.org in Browser
                    </a>
                  </div>
                ) : (
                  marketplaceResults.map((ext) => {
                    const isInstalling = installingId === ext.id;

                    return (
                      <div
                        key={ext.id}
                        className="group relative flex items-start gap-2.5 px-3 py-2 hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                        onClick={() => {
                          if (onSelectExtension) onSelectExtension(ext);
                          else if (ext.marketplaceUrl) window.open(ext.marketplaceUrl, "_blank");
                        }}
                      >
                        {/* Icon */}
                        <div className="mt-0.5 shrink-0">
                          {renderExtensionIcon(ext.iconSvg, ext.name)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pr-16">
                          <div className="flex items-center justify-between gap-1.5">
                            <h4 className="text-[12px] font-bold text-[#ffffff] truncate leading-tight">
                              {ext.name}
                            </h4>
                          </div>

                          <p className="text-[11px] text-[#969696] truncate mt-0.5 leading-snug">
                            {ext.description}
                          </p>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#808080]">
                            <span className="truncate">{ext.publisher}</span>
                            <span className="text-[10px] text-zinc-500">•</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                              <Download size={9} />
                              {ext.downloads}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400/90">
                              <Star size={9} fill="currentColor" />
                              {ext.rating}
                            </span>
                          </div>
                        </div>

                        {/* Install Button */}
                        <div className="absolute right-2.5 top-2.5">
                          <button
                            type="button"
                            disabled={isInstalling}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInstallExtension(ext);
                            }}
                            className="px-2.5 py-0.5 rounded-[2px] bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            {isInstalling ? (
                              <>
                                <Loader2 size={10} className="animate-spin" />
                                <span>Installing</span>
                              </>
                            ) : (
                              <span>Install</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 3: RECOMMENDED (Shown when not searching) ── */}
        {!isSearchMode && (
          <div className="flex flex-col">
            {/* Section Accordion Header */}
            <button
              type="button"
              onClick={() => setIsRecommendedOpen((prev) => !prev)}
              className="w-full px-2 py-1.5 flex items-center justify-between text-left hover:bg-[#2a2d2e] transition-colors cursor-pointer font-bold text-[#cccccc] text-[11px] select-none"
            >
              <div className="flex items-center gap-1">
                {isRecommendedOpen ? <ChevronDown size={13} className="text-[#cccccc]" /> : <ChevronRight size={13} className="text-[#cccccc]" />}
                <span>Recommended</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-[#37373d] text-[10px] text-[#cccccc] font-sans">
                {recommendedList.length}
              </span>
            </button>

            {/* Recommended Items List */}
            {isRecommendedOpen && (
              <div className="flex flex-col">
                {recommendedList.length === 0 ? (
                  <div className="px-6 py-4 text-center text-[#808080] text-[11px]">
                    All recommended extensions are installed!
                  </div>
                ) : (
                  recommendedList.map((ext) => {
                    const isInstalling = installingId === ext.id;

                    return (
                      <div
                        key={ext.id}
                        className="group relative flex items-start gap-2.5 px-3 py-2 hover:bg-[#2a2d2e] transition-colors cursor-pointer"
                        onClick={() => {
                          if (onSelectExtension) onSelectExtension(ext);
                          else if (ext.marketplaceUrl) window.open(ext.marketplaceUrl, "_blank");
                        }}
                      >
                        {/* Icon Container with VS Code Ribbon Star Bookmark */}
                        <div className="relative shrink-0 mt-0.5">
                          {/* Blue Ribbon Flag with white star on top-left (VS Code Recommended ribbon) */}
                          <div className="absolute -top-1.5 -left-1.5 z-10 w-4 h-4 flex items-center justify-center pointer-events-none drop-shadow">
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                              <path
                                d="M2 1C1.44772 1 1 1.44772 1 2V15L5 12.5L9 15V2C9 1.44772 8.55228 1 8 1H2Z"
                                fill="#0078d4"
                              />
                              <path
                                d="M5 3.5L5.7 5.2H7.5L6.1 6.3L6.6 8L5 7L3.4 8L3.9 6.3L2.5 5.2H4.3L5 3.5Z"
                                fill="#ffffff"
                              />
                            </svg>
                          </div>

                          <div className="w-9 h-9">
                            {renderExtensionIcon(ext.iconSvg, ext.name)}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pr-16">
                          {/* Name + Download Count + Rating */}
                          <div className="flex items-center justify-between gap-1.5">
                            <h4 className="text-[12px] font-bold text-[#ffffff] truncate leading-tight">
                              {ext.name}
                            </h4>
                          </div>

                          <p className="text-[11px] text-[#969696] truncate mt-0.5 leading-snug">
                            {ext.description}
                          </p>

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#808080]">
                            <span className="truncate">{ext.publisher}</span>
                            <span className="text-[10px] text-zinc-500">•</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                              <Download size={9} />
                              {ext.downloads}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400/90">
                              <Star size={9} fill="currentColor" />
                              {ext.rating}
                            </span>
                          </div>
                        </div>

                        {/* Install Button */}
                        <div className="absolute right-2.5 top-2.5">
                          <button
                            type="button"
                            disabled={isInstalling}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInstallExtension(ext);
                            }}
                            className="px-2.5 py-0.5 rounded-[2px] bg-[#0078d4] hover:bg-[#006cbd] disabled:opacity-50 text-white text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                          >
                            {isInstalling ? (
                              <>
                                <Loader2 size={10} className="animate-spin" />
                                <span>Installing</span>
                              </>
                            ) : (
                              <span>Install</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Footer: Open VSX Status & Modal Link ═══ */}
      <div className="h-7 px-3 flex items-center justify-between border-t border-[#2d2d2d] bg-[#181818] shrink-0 text-[10px] text-[#808080]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Open VSX Registry Connected</span>
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="text-[#3794ff] hover:underline cursor-pointer"
        >
          Manage All &rarr;
        </button>
      </div>
    </div>
  );
}
