import { useState } from "react";
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
} from "lucide-react";
import { useIdeExtensionsStore } from "../../core/extensions/useIdeExtensionsStore";

export function IdeExtensionsModal() {
  const {
    extensions,
    isIdeModalOpen,
    searchQuery,
    activeCategory,
    setIdeModalOpen,
    setSearchQuery,
    setActiveCategory,
    installExtension,
    uninstallExtension,
    toggleExtension,
    installFromUrlOrId,
  } = useIdeExtensionsStore();

  const [activeTab, setActiveTab] = useState<"marketplace" | "installed">("marketplace");
  const [directInstallInput, setDirectInstallInput] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isIdeModalOpen) return null;

  const categories = [
    { id: "all", label: "All Extensions" },
    { id: "formatters", label: "Formatters" },
    { id: "linters", label: "Linters" },
    { id: "languages", label: "Languages" },
    { id: "ai", label: "AI & Copilots" },
    { id: "database", label: "Database" },
    { id: "cloud", label: "Cloud & Docker" },
    { id: "tools", label: "Developer Tools" },
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

  return (
    <div
      className="fixed inset-0 z-[10015] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setIdeModalOpen(false)}
    >
      <div
        className="bg-[#12141f] border border-[var(--forge-border)] w-full max-w-5xl h-[86vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white font-sans"
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
          <div className="flex items-center justify-between pt-1">
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
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                    activeCategory === cat.id
                      ? "bg-white/20 text-white font-bold"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Extensions Catalog Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExtensions.length === 0 ? (
            <div className="col-span-2 py-16 text-center text-zinc-400 space-y-2">
              <Boxes size={32} className="mx-auto opacity-30 text-blue-400" />
              <p className="text-sm font-semibold">No IDE extensions found matching your search.</p>
              <p className="text-xs text-zinc-500">
                Try searching another keyword or paste the extension's Visual Studio Marketplace ID directly.
              </p>
            </div>
          ) : (
            filteredExtensions.map((ext) => (
              <div
                key={ext.id}
                className="p-4 rounded-2xl bg-[#171a2b] border border-[var(--forge-border)] hover:border-blue-500/40 transition-all flex flex-col justify-between shadow-md group"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    {/* Official Extension Icon */}
                    <div
                      className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow overflow-hidden p-1.5"
                      dangerouslySetInnerHTML={{ __html: ext.iconSvg }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white truncate leading-snug">
                          {ext.name}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-bold capitalize shrink-0 ml-1">
                          {ext.category}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-400 font-medium mt-0.5">
                        {ext.publisher} • v{ext.version}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono mt-1">
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star size={11} fill="currentColor" />
                          {ext.rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download size={11} />
                          {ext.downloads} installs
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 mt-3 line-clamp-2 leading-relaxed">
                    {ext.description}
                  </p>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {ext.installed ? (
                      <>
                        <button
                          onClick={() => toggleExtension(ext.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            ext.enabled
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          <Power size={11} />
                          <span>{ext.enabled ? "Active in Projects" : "Disabled"}</span>
                        </button>

                        <button
                          onClick={() => uninstallExtension(ext.id)}
                          title="Uninstall extension"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => installExtension(ext.id)}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5"
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
                    title="View extension on Visual Studio Marketplace"
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-blue-400 transition-colors"
                  >
                    <span>Marketplace</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ))
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
