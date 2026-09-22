import { useEffect, useState } from "react";
import { RotateCw, X, ShieldAlert } from "lucide-react";
import { useCompatStore } from "../../core/compat/useCompatStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";

export function CrashGuardBanner() {
  const { activeCrash, crashGuardMode, dismissActiveCrash } = useCompatStore();
  const tabs = useTabsStore((s) => s.tabs);
  const [countdown, setCountdown] = useState(3);

  const crashedTab = tabs.find((t) => t.id === activeCrash?.tabId);

  useEffect(() => {
    if (!activeCrash) {
      setCountdown(3);
      return;
    }

    if (crashGuardMode === "auto-restore") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleRestore();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeCrash, crashGuardMode]);

  if (!activeCrash) return null;

  const handleRestore = () => {
    dismissActiveCrash();
    try {
      const webviewEl = document.querySelector(`webview[data-tab-id="${activeCrash.tabId}"], webview[tabid="${activeCrash.tabId}"]`) as any;
      if (webviewEl && typeof webviewEl.reload === "function") {
        webviewEl.reload();
      } else {
        const tab = useTabsStore.getState().tabs.find((t) => t.id === activeCrash.tabId);
        if (tab?.url) {
          useTabsStore.getState().updateTab(activeCrash.tabId, { url: tab.url });
        }
      }
    } catch {}
  };

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[10010] w-full max-w-lg px-4 animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-[#12141f]/95 border border-red-500/40 backdrop-blur-xl rounded-2xl shadow-2xl p-4 text-white flex items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse">
            <ShieldAlert size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Forge Crash Guard
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800">
                {activeCrash.reason.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-zinc-300 truncate mt-0.5 font-medium">
              {crashedTab?.title || "Tab"} encountered a renderer fault.
            </p>
            {crashGuardMode === "auto-restore" && countdown > 0 && (
              <p className="text-[11px] text-[#FF6B00] font-mono mt-0.5">
                Auto-recovering tab in {countdown}s...
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRestore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <RotateCw size={12} />
            <span>Restore Now</span>
          </button>
          <button
            type="button"
            onClick={dismissActiveCrash}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
