import React, { useState } from "react";
import {
  Shield,
  EyeOff,
  Globe,
  Lock,
  Download,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Flame,
} from "lucide-react";
import {
  normalizeUrl,
  useNavigationStore,
  SEARCH_ENGINES,
} from "../../../core/navigation/useNavigationStore";
import { SearchEngineDropdown } from "../SearchEngineDropdown";
import { useTabsStore } from "../../../core/tabs/useTabsStore";

interface Props {
  onNavigate: (url: string) => void;
}

export function PrivateNewTabHome({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { searchEngine } = useNavigationStore();
  const { openTorTab, openTab } = useTabsStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const url = normalizeUrl(q, searchEngine);
    onNavigate(url);
  };

  return (
    <div className="w-full h-full relative overflow-y-auto select-none bg-[#0c0914] text-zinc-200 flex flex-col items-center justify-center p-6">
      {/* Background ambient purple glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(168, 85, 247, 0.12) 0%, rgba(12, 9, 20, 0.95) 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center">
        {/* Badge & Title */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
          <span className="text-sm">🕶️</span>
          <span>Forge Private Window</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 text-center">
          You are browsing in <span className="text-purple-400">Private</span>
        </h1>
        <p className="text-sm text-zinc-400 text-center max-w-xl mb-6">
          Forge isolates this session in RAM. When you close all private tabs, temporary data is permanently wiped from memory.
        </p>

        {/* Central Search / Address Bar */}
        <form
          onSubmit={handleSearch}
          className={`w-full max-w-2xl flex items-center gap-2 h-12 px-4 rounded-2xl bg-[#140f22]/90 border transition-all shadow-xl backdrop-blur-xl mb-8 ${
            focused
              ? "border-purple-500/60 ring-4 ring-purple-500/20 shadow-[0_0_25px_rgba(168,85,247,0.25)]"
              : "border-purple-500/25 hover:border-purple-500/40"
          }`}
        >
          <SearchEngineDropdown variant="compact" />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search privately or enter URL..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-zinc-500 font-sans"
            autoFocus
          />

          <button
            type="submit"
            className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Search"
          >
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Core Architecture Disclosures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full mb-6">
          {/* Card 1: What is Cleared */}
          <div className="p-4 rounded-2xl bg-[#130f20]/80 border border-purple-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                <span>Temporary Local Data (RAM Only)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                When you close this private session, Forge destroys all temporary in-memory Chromium storage:
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-zinc-300 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Cookies & Sessions</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>LocalStorage / IndexedDB</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Browser Cache</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Temporary Permissions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: What is NOT Hidden */}
          <div className="p-4 rounded-2xl bg-[#130f20]/80 border border-purple-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <span>Traffic is Not Hidden from Network</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Standard Private Mode does <span className="text-white font-semibold">not</span> hide your IP address or traffic from your ISP, employer, or school network.
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-[11px] text-amber-300/90">Need onion network routing?</span>
              <button
                type="button"
                onClick={() => openTorTab()}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Switch to Tor Mode</span>
                <span className="text-xs">🧅</span>
              </button>
            </div>
          </div>

          {/* Card 3: Downloads & Files */}
          <div className="p-4 rounded-2xl bg-[#130f20]/80 border border-purple-500/20">
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1.5">
              <Download size={16} className="text-purple-400 shrink-0" />
              <span>Downloads Behavior</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Files you download are saved to your real filesystem and remain on your computer. However, your private download history list is wiped when the private window is closed.
            </p>
          </div>

          {/* Card 4: Forge Shield & Extensions */}
          <div className="p-4 rounded-2xl bg-[#130f20]/80 border border-purple-500/20">
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1.5">
              <ShieldCheck size={16} className="text-purple-400 shrink-0" />
              <span>Shield Protection & Extensions</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ad Blocker and Tracker Protection remain active. Extensions are disabled by default in private mode to prevent background data collection.
            </p>
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>Private Mode: Local isolation</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => openTab("about:blank", "default")}
            className="hover:text-zinc-300 transition-colors cursor-pointer underline"
          >
            Open Normal Window
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => openTorTab()}
            className="hover:text-amber-400 transition-colors cursor-pointer underline"
          >
            Open Tor Window (🧅)
          </button>
        </div>
      </div>
    </div>
  );
}
