import { useEffect } from "react";
import { Keyboard, X, Layers, Compass, SlidersHorizontal } from "lucide-react";

interface HotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HotkeysModal({ isOpen, onClose }: HotkeysModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    {
      title: "Managing Tabs",
      icon: <Layers className="w-4 h-4 text-[#FF6B00]" />,
      shortcuts: [
        { keys: ["Ctrl", "T"], desc: "Open a new tab." },
        { keys: ["Ctrl", "W"], desc: "Close the current tab." },
        { keys: ["Ctrl", "Shift", "T"], desc: "Reopen the last closed tab." },
        { keys: ["Ctrl", "Tab"], desc: "Switch to the next tab on the right." },
        { keys: ["Ctrl", "Shift", "Tab"], desc: "Switch to the previous tab on the left." },
        { keys: ["Ctrl", "Shift", "PgUp"], desc: "Move active tab to the left." },
        { keys: ["Ctrl", "Shift", "PgDn"], desc: "Move active tab to the right." },
      ],
    },
    {
      title: "Navigation and Windows",
      icon: <Compass className="w-4 h-4 text-[#FF8533]" />,
      shortcuts: [
        { keys: ["Ctrl", "L"], altKeys: ["Alt", "D"], desc: "Jump straight to the address bar." },
        { keys: ["Ctrl", "Shift", "N"], desc: "Open a private or incognito window." },
        { keys: ["Alt", "←"], desc: "Go back to the previous page." },
        { keys: ["Alt", "→"], desc: "Go forward to the next page." },
        { keys: ["F5"], desc: "Refresh the current page." },
        { keys: ["F11"], desc: "Toggle full-screen mode." },
      ],
    },
    {
      title: "Page Controls",
      icon: <SlidersHorizontal className="w-4 h-4 text-[#FFB347]" />,
      shortcuts: [
        { keys: ["Ctrl", "F"], desc: "Open the find bar to search for text on the page." },
        { keys: ["Ctrl", "+"], altKeys: ["Ctrl", "-"], desc: "Zoom in or zoom out on the webpage." },
        { keys: ["Ctrl", "0"], desc: "Reset zoom back to the default size." },
        { keys: ["Alt", "P"], desc: "Toggle Picture-in-Picture (PiP) for active video." },
        { keys: ["Ctrl", "D"], desc: "Bookmark the current page." },
        { keys: ["Ctrl", "H"], desc: "Open your browsing history." },
        { keys: ["Ctrl", "J"], desc: "View your downloads." },
      ],
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none cursor-pointer"
    >
      <div
        className="w-full max-w-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] ring-1 ring-white/5 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--forge-border)] flex items-center justify-between bg-[var(--forge-surface-elevated)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center">
              <Keyboard size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--forge-text)] flex items-center gap-2">
                Keyboard Shortcuts & Hotkeys
              </h2>
              <p className="text-xs text-[var(--forge-text-muted)]">
                Master Forge Browser with high-speed keyboard shortcuts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--forge-text)] border-b border-[var(--forge-border)] pb-1.5">
                {cat.icon}
                <span>{cat.title}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cat.shortcuts.map((sc, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-2.5 rounded-xl bg-[var(--forge-surface-elevated)]/60 border border-[var(--forge-border)] flex items-center justify-between gap-3 hover:border-[#FF6B00]/30 transition-colors"
                  >
                    <span className="text-xs text-[var(--forge-text)]/90 leading-snug">
                      {sc.desc}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 text-[11px] font-mono font-semibold bg-[var(--forge-input)] text-[var(--forge-text)] rounded border border-[var(--forge-border)] shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}

                      {sc.altKeys && (
                        <>
                          <span className="text-[10px] text-[var(--forge-text-muted)]">or</span>
                          {sc.altKeys.map((ak, akIdx) => (
                            <kbd
                              key={akIdx}
                              className="px-1.5 py-0.5 text-[11px] font-mono font-semibold bg-[var(--forge-input)] text-[var(--forge-text)] rounded border border-[var(--forge-border)] shadow-xs"
                            >
                              {ak}
                            </kbd>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/30 flex items-center justify-between text-xs text-[var(--forge-text-muted)]">
          <span>Press <kbd className="font-mono bg-[var(--forge-input)] px-1.5 py-0.5 rounded border border-[var(--forge-border)] text-[var(--forge-text)]">F1</kbd> or <kbd className="font-mono bg-[var(--forge-input)] px-1.5 py-0.5 rounded border border-[var(--forge-border)] text-[var(--forge-text)]">Esc</kbd> anytime</span>
          <span className="text-emerald-400 font-medium">● 19 Hotkeys Active & Ready</span>
        </div>
      </div>
    </div>
  );
}
