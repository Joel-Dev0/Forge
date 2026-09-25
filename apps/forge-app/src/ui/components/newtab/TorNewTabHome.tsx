import React, { useState, useEffect } from "react";
import {
  Shield,
  RefreshCw,
  Globe,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Radio,
  ExternalLink,
} from "lucide-react";
import {
  normalizeUrl,
  useNavigationStore,
} from "../../../core/navigation/useNavigationStore";
import { SearchEngineDropdown } from "../SearchEngineDropdown";
import { useTabsStore } from "../../../core/tabs/useTabsStore";
import type { TorStatus, TorCircuit } from "@forge/tor-core";

interface Props {
  onNavigate: (url: string) => void;
}

export function TorNewTabHome({ onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<TorStatus | null>(null);
  const [circuit, setCircuit] = useState<TorCircuit | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isTestingLeak, setIsTestingLeak] = useState(false);
  const [leakTestResult, setLeakTestResult] = useState<{
    leakDetected: boolean;
    webrtcPolicy: string;
    details: string;
  } | null>(null);

  const { searchEngine } = useNavigationStore();
  const { openPrivateTab, openTab } = useTabsStore();

  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.tor) return;

    let mounted = true;
    forge.tor.getStatus().then((st: TorStatus) => {
      if (mounted && st) {
        setStatus(st);
        if (st.currentCircuit) setCircuit(st.currentCircuit);
      }
    }).catch(() => {});

    const unsubStatus = forge.tor.onStatusChanged?.((st: TorStatus) => {
      if (mounted && st) {
        setStatus(st);
        if (st.currentCircuit) setCircuit(st.currentCircuit);
      }
    });

    const unsubCircuit = forge.tor.onCircuitChanged?.((circ: TorCircuit) => {
      if (mounted && circ) {
        setCircuit(circ);
      }
    });

    return () => {
      mounted = false;
      if (typeof unsubStatus === "function") unsubStatus();
      if (typeof unsubCircuit === "function") unsubCircuit();
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const url = normalizeUrl(q, searchEngine);
    onNavigate(url);
  };

  const handleNewCircuit = async () => {
    const forge = (window as any).forge;
    if (!forge?.tor) return;
    setIsRotating(true);
    try {
      const newCirc = await forge.tor.newCircuit();
      if (newCirc) setCircuit(newCirc);
    } catch (err) {
      console.error("[Tor] Failed to rotate circuit:", err);
    } finally {
      setIsRotating(false);
    }
  };

  const handleRunLeakTest = async () => {
    const forge = (window as any).forge;
    if (!forge?.tor) return;
    setIsTestingLeak(true);
    try {
      const res = await forge.tor.testLeak();
      setLeakTestResult(res);
    } catch (err) {
      console.error("[Tor] Failed to run leak test:", err);
    } finally {
      setIsTestingLeak(false);
    }
  };

  const isConnected = status?.state === "CONNECTED";
  const isConnecting = status?.state === "CONNECTING" || status?.state === "STARTING";

  return (
    <div className="w-full h-full relative overflow-y-auto select-none bg-[#0e0c05] text-zinc-200 flex flex-col items-center justify-center p-6">
      {/* Background ambient amber/gold glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 25%, rgba(234, 179, 8, 0.12) 0%, rgba(14, 12, 5, 0.96) 75%)",
        }}
      />

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center">
        {/* Badge & Title */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
          <span className="text-sm">🧅</span>
          <span>Forge Tor Mode</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-200">
            {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Offline"}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 text-center">
          Private Browsing via <span className="text-amber-400">Tor Network</span>
        </h1>
        <p className="text-sm text-zinc-400 text-center max-w-xl mb-6">
          Your traffic is routed through encrypted onion relays. Ephemeral in-memory storage protects your local device.
        </p>

        {/* Central Search / Address Bar */}
        <form
          onSubmit={handleSearch}
          className={`w-full max-w-2xl flex items-center gap-2 h-12 px-4 rounded-2xl bg-[#171408]/90 border transition-all shadow-xl backdrop-blur-xl mb-6 ${
            focused
              ? "border-amber-500/60 ring-4 ring-amber-500/20 shadow-[0_0_25px_rgba(234,179,8,0.25)]"
              : "border-amber-500/25 hover:border-amber-500/40"
          }`}
        >
          <SearchEngineDropdown variant="compact" />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search with Tor or enter .onion / web address..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-zinc-500 font-sans"
            autoFocus
          />

          <button
            type="submit"
            className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Search"
          >
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Live Tor Circuit Card */}
        <div className="w-full max-w-2xl p-4 rounded-2xl bg-[#161208]/90 border border-amber-500/25 mb-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="font-bold text-xs uppercase tracking-wider text-amber-300 font-mono">
                Current Onion Circuit
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRotating}
                onClick={handleNewCircuit}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={11} className={isRotating ? "animate-spin" : ""} />
                <span>New Circuit</span>
              </button>

              <button
                type="button"
                disabled={isTestingLeak}
                onClick={handleRunLeakTest}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Zap size={11} className={isTestingLeak ? "animate-pulse text-amber-400" : ""} />
                <span>Test Leaks</span>
              </button>
            </div>
          </div>

          {/* 3 Hops Visualizer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {circuit?.nodes && circuit.nodes.length >= 3 ? (
              circuit.nodes.map((node, i) => (
                <div key={node.ip + i} className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase">
                      {node.type}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">~{node.latencyMs}ms</span>
                  </div>
                  <div className="font-semibold text-white text-xs truncate">{node.country}</div>
                  <div className="text-[10px] font-mono text-zinc-500 truncate">{node.ip}</div>
                </div>
              ))
            ) : (
              <div className="col-span-3 py-3 text-center text-xs text-zinc-500">
                Establishing 3-hop circuit (Guard → Middle → Exit)...
              </div>
            )}
          </div>

          {leakTestResult && (
            <div className={`mt-3 p-2.5 rounded-xl border text-xs ${
              leakTestResult.leakDetected
                ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                {leakTestResult.leakDetected ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                <span>{leakTestResult.leakDetected ? "Potential Leak Detected" : "Leak Defense Verification Passed"}</span>
              </div>
              <div className="text-[11px] opacity-90 mt-0.5">{leakTestResult.details}</div>
            </div>
          )}
        </div>

        {/* Protection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full mb-6">
          <div className="p-4 rounded-2xl bg-[#151208]/80 border border-amber-500/20">
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1.5">
              <ShieldCheck size={16} className="text-amber-400 shrink-0" />
              <span>Leak Defenses Enforced</span>
            </div>
            <ul className="text-xs text-zinc-400 space-y-1.5">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>WebRTC: Non-proxied UDP strictly disabled</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>DNS: Resolved remotely through proxy</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Sensors: Location, camera, and mic blocked</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-[#151208]/80 border border-amber-500/20">
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1.5">
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <span>Anonymity Disclosure</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tor provides strong network routing privacy, but no system provides 100% absolute anonymity. Logging into personal accounts links your activity to that identity.
            </p>
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>Tor Mode: Network privacy + RAM isolation</span>
          <span>•</span>
          <button
            type="button"
            onClick={() => openPrivateTab()}
            className="hover:text-purple-400 transition-colors cursor-pointer underline"
          >
            Switch to Private Mode (🕶️)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => openTab("about:blank", "default")}
            className="hover:text-zinc-300 transition-colors cursor-pointer underline"
          >
            Open Normal Window (🌐)
          </button>
        </div>
      </div>
    </div>
  );
}
