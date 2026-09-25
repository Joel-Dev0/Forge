import { useState, useRef, useEffect } from "react";
import { useTabsStore } from "../../../core/tabs/useTabsStore";
import { useSessionsStore } from "../../../core/sessions/useSessionsStore";
import { TorCircuitPopover } from "./TorCircuitPopover";
import type { TorStatus } from "@forge/tor-core";

export function TorStatusButton() {
  const { tabs, activeTabId, openPrivateTab, openTorTab, closeTab } = useTabsStore();
  const { getSession } = useSessionsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [torStatus, setTorStatus] = useState<TorStatus | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const session = getSession(activeTab?.sessionId);
  const isTorTab = session.mode === "tor" || activeTab?.sessionId === "tor" || activeTab?.sessionId?.startsWith("tor_");
  const isPrivateTab = session.mode === "private" || activeTab?.sessionId === "private" || activeTab?.sessionId?.startsWith("private_");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.tor) return;

    let mounted = true;
    forge.tor.getStatus().then((st: TorStatus) => {
      if (mounted && st) setTorStatus(st);
    }).catch(() => {});

    const unsub = forge.tor.onStatusChanged?.((st: TorStatus) => {
      if (mounted && st) setTorStatus(st);
    });

    return () => {
      mounted = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // 1. If in Tor Mode
  if (isTorTab || torStatus?.state === "CONNECTED" || torStatus?.state === "CONNECTING") {
    const isConnected = torStatus?.state === "CONNECTED";
    const isConnecting = torStatus?.state === "CONNECTING" || torStatus?.state === "STARTING";

    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title="Tor Onion Network Status & Circuit Inspector"
          className="h-6 px-2 flex items-center gap-1.5 rounded-md transition-all cursor-pointer border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300"
        >
          <span className="text-xs select-none">🧅</span>
          <span className="text-xs font-semibold">Tor</span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isConnected
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                : isConnecting
                ? "bg-amber-400 animate-pulse"
                : "bg-zinc-500"
            }`}
          />
        </button>

        <TorCircuitPopover isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    );
  }

  // 2. If in standard Private Mode (RAM-only local privacy)
  if (isPrivateTab) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title="Private Window: Ephemeral RAM-only session. History, cookies, and cache destroyed on window close."
          className="h-6 px-2 flex items-center gap-1.5 rounded-md border border-purple-500/40 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.25)] select-none"
        >
          <span className="text-xs">🕶️</span>
          <span className="text-xs font-semibold">Private</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#120d20] border border-purple-500/35 rounded-xl shadow-2xl p-3 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100 text-white">
            <div className="flex items-center justify-between pb-2 border-b border-purple-500/25 mb-2.5">
              <div className="flex items-center gap-1.5 font-bold text-purple-300">
                <span className="text-sm">🕶️</span>
                <span>Private Session Active</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                RAM ONLY
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-zinc-300 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Local Storage:</span>
                <span className="text-emerald-400 font-mono">Isolated in RAM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Cookies &amp; Cache:</span>
                <span className="text-emerald-400 font-mono">Auto-purged on close</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">WebRTC Leaks:</span>
                <span className="text-emerald-400 font-mono">Shielded</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Disk Persistence:</span>
                <span className="text-zinc-400 font-mono">Disabled</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
              {activeTab && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    closeTab(activeTab.id);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-semibold transition-colors cursor-pointer text-center"
                >
                  Close Tab &amp; Purge RAM Data
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  openTorTab();
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <span>🧅</span>
                <span>Switch to Tor Onion Mode</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Normal Mode: Sleek Quick Launcher for Private & Tor modes
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Privacy Modes: Private Window (RAM) & Tor Network (SOCKS5)"
        className="h-6 px-1.5 flex items-center gap-1 rounded-md hover:bg-purple-500/15 text-zinc-400 hover:text-purple-300 border border-transparent hover:border-purple-500/30 transition-all cursor-pointer text-xs"
      >
        <span className="text-xs select-none">🕶️</span>
        <span className="text-[11px] font-medium hidden sm:inline text-zinc-400 hover:text-purple-300">Private</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#110d1d] border border-purple-500/35 rounded-xl shadow-2xl p-2 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100 text-white">
          <div className="px-2 py-1 text-[10px] font-bold text-purple-300 border-b border-purple-500/20 mb-1.5 flex items-center justify-between uppercase tracking-wider">
            <span>Privacy Modes</span>
            <span className="text-[9px] font-mono text-zinc-400">Forge Shield</span>
          </div>

          <button
            type="button"
            onClick={() => {
              openPrivateTab();
              setIsOpen(false);
            }}
            className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-purple-500/15 text-left transition-colors cursor-pointer group mb-1 border border-transparent hover:border-purple-500/30"
          >
            <div className="w-7 h-7 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 text-sm mt-0.5">
              🕶️
            </div>
            <div>
              <div className="font-bold text-white group-hover:text-purple-300 transition-colors flex items-center justify-between">
                <span>Private Window</span>
                <span className="text-[9px] font-mono text-zinc-400 font-normal">Ctrl+Shift+N</span>
              </div>
              <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                Ephemeral RAM storage. History, cookies, and cache destroyed on close.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              openTorTab();
              setIsOpen(false);
            }}
            className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-amber-500/15 text-left transition-colors cursor-pointer group border border-transparent hover:border-amber-500/30"
          >
            <div className="w-7 h-7 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 text-sm mt-0.5">
              🧅
            </div>
            <div>
              <div className="font-bold text-white group-hover:text-amber-300 transition-colors">
                <span>Tor Mode</span>
              </div>
              <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                Routes all traffic through Tor Onion network (hides IP and ISP tracking).
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
