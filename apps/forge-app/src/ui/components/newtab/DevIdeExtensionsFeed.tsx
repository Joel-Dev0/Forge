import React, { useState, useEffect } from "react";
import {
  Boxes,
  ExternalLink,
  Power,
  Trash2,
  Star,
  Download,
  Check,
  ShieldCheck,
  Tag,
  FileText,
  Code,
  Globe,
  Settings,
  X,
  Share2,
  Loader2,
} from "lucide-react";
import {
  useIdeExtensionsStore,
  type IdeExtension,
} from "../../../core/extensions/useIdeExtensionsStore";
import { IdeExtensionsSidebarView } from "../IdeExtensionsSidebarView";

interface Props {
  onNavigate?: (url: string) => void;
  onOpenModal?: () => void;
  onSwitchToNews?: () => void;
}

export function DevIdeExtensionsFeed({ onNavigate, onOpenModal, onSwitchToNews }: Props) {
  const {
    extensions,
    installExtension,
    uninstallExtension,
    toggleExtension,
    selectedExtension,
    setSelectedExtension,
    selectedExtensionId,
  } = useIdeExtensionsStore();

  const [activeTab, setActiveTab] = useState<"details" | "features" | "changelog">("details");
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [loadingReadme, setLoadingReadme] = useState(false);

  const selectedExt =
    (selectedExtension &&
      (extensions.find((e) => e.id.toLowerCase() === selectedExtension.id.toLowerCase()) || selectedExtension)) ||
    (selectedExtensionId && extensions.find((e) => e.id.toLowerCase() === selectedExtensionId.toLowerCase())) ||
    extensions[0];

  useEffect(() => {
    if (!selectedExt?.readmeUrl) {
      setReadmeContent(null);
      return;
    }
    let cancelled = false;
    setLoadingReadme(true);
    fetch(selectedExt.readmeUrl)
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (!cancelled) {
          setReadmeContent(text);
          setLoadingReadme(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReadmeContent(null);
          setLoadingReadme(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedExt?.id, selectedExt?.readmeUrl]);

  const handleOpenMarketplace = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ═══ Top Intro Bar ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#1e1e1e]/90 border border-[#2d2d2d] shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Boxes size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span>VS Code & Open VSX Marketplace Workbench</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
                IDE Native
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Browse, search, install, and manage developer extensions directly in Forge
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToNews && (
            <button
              type="button"
              onClick={onSwitchToNews}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10"
            >
              Switch to Developer Pulse
            </button>
          )}

          <a
            href="https://open-vsx.org"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition-colors border border-blue-500/30"
          >
            <span>Open VSX</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* ═══ Main Dual-Pane IDE Workbench (Panel from screenshot + Detail Pane) ═══ */}
      <div className="w-full h-[620px] rounded-xl overflow-hidden border border-[#2d2d2d] bg-[#181818] shadow-2xl flex flex-col md:flex-row">
        {/* Left Pane: EXACT VS Code Extensions Panel from Reference Screenshot */}
        <div className="w-full md:w-[320px] h-full shrink-0 flex flex-col">
          <IdeExtensionsSidebarView
            onOpenModal={onOpenModal}
            selectedExtensionId={selectedExt?.id}
            onSelectExtension={(ext) => setSelectedExtension(ext)}
          />
        </div>

        {/* Right Pane: Extension Detail & Readme Workbench */}
        {selectedExt && (
          <div className="flex-1 h-full overflow-y-auto bg-[#1e1e1e] flex flex-col text-white">
            {/* Editor Tab Header */}
            <div className="h-9 px-3 bg-[#252526] border-b border-[#2d2d2d] flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2 px-3 py-1 bg-[#1e1e1e] border-t-2 border-[#0078d4] text-xs font-medium text-white">
                <span
                  className="w-4 h-4 shrink-0 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: selectedExt.iconSvg }}
                />
                <span className="truncate max-w-[200px]">Extension: {selectedExt.name}</span>
              </div>

              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <button
                  type="button"
                  onClick={() => handleOpenMarketplace(selectedExt.marketplaceUrl)}
                  title="Open in Browser"
                  className="p-1 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                >
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>

            {/* Extension Hero Banner */}
            <div className="p-6 border-b border-[#2d2d2d] bg-[#181818]/60 flex flex-col sm:flex-row items-start gap-5 shrink-0">
              <div
                className="w-20 h-20 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center p-3 shrink-0 shadow-lg"
                dangerouslySetInnerHTML={{ __html: selectedExt.iconSvg }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {selectedExt.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#2d2d2d] text-zinc-300">
                    v{selectedExt.version}
                  </span>
                  {selectedExt.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {selectedExt.badge}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300">{selectedExt.publisher}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Download size={12} className="text-zinc-500" />
                    <span>{selectedExt.downloads} installs</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star size={12} fill="currentColor" />
                    <span>{selectedExt.rating} (Verified rating)</span>
                  </span>
                </div>

                <p className="text-sm text-zinc-300 mt-2.5 leading-relaxed">
                  {selectedExt.description}
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 mt-4">
                  {selectedExt.installed ? (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleExtension(selectedExt.id)}
                        className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          selectedExt.enabled
                            ? "bg-[#3c3c3c] hover:bg-[#484848] text-white"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                      >
                        <Power size={13} />
                        <span>{selectedExt.enabled ? "Disable" : "Enable"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => uninstallExtension(selectedExt.id)}
                        className="px-4 py-1.5 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Uninstall</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        installExtension(selectedExt);
                        setSelectedExtension({ ...selectedExt, installed: true, enabled: true });
                      }}
                      className="px-5 py-1.5 rounded bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Install Extension</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenMarketplace(selectedExt.marketplaceUrl)}
                    className="px-3.5 py-1.5 rounded bg-[#2d2d2d] hover:bg-[#383838] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Marketplace Page</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sub Tabs: Details, Features, Changelog */}
            <div className="px-6 border-b border-[#2d2d2d] bg-[#1e1e1e] flex items-center gap-6 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`py-2.5 border-b-2 cursor-pointer transition-colors ${
                  activeTab === "details"
                    ? "border-[#0078d4] text-white font-semibold"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("features")}
                className={`py-2.5 border-b-2 cursor-pointer transition-colors ${
                  activeTab === "features"
                    ? "border-[#0078d4] text-white font-semibold"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                Features & Contributions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("changelog")}
                className={`py-2.5 border-b-2 cursor-pointer transition-colors ${
                  activeTab === "changelog"
                    ? "border-[#0078d4] text-white font-semibold"
                    : "border-transparent text-zinc-400 hover:text-white"
                }`}
              >
                Changelog
              </button>
            </div>

            {/* Readme / Details Content */}
            <div className="p-6 space-y-6 flex-1 text-sm text-zinc-300 leading-relaxed font-sans">
              {activeTab === "details" && (
                <div className="space-y-4 max-w-3xl">
                  {loadingReadme ? (
                    <div className="py-8 flex items-center justify-center gap-2 text-zinc-400 text-xs">
                      <Loader2 size={14} className="animate-spin text-[#0078d4]" />
                      <span>Loading documentation from Open VSX...</span>
                    </div>
                  ) : readmeContent ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap font-sans text-zinc-200 max-h-[420px] overflow-y-auto">
                        {readmeContent}
                      </div>
                      <div className="pt-1 flex flex-wrap gap-2 text-xs text-zinc-400">
                        <span className="px-2.5 py-1 rounded bg-[#252526] border border-[#333]">
                          Identifier: <code className="text-blue-400">{selectedExt.id}</code>
                        </span>
                        <span className="px-2.5 py-1 rounded bg-[#252526] border border-[#333]">
                          Version: <span className="font-mono text-zinc-300">v{selectedExt.version}</span>
                        </span>
                        <span className="px-2.5 py-1 rounded bg-[#252526] border border-[#333]">
                          Publisher: <span className="text-zinc-300">{selectedExt.publisher}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                          Overview
                        </h4>
                        <p className="text-xs text-zinc-300">
                          {selectedExt.description}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-base font-bold text-white border-b border-[#2d2d2d] pb-2">
                          Key Capabilities & Commands
                        </h3>
                        <ul className="space-y-2 text-xs text-zinc-300">
                          <li className="flex items-start gap-2">
                            <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                            <span>Seamless workspace integration with automatic LSP language server diagnostics.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                            <span>Zero configuration setup for modern TypeScript, JavaScript, Rust, Go, Python, and C/C++ projects.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                            <span>Instant hover documentation, go-to-definition, and intelligent completion provider.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="pt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
                        <span className="px-2.5 py-1 rounded bg-[#252526] border border-[#333]">
                          Identifier: <code className="text-blue-400">{selectedExt.id}</code>
                        </span>
                        <span className="px-2.5 py-1 rounded bg-[#252526] border border-[#333]">
                          Category: <span className="capitalize">{selectedExt.category}</span>
                        </span>
                        <span className="px-2.5 py-1 rounded bg-[#252526] border border-[#333]">
                          Registry: Open VSX / VS Code Marketplace
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "features" && (
                <div className="space-y-3 max-w-3xl text-xs">
                  <h3 className="text-base font-bold text-white border-b border-[#2d2d2d] pb-2">
                    Extension Contributions
                  </h3>
                  <div className="p-3 rounded bg-black/30 border border-white/5 font-mono text-[11px] text-zinc-400 space-y-1">
                    <div>commands:</div>
                    <div className="pl-4 text-emerald-400">- {selectedExt.id}.restart</div>
                    <div className="pl-4 text-emerald-400">- {selectedExt.id}.configure</div>
                    <div className="pl-4 text-emerald-400">- {selectedExt.id}.showOutput</div>
                  </div>
                </div>
              )}

              {activeTab === "changelog" && (
                <div className="space-y-3 max-w-3xl text-xs text-zinc-300">
                  <h3 className="text-base font-bold text-white border-b border-[#2d2d2d] pb-2">
                    Release v{selectedExt.version}
                  </h3>
                  <p className="text-zinc-400">
                    - Performance improvements for large multi-root workspaces.<br />
                    - Updated Open VSX API compatibility layer.<br />
                    - Fixed memory consumption during rapid indexing sessions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
