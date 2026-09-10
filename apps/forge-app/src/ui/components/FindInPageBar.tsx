import { useState, useEffect, useRef } from "react";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";

interface FindInPageProps {
  getActiveWebview: () => WebviewElement | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FindInPageBar({ getActiveWebview, isOpen, onClose }: FindInPageProps) {
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeOrdinal, setActiveOrdinal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      const wv = getActiveWebview();
      if (wv && typeof wv.stopFindInPage === "function") {
        try {
          wv.stopFindInPage("clearSelection");
        } catch {}
      }
      setQuery("");
      setMatchCount(0);
      setActiveOrdinal(0);
    }
  }, [isOpen, getActiveWebview]);

  useEffect(() => {
    if (!isOpen) return;
    const wv = getActiveWebview();
    if (!wv) return;

    const handleFoundInPage = (e: any) => {
      const result = e.result;
      if (result) {
        setActiveOrdinal(result.activeMatchOrdinal || 0);
        setMatchCount(result.matches || 0);
      }
    };

    wv.addEventListener("found-in-page", handleFoundInPage);
    return () => {
      try {
        wv.removeEventListener("found-in-page", handleFoundInPage);
      } catch {}
    };
  }, [isOpen, getActiveWebview]);

  const handleSearch = (text: string, findNext = false, forward = true) => {
    setQuery(text);
    const wv = getActiveWebview();
    if (!wv || typeof wv.findInPage !== "function") return;
    if (!text.trim()) {
      try {
        wv.stopFindInPage?.("clearSelection");
      } catch {}
      setMatchCount(0);
      setActiveOrdinal(0);
      return;
    }
    try {
      wv.findInPage?.(text, { forward, findNext, matchCase: false });
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        handleSearch(query, true, false); // Previous
      } else {
        handleSearch(query, true, true); // Next
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-2 right-4 z-40 bg-[var(--forge-surface)]/95 backdrop-blur-md border border-[var(--forge-border)] shadow-xl rounded-lg p-1.5 flex items-center gap-1 text-xs select-none ring-1 ring-black/10">
      <Search size={14} className="text-[var(--forge-text-muted)] ml-1 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in page... (Ctrl+F)"
        className="w-36 sm:w-48 bg-transparent text-[var(--forge-text)] outline-none px-1.5 py-0.5 text-xs font-mono placeholder-[var(--forge-text-muted)] selection:bg-[#FF6B00]/30"
        spellCheck={false}
      />
      <div className="text-[11px] font-mono text-[var(--forge-text-muted)] px-1 min-w-[38px] text-center shrink-0">
        {query ? (matchCount > 0 ? `${activeOrdinal}/${matchCount}` : "0/0") : ""}
      </div>
      <div className="w-px h-4 bg-[var(--forge-border)]" />
      <button
        onClick={() => handleSearch(query, true, false)}
        title="Previous match (Shift+Enter)"
        className="p-1 rounded hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors cursor-pointer"
      >
        <ChevronUp size={13} />
      </button>
      <button
        onClick={() => handleSearch(query, true, true)}
        title="Next match (Enter)"
        className="p-1 rounded hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors cursor-pointer"
      >
        <ChevronDown size={13} />
      </button>
      <button
        onClick={onClose}
        title="Close (Escape)"
        className="p-1 rounded hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors cursor-pointer ml-0.5"
      >
        <X size={13} />
      </button>
    </div>
  );
}
