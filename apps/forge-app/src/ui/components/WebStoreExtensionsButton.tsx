import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { useExtensionsStore } from "../../core/extensions/useExtensionsStore";

interface Props {
  onNavigate?: (url: string) => void;
}

// Curated Popular Chrome Web Store extensions for developers with official IDs and links
const POPULAR_WEBSTORE_EXTENSIONS: Array<{
  id: string;
  name: string;
  author: string;
  description: string;
  category: string;
  cwsUrl: string;
  iconBg: string;
  iconLetter: string;
}> = [
  {
    id: "fmkadmapgofadopljbjfkapdkoienihi",
    name: "React Developer Tools",
    author: "Meta Platforms",
    description: "Inspect React component hierarchies, props, and performance profiling.",
    category: "Developer Tools",
    cwsUrl: "https://chromewebstore.google.com/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi",
    iconBg: "bg-[#0A192F] text-[#00D8FF]",
    iconLetter: "⚛",
  },
  {
    id: "lmhkpmbekcpmknklioeibfkpmmfibljd",
    name: "Redux DevTools",
    author: "Redux",
    description: "Time-travel debugging and action inspection for Redux applications.",
    category: "Developer Tools",
    cwsUrl: "https://chromewebstore.google.com/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd",
    iconBg: "bg-[#1E1238] text-[#764ABC]",
    iconLetter: "🔮",
  },
  {
    id: "nhdogjmejiglipccpnnnanhbledajbpd",
    name: "Vue.js devtools",
    author: "Vue.js Team",
    description: "Browser devtools extension for debugging Vue.js applications.",
    category: "Developer Tools",
    cwsUrl: "https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd",
    iconBg: "bg-[#0E201B] text-[#42B883]",
    iconLetter: "V",
  },
  {
    id: "cjpalhdlnbpafiamejdnhcphjbkeiagm",
    name: "uBlock Origin",
    author: "Raymond Hill (gorhill)",
    description: "An efficient, wide-spectrum content blocker that is easy on memory and CPU.",
    category: "Privacy & Adblock",
    cwsUrl: "https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm",
    iconBg: "bg-[#33080E] text-[#800000]",
    iconLetter: "🛡️",
  },
  {
    id: "eimadpbcbfnmbkopoojfekhnkhdbieeh",
    name: "Dark Reader",
    author: "darkreader.org",
    description: "Inverts colors and applies custom dark theme to every web page.",
    category: "Accessibility",
    cwsUrl: "https://chromewebstore.google.com/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh",
    iconBg: "bg-[#1E1B18] text-[#E8BA60]",
    iconLetter: "🕶️",
  },
  {
    id: "gmegofcmddgimfdflgahngkgepggachg",
    name: "JSON Viewer Pro",
    author: "JSON Formatter Team",
    description: "Format, highlight, and fold raw JSON payloads in web responses.",
    category: "Developer Tools",
    cwsUrl: "https://chromewebstore.google.com/detail/json-viewer-pro/gmegofcmddgimfdflgahngkgepggachg",
    iconBg: "bg-[#1A2634] text-[#38BDF8]",
    iconLetter: "{}",
  },
  {
    id: "gppongmhjkpfnbhagpmjfkannfbllamg",
    name: "Wappalyzer - Tech Profiler",
    author: "Wappalyzer",
    description: "Find out what technologies, frameworks, and CMS websites are built with.",
    category: "Developer Tools",
    cwsUrl: "https://chromewebstore.google.com/detail/wappalyzer-technology-pr/gppongmhjkpfnbhagpmjfkannfbllamg",
    iconBg: "bg-[#25152F] text-[#9B51E0]",
    iconLetter: "⚡",
  },
];

export function WebStoreExtensionsButton({ onNavigate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [activeTab, setActiveTab] = useState<"installed" | "catalog">("installed");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const {
    extensions,
    toggleExtension,
    togglePinExtension,
    uninstallExtension,
    installFromWebStoreUrl,
    setManagerOpen,
  } = useExtensionsStore();

  const browserExtensions = extensions.filter((e) => e.type === "browser");
  const pinnedExtensions = browserExtensions.filter((e) => e.pinned && e.enabled);
  const enabledCount = browserExtensions.filter((e) => e.enabled).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  const handleOpenChromeWebStore = () => {
    const url = "https://chromewebstore.google.com/";
    if (onNavigate) {
      onNavigate(url);
    } else {
      window.open(url, "_blank");
    }
    setIsOpen(false);
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

  const handleQuickInstall = (item: typeof POPULAR_WEBSTORE_EXTENSIONS[0]) => {
    const res = installFromWebStoreUrl(item.cwsUrl);
    setActionFeedback(res.message || `Installed ${item.name}!`);
    setTimeout(() => setActionFeedback(null), 3500);
    setActiveTab("installed");
  };

  return (
    <div ref={menuRef} className="relative flex items-center gap-1">
      {/* Pinned Extensions on Top Taskbar */}
      {pinnedExtensions.map((ext) => (
        <button
          key={ext.id}
          onClick={() => toggleExtension(ext.id)}
          title={`${ext.name} (Click to toggle)`}
          className="w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-[var(--forge-hover)] transition-all cursor-pointer relative"
        >
          <span className="truncate max-w-[16px]">{ext.name.charAt(0)}</span>
          <span className="absolute -bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </button>
      ))}

      {/* Main Extensions Puzzle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Extensions & Chrome Web Store"
        className={`w-6 h-6 flex items-center justify-center rounded transition-all cursor-pointer relative ${
          isOpen
            ? "bg-[#FF6B00]/20 text-[#FF6B00]"
            : "hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
        }`}
      >
        <Puzzle size={14} />
        {enabledCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#FF6B00] text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-xs">
            {enabledCount}
          </span>
        )}
      </button>

      {/* Extensions Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-8 z-[10020] w-96 bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[var(--forge-text)] font-sans animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--forge-border)] bg-[var(--forge-surface)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Puzzle size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Chrome Web Store</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ONLINE
                  </span>
                </h3>
                <p className="text-[10px] text-[var(--forge-text-muted)]">
                  Add extensions from chromewebstore.google.com
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenChromeWebStore}
              title="Open Chrome Web Store in browser"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-[10px] font-bold transition-all shadow cursor-pointer"
            >
              <span>Web Store</span>
              <ExternalLink size={10} />
            </button>
          </div>

          {/* Direct Install Input Box */}
          <form onSubmit={handleInstallFromInput} className="p-3 border-b border-[var(--forge-border)] bg-[var(--forge-input)]/40 flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Paste Web Store URL or ID to install..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-[11px] bg-[var(--forge-input)] border border-[var(--forge-border)] rounded-lg text-white outline-none focus:border-[#FF6B00] transition-colors"
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

          {/* Sub Navigation Tabs */}
          <div className="flex items-center border-b border-[var(--forge-border)] px-3 text-[11px] font-medium bg-[var(--forge-surface)]">
            <button
              onClick={() => setActiveTab("installed")}
              className={`py-2 px-2.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "installed"
                  ? "border-[#FF6B00] text-[#FF6B00] font-bold"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-white"
              }`}
            >
              Installed ({browserExtensions.length})
            </button>
            <button
              onClick={() => setActiveTab("catalog")}
              className={`py-2 px-2.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "catalog"
                  ? "border-[#FF6B00] text-[#FF6B00] font-bold"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-white"
              }`}
            >
              Chrome Web Store Catalog
            </button>
          </div>

          {/* Body Content */}
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {/* INSTALLED EXTENSIONS LIST */}
            {activeTab === "installed" && (
              <>
                {browserExtensions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--forge-text-muted)]">
                    No browser extensions installed yet. Click "Chrome Web Store Catalog" to add extensions.
                  </div>
                ) : (
                  browserExtensions.map((ext) => (
                    <div
                      key={ext.id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--forge-hover)] transition-colors text-xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] flex items-center justify-center font-bold text-xs text-white shrink-0">
                          {ext.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate text-[11px] leading-tight">
                            {ext.name}
                          </p>
                          <p className="text-[10px] text-[var(--forge-text-muted)] truncate">
                            v{ext.version} • {ext.author}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Pin / Unpin Button */}
                        <button
                          onClick={() => togglePinExtension(ext.id)}
                          title={ext.pinned ? "Unpin from taskbar" : "Pin to taskbar"}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            ext.pinned
                              ? "text-[#FF6B00] bg-[#FF6B00]/15"
                              : "text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {ext.pinned ? <Pin size={12} /> : <PinOff size={12} />}
                        </button>

                        {/* Enable / Disable Toggle */}
                        <button
                          onClick={() => toggleExtension(ext.id)}
                          title={ext.enabled ? "Disable extension" : "Enable extension"}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            ext.enabled
                              ? "text-emerald-400 bg-emerald-500/15"
                              : "text-zinc-500 bg-zinc-800"
                          }`}
                        >
                          <Power size={12} />
                        </button>

                        {/* Uninstall */}
                        <button
                          onClick={() => uninstallExtension(ext.id)}
                          title="Remove extension"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* POPULAR CHROME WEB STORE CATALOG */}
            {activeTab === "catalog" && (
              <div className="space-y-1.5">
                {POPULAR_WEBSTORE_EXTENSIONS.map((item) => {
                  const isInstalled = browserExtensions.some(
                    (e) => e.id.toLowerCase() === item.id.toLowerCase() || e.name.toLowerCase().includes(item.name.toLowerCase())
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface)] hover:border-[#FF6B00]/40 transition-all flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center font-bold text-sm shrink-0 shadow-inner`}>
                          {item.iconLetter}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-[11px] truncate">{item.name}</h4>
                          <p className="text-[10px] text-[var(--forge-text-muted)] line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isInstalled ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                            <Check size={10} />
                            Added
                          </span>
                        ) : (
                          <button
                            onClick={() => handleQuickInstall(item)}
                            className="px-2.5 py-1 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-[10px] font-bold transition-all shadow cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={10} />
                            <span>Add</span>
                          </button>
                        )}

                        <a
                          href={item.cwsUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="View on chromewebstore.google.com"
                          className="p-1.5 rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-zinc-400 hover:text-white transition-colors"
                        >
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-[var(--forge-border)] bg-[var(--forge-surface)] flex items-center justify-between text-[10px] text-[var(--forge-text-muted)]">
            <button
              onClick={() => {
                setIsOpen(false);
                setManagerOpen(true);
              }}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <Settings size={10} />
              <span>Extensions Gate & Settings</span>
            </button>

            <button
              onClick={handleOpenChromeWebStore}
              className="text-[#FF6B00] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Explore chromewebstore.google.com</span>
              <ExternalLink size={9} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
