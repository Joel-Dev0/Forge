import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { useThemeStore, type ThemeMode } from "../../core/theme/useThemeStore";

interface Props {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: Props) {
  const { themeMode, resolvedTheme, setThemeMode } = useThemeStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const options: { mode: ThemeMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      mode: "light",
      label: "Light",
      icon: <Sun size={13} className="text-amber-500" />,
      desc: "Clean light surface",
    },
    {
      mode: "dark",
      label: "Dark",
      icon: <Moon size={13} className="text-indigo-400" />,
      desc: "Deep dark developer theme",
    },
    {
      mode: "system",
      label: "System",
      icon: <Laptop size={13} className="text-[#FF6B00]" />,
      desc: `Match OS (${resolvedTheme === "dark" ? "Dark" : "Light"})`,
    },
  ];

  const currentIcon =
    themeMode === "light" ? (
      <Sun size={13} className="text-amber-500" />
    ) : themeMode === "dark" ? (
      <Moon size={13} className="text-indigo-400" />
    ) : (
      <Laptop size={13} className="text-[#FF6B00]" />
    );

  return (
    <div className="relative" ref={containerRef} style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2 py-1 h-7 rounded hover:bg-[var(--forge-hover)] text-[var(--forge-text-secondary)] hover:text-[var(--forge-text)] text-xs transition-colors"
        title={`Theme: ${themeMode} (${resolvedTheme})`}
        aria-label="Toggle theme menu"
      >
        {currentIcon}
        {!compact && (
          <span className="capitalize text-[11px] font-medium hidden sm:inline text-[var(--forge-text)]">
            {themeMode}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-[var(--forge-surface)] border border-[var(--forge-border-strong)] shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-[var(--forge-border)]">
            <span className="text-[10px] uppercase font-semibold text-[var(--forge-text-muted)] tracking-wider">
              Theme Mode
            </span>
          </div>

          {options.map((opt) => {
            const isSelected = themeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => {
                  setThemeMode(opt.mode);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--forge-hover)] ${
                  isSelected
                    ? "text-[var(--forge-text)] font-semibold bg-[var(--forge-surface-elevated)]"
                    : "text-[var(--forge-text-secondary)]"
                }`}
              >
                <div className="shrink-0">{opt.icon}</div>
                <div className="flex-1 truncate">
                  <div className="flex items-center gap-1">
                    <span>{opt.label}</span>
                    {opt.mode === "system" && (
                      <span className="text-[10px] text-[var(--forge-text-muted)] font-normal">
                        ({resolvedTheme})
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && <Check size={12} className="text-[#FF6B00] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
