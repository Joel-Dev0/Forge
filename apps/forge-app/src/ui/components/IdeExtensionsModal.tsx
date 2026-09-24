import React, { useState, useEffect, useCallback } from "react";
import {
  Boxes,
  Search,
  ExternalLink,
  Check,
  Plus,
  Trash2,
  Power,
  Star,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Package,
  Cpu,
  Database,
  Cloud,
  Wrench,
} from "lucide-react";
import {
  useIdeExtensionsStore,
  type IdeExtension,
} from "../../core/extensions/useIdeExtensionsStore";

/* ── Fallback Gradient for Extension Cards ── */
const extensionCoverGradient = (category: IdeExtension["category"], id: string): string => {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = hash % 360;
  const gradients: Record<string, string> = {
    ai: `linear-gradient(${angle}deg, #090d16 0%, #172554 40%, #1e40af 100%)`,
    formatters: `linear-gradient(${angle}deg, #110d18 0%, #3b0764 40%, #6b21a8 100%)`,
    linters: `linear-gradient(${angle}deg, #160a0a 0%, #450a0a 40%, #991b1b 100%)`,
    languages: `linear-gradient(${angle}deg, #0a141a 0%, #083344 40%, #0e7490 100%)`,
    database: `linear-gradient(${angle}deg, #081611 0%, #064e3b 40%, #047857 100%)`,
    cloud: `linear-gradient(${angle}deg, #091522 0%, #075985 40%, #0284c7 100%)`,
    tools: `linear-gradient(${angle}deg, #141009 0%, #713f12 40%, #ca8a04 100%)`,
  };
  return gradients[category] || `linear-gradient(${angle}deg, #0f172a 0%, #1e293b 50%, #334155 100%)`;
};

/* ── Image Component with Fallback ── */
function ExtensionCardImage({
  src,
  fallbackGradient,
  className,
}: {
  src?: string;
  fallbackGradient: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className={className} style={{ background: fallbackGradient }} />;
  }

  return (
    <img
      src={src}
      alt="Extension Banner"
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/* ── Hero Carousel for Modal (Google Discover Style) ── */
function ModalHeroCarousel({ items }: { items: IdeExtension[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { installExtension, toggleExtension } = useIdeExtensionsStore();

  const next = useCallback(() => {
    setCurrentIdx((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setCurrentIdx((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (isPaused || items.length <= 1) return;
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [isPaused, next, items.length]);

  if (!items || items.length === 0) return null;
  const current = items[currentIdx];

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-[var(--forge-border)] shadow-xl bg-black group"
      style={{ minHeight: "290px" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Image / Gradient */}
      <ExtensionCardImage
        src={current.imageUrl}
        fallbackGradient={extensionCoverGradient(current.category, current.id)}
        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* Dark Readability Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-transparent to-black/30" />

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-20 border border-white/10 shadow-lg hover:scale-110"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white/90 hover:text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-20 border border-white/10 shadow-lg hover:scale-110"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Content */}
      <div className="relative z-10 p-6 md:p-7 flex flex-col justify-between h-full min-h-[290px]">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-500/30 text-blue-200 border border-blue-400/40 backdrop-blur-md">
              <Sparkles size={11} className="text-blue-300" />
              <span>Featured IDE Tool</span>
            </span>
            {current.badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white border border-white/20 backdrop-blur-sm">
                {current.badge}
              </span>
            )}
          </div>

          <span className="text-[11px] font-mono text-zinc-400 bg-black/50 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-sm">
            {currentIdx + 1} / {items.length}
          </span>
        </div>

        {/* Bottom Details */}
        <div className="space-y-2 pt-6">
          <div className="flex items-center gap-2 text-xs text-white/80 font-medium">
            <div
              className="w-5 h-5 rounded-md bg-black/50 border border-white/15 flex items-center justify-center p-0.5 shrink-0 overflow-hidden"
              dangerouslySetInnerHTML={{ __html: current.iconSvg }}
            />
            <span className="text-white font-semibold">{current.publisher}</span>
            <span className="text-white/40">•</span>
            <span className="font-mono text-white/70">v{current.version}</span>
            <span className="text-white/40">•</span>
            <div className="flex items-center gap-1 text-amber-300 font-bold">
              <Star size={11} fill="currentColor" />
              <span>{current.rating.toFixed(1)}</span>
            </div>
            <span className="text-white/40">•</span>
            <span className="text-white/70">{current.downloads}</span>
          </div>

          <h3 className="text-xl md:text-2xl font-extrabold text-white leading-tight drop-shadow">
            {current.name}
          </h3>

          <p className="text-xs md:text-sm text-zinc-200 line-clamp-2 max-w-2xl leading-relaxed">
            {current.tagline || current.description}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {current.installed ? (
              <button
                type="button"
                onClick={() => toggleExtension(current.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                  current.enabled
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400/40"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600"
                }`}
              >
                <Power size={12} />
                <span>{current.enabled ? "Active in Projects" : "Disabled in Projects"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => installExtension(current.id)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer border border-blue-400/30"
              >
                <Plus size={13} />
                <span>Install for Forge Projects</span>
              </button>
            )}

            <a
              href={current.marketplaceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition-all"
            >
              <span>Marketplace</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Carousel Dots */}
        {items.length > 1 && (
          <div className="absolute bottom-3 right-6 flex items-center gap-1.5 z-20">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  i === currentIdx
                    ? "w-5 h-1.5 bg-blue-400"
                    : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 2-Column Discover Card for Modal ── */
function ModalExtensionCard({ ext }: { ext: IdeExtension }) {
  const { installExtension, uninstallExtension, toggleExtension } = useIdeExtensionsStore();

  return (
    <div className="group rounded-2xl bg-[#171a2b] hover:bg-[#1a1e32] border border-[var(--forge-border)] hover:border-blue-500/40 transition-all duration-200 overflow-hidden shadow-lg flex flex-col justify-between">
      {/* 16:10 Dominant Image */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-black/40">
        <ExtensionCardImage
          src={ext.imageUrl}
          fallbackGradient={extensionCoverGradient(ext.category, ext.id)}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top-right Category Pill */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-black/75 text-blue-300 border border-blue-500/30 backdrop-blur-md shadow-xs">
            {ext.category}
          </span>
        </div>

        {/* Top-left Status Pill */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1">
          {ext.installed ? (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md ${
                ext.enabled
                  ? "bg-emerald-500/80 text-white border border-emerald-400/40"
                  : "bg-zinc-800/80 text-zinc-300 border border-zinc-600/40"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${ext.enabled ? "bg-white animate-pulse" : "bg-zinc-400"}`} />
              {ext.enabled ? "Active" : "Disabled"}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-zinc-300 border border-white/10 backdrop-blur-md">
              Marketplace
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#171a2b] to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* Publisher & Rating Row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-5 h-5 rounded-md bg-black/40 border border-white/10 flex items-center justify-center p-0.5 shrink-0 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: ext.iconSvg }}
              />
              <span className="text-[11px] font-semibold text-zinc-400 truncate">
                {ext.publisher}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono shrink-0">
              <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                <Star size={10} fill="currentColor" />
                {ext.rating.toFixed(1)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <Download size={10} />
                {ext.downloads}
              </span>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-snug line-clamp-1">
            {ext.name}
          </h4>

          {/* Description */}
          <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
            {ext.description}
          </p>
        </div>

        {/* Action Strip */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {ext.installed ? (
              <>
                <button
                  type="button"
                  onClick={() => toggleExtension(ext.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    ext.enabled
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  <Power size={11} />
                  <span>{ext.enabled ? "Active" : "Enable"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => uninstallExtension(ext.id)}
                  title="Uninstall extension"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => installExtension(ext.id)}
                className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={12} />
                <span>Install</span>
              </button>
            )}
          </div>

          <a
            href={ext.marketplaceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-blue-400 transition-colors font-medium"
          >
            <span>Marketplace</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Main IdeExtensionsModal Component ── */
export function IdeExtensionsModal() {
  const {
    extensions,
    isIdeModalOpen,
    searchQuery,
    activeCategory,
    setIdeModalOpen,
    setSearchQuery,
    setActiveCategory,
    installFromUrlOrId,
  } = useIdeExtensionsStore();

  const [activeTab, setActiveTab] = useState<"marketplace" | "installed">("marketplace");
  const [directInstallInput, setDirectInstallInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isIdeModalOpen) return null;

  const categories = [
    { id: "all", label: "All Extensions", icon: <Boxes size={11} /> },
    { id: "ai", label: "AI & Copilots", icon: <Sparkles size={11} /> },
    { id: "formatters", label: "Formatters", icon: <Package size={11} /> },
    { id: "linters", label: "Linters", icon: <ShieldCheck size={11} /> },
    { id: "languages", label: "Languages", icon: <Cpu size={11} /> },
    { id: "cloud", label: "Cloud & Docker", icon: <Cloud size={11} /> },
    { id: "database", label: "Database", icon: <Database size={11} /> },
    { id: "tools", label: "Developer Tools", icon: <Wrench size={11} /> },
  ] as const;

  const filteredExtensions = extensions.filter((ext) => {
    const matchesTab = activeTab === "marketplace" ? true : ext.installed;
    const matchesCategory = activeCategory === "all" || ext.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ext.name.toLowerCase().includes(q) ||
      ext.publisher.toLowerCase().includes(q) ||
      ext.description.toLowerCase().includes(q) ||
      ext.id.toLowerCase().includes(q);

    return matchesTab && matchesCategory && matchesSearch;
  });

  const installedCount = extensions.filter((e) => e.installed).length;
  const enabledCount = extensions.filter((e) => e.installed && e.enabled).length;

  const handleDirectInstall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directInstallInput.trim()) return;

    const res = installFromUrlOrId(directInstallInput);
    setFeedback(res.message);
    setTimeout(() => setFeedback(null), 4000);
    setDirectInstallInput("");
  };

  const handleOpenVsMarketplace = () => {
    window.open("https://marketplace.visualstudio.com/vs", "_blank");
  };

  // Featured hero items for the Discover header
  const heroItems = extensions.filter((e) => e.featured || e.rating >= 4.8).slice(0, 5);
  const showHero = activeTab === "marketplace" && activeCategory === "all" && !searchQuery.trim();
  const gridItems = showHero ? filteredExtensions.filter((e) => !heroItems.includes(e)) : filteredExtensions;

  return (
    <div
      className="fixed inset-0 z-[10015] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setIdeModalOpen(false)}
    >
      <div
        className="bg-[#12141f] border border-[var(--forge-border)] w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--forge-border)] bg-[#151827]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-inner">
              <Boxes size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Visual Studio Code Marketplace
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  marketplace.visualstudio.com
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                IDE extensions, linters, language servers, and formatters for your developer projects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenVsMarketplace}
              title="Open marketplace.visualstudio.com in browser"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              <span>marketplace.visualstudio.com</span>
              <ExternalLink size={12} />
            </button>
            <button
              onClick={() => setIdeModalOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Action & Search Bar */}
        <div className="p-4 border-b border-[var(--forge-border)] bg-[#12141f] space-y-3">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] focus-within:border-blue-500 transition-colors">
              <Search size={14} className="text-zinc-400 shrink-0" />
              <input
                type="text"
                placeholder="Search VS Code Marketplace (e.g. Prettier, ESLint, Python, Rust, Tailwind, Docker, Copilot)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white outline-none placeholder-zinc-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Direct Install from Marketplace Link/ID */}
            <form onSubmit={handleDirectInstall} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Paste VS Code item link or ID (e.g. ms-python.python)..."
                value={directInstallInput}
                onChange={(e) => setDirectInstallInput(e.target.value)}
                className="w-64 px-3 py-2 text-xs bg-[var(--forge-input)] border border-[var(--forge-border)] rounded-xl text-white outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!directInstallInput.trim()}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus size={13} />
                <span>Install</span>
              </button>
            </form>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <Check size={14} />
              <span>{feedback}</span>
            </div>
          )}

          {/* Navigation & Categories Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("marketplace")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "marketplace"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Marketplace Catalog
              </button>
              <button
                onClick={() => setActiveTab("installed")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "installed"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>Installed for Projects</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                  {installedCount}
                </span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                    activeCategory === cat.id
                      ? "bg-white/20 text-white font-bold"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Extensions Catalog Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {filteredExtensions.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 space-y-2">
              <Boxes size={36} className="mx-auto opacity-30 text-blue-400" />
              <p className="text-sm font-semibold">No IDE extensions found matching your search.</p>
              <p className="text-xs text-zinc-500">
                Try searching another keyword or paste the extension's Visual Studio Marketplace ID directly.
              </p>
            </div>
          ) : (
            <>
              {/* Hero Carousel in Google Discover Magazine Style */}
              {showHero && heroItems.length > 0 && (
                <ModalHeroCarousel items={heroItems} />
              )}

              {/* Subtitle count */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {activeTab === "marketplace" ? "Extensions Catalog" : "Installed Extensions"} ({gridItems.length})
                </span>
              </div>

              {/* 2-Column Image-Dominant Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gridItems.map((ext) => (
                  <ModalExtensionCard key={ext.id} ext={ext} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--forge-border)] bg-[#151827] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {enabledCount} active IDE extensions enabled for workspace projects
            </span>
          </div>

          <button
            onClick={() => setIdeModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
