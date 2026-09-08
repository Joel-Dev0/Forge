import { useState } from "react";
import { Search, Globe, Terminal, ArrowRight, ShieldCheck, Flame, BookOpen, Layers, Code2 } from "lucide-react";

interface Props {
  onNavigate: (url: string) => void;
}

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const DEV_SHORTCUTS = [
  { name: "GitHub",         url: "https://github.com",                icon: <GithubIcon /> },
  { name: "MDN",            url: "https://developer.mozilla.org",     icon: <BookOpen size={16} /> },
  { name: "DevDocs",        url: "https://devdocs.io",                icon: <Terminal size={16} /> },
  { name: "Stack Overflow", url: "https://stackoverflow.com",         icon: <Code2 size={16} /> },
  { name: "NPM",            url: "https://www.npmjs.com",             icon: <Layers size={16} /> },
  { name: "Bundlephobia",   url: "https://bundlephobia.com",          icon: <Globe size={16} /> },
];

export function NewTabHome({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (/^https?:\/\//i.test(q) || (q.includes(".") && !q.includes(" "))) {
      onNavigate(q.startsWith("http") ? q : `https://${q}`);
    } else {
      onNavigate(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--forge-bg)] text-[var(--forge-text)] select-none overflow-y-auto relative">
      {/* Subtle ambient glow behind everything */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[500px] h-[300px] bg-[#FF6B00]/8 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-[560px] px-6 flex flex-col items-center gap-7">

        {/* Logo */}
        <div className="relative group cursor-default">
          <div className="absolute inset-0 bg-[#FF6B00]/30 rounded-2xl blur-xl scale-90 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative p-3.5 rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-lg">
            <img
              src="/logo.png"
              alt="Forge"
              className="w-16 h-16 rounded-xl object-contain"
            />
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="w-full">
          <div
            className="flex items-center h-11 rounded-xl overflow-hidden transition-all duration-200"
            style={{
              background: "var(--forge-surface)",
              border: focused
                ? "1px solid #FF6B00"
                : "1px solid var(--forge-border)",
              boxShadow: focused
                ? "0 0 0 3px rgba(255,107,0,0.12)"
                : "0 1px 4px rgba(0,0,0,0.15)",
            }}
          >
            <Search size={15} className="ml-3.5 shrink-0 text-[var(--forge-text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search or enter address..."
              className="flex-1 h-full px-3 text-[13px] bg-transparent border-none outline-none text-center text-[var(--forge-text)] placeholder-[var(--forge-text-muted)]"
              autoFocus
            />
            <button
              type="submit"
              title="Navigate"
              className="h-full px-3.5 flex items-center justify-center text-[var(--forge-text-muted)] hover:text-[#FF6B00] transition-colors duration-150 cursor-pointer border-l border-[var(--forge-border)]"
            >
              <ArrowRight size={15} />
            </button>
          </div>
        </form>

        {/* Quick shortcuts */}
        <div className="w-full">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--forge-text-muted)] mb-2.5 px-0.5">
            Quick Shortcuts
          </p>
          <div className="grid grid-cols-6 gap-2">
            {DEV_SHORTCUTS.map((sc) => (
              <button
                key={sc.name}
                type="button"
                title={sc.name}
                onClick={() => onNavigate(sc.url)}
                className="group flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl bg-[var(--forge-surface)] border border-[var(--forge-border)] hover:border-[#FF6B00]/60 hover:bg-[var(--forge-hover)] transition-all duration-150 cursor-pointer"
              >
                <span className="text-[var(--forge-text-secondary)] group-hover:text-[#FF6B00] transition-colors duration-150">
                  {sc.icon}
                </span>
                <span className="text-[10px] text-[var(--forge-text-muted)] group-hover:text-[var(--forge-text)] transition-colors truncate w-full text-center leading-tight">
                  {sc.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--forge-text-muted)]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--forge-surface)] border border-[var(--forge-border)]">
            <Flame size={10} className="text-[#FF6B00]" />
            <span>HTTP Engine</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--forge-surface)] border border-[var(--forge-border)]">
            <ShieldCheck size={10} className="text-emerald-500" />
            <span>Inspector Red</span>
          </div>
        </div>

      </div>
    </div>
  );
}