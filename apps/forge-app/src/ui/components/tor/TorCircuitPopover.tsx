import { useState, useEffect } from "react";
import {
  Shield,
  RefreshCw,
  Globe,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Radio,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";
import type { TorStatus, TorCircuit, TorCircuitNode } from "@forge/tor-core";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function TorCircuitPopover({ isOpen, onClose }: Props) {
  const [status, setStatus] = useState<TorStatus | null>(null);
  const [circuit, setCircuit] = useState<TorCircuit | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isTestingLeak, setIsTestingLeak] = useState(false);
  const [leakTestResult, setLeakTestResult] = useState<{
    leakDetected: boolean;
    webrtcPolicy: string;
    details: string;
  } | null>(null);

  // Poll / subscribe to status and circuit events
  useEffect(() => {
    const forge = (window as any).forge;
    if (!forge?.tor) return;

    let mounted = true;

    // Initial fetch
    forge.tor.getStatus().then((st: TorStatus) => {
      if (mounted && st) {
        setStatus(st);
        if (st.currentCircuit) setCircuit(st.currentCircuit);
      }
    }).catch(() => {});

    // Listen for events
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

  if (!isOpen) return null;

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
    <div
      className="absolute right-0 top-full mt-2 w-80 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-2xl shadow-2xl p-4 z-50 text-xs font-sans text-zinc-200 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
      style={{
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.7), 0 0 20px rgba(234, 179, 8, 0.15)",
        borderColor: "rgba(234, 179, 8, 0.3)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--forge-border)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shadow-inner">
            🧅
          </div>
          <div>
            <div className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
              <span>Tor Network</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-normal">
                SOCKS5
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              {isConnected ? "Traffic routed securely" : isConnecting ? "Establishing circuit..." : "Disconnected"}
            </div>
          </div>
        </div>

        {/* Status Dot */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                : isConnecting
                ? "bg-amber-500 animate-ping"
                : "bg-zinc-600"
            }`}
          />
          <span className="text-[11px] font-semibold text-zinc-300">
            {isConnected ? "Connected" : isConnecting ? "Connecting" : "Offline"}
          </span>
        </div>
      </div>

      {/* Circuit Nodes Hops */}
      <div className="my-3 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center justify-between">
          <span>Active Onion Circuit</span>
          {circuit?.totalLatencyMs && (
            <span className="text-amber-400/90 lowercase">{circuit.totalLatencyMs}ms total</span>
          )}
        </div>

        {circuit?.nodes && circuit.nodes.length > 0 ? (
          <div className="space-y-1.5 bg-[var(--forge-bg)]/80 rounded-xl p-2.5 border border-zinc-800/80">
            {circuit.nodes.map((node, i) => (
              <div key={node.ip + i} className="flex items-center justify-between text-[11px] py-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-300 font-mono font-bold">
                    {i === 0 ? "1" : i === 1 ? "2" : "3"}
                  </span>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <span>{node.type.toUpperCase()}</span>
                      <span className="text-zinc-500 font-normal text-[10px] font-mono">
                        {node.ip}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <span>{node.country}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                    ~{node.latencyMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-zinc-500 bg-[var(--forge-bg)] rounded-xl border border-zinc-800">
            Establishing 3-hop circuit (Guard → Middle → Exit)...
          </div>
        )}
      </div>

      {/* Leak Defenses Checklist */}
      <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-1.5 mb-3">
        <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
          <ShieldCheck size={12} className="text-amber-400" />
          <span>Active Leak Defenses</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-300">
          <div className="flex items-center gap-1">
            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
            <span>WebRTC Non-Proxied Off</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
            <span>Proxy DNS Resolution</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
            <span>RAM-only Storage</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
            <span>Hardware Sensors Denied</span>
          </div>
        </div>
      </div>

      {/* Leak Test Result Notification */}
      {leakTestResult && (
        <div className={`p-2 rounded-xl mb-3 border text-[11px] ${
          leakTestResult.leakDetected
            ? "bg-red-500/10 border-red-500/30 text-red-300"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
        }`}>
          <div className="font-bold flex items-center gap-1">
            {leakTestResult.leakDetected ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
            <span>{leakTestResult.leakDetected ? "Potential Leak Detected" : "Leak Test Passed"}</span>
          </div>
          <div className="text-[10px] opacity-90 mt-0.5">{leakTestResult.details}</div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isRotating}
          onClick={handleNewCircuit}
          className="flex-1 py-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={isRotating ? "animate-spin" : ""} />
          <span>New Circuit / Identity</span>
        </button>

        <button
          type="button"
          disabled={isTestingLeak}
          onClick={handleRunLeakTest}
          className="py-1.5 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
          title="Run WebRTC and DNS Leak Verification Test"
        >
          <Zap size={12} className={isTestingLeak ? "animate-pulse text-amber-400" : ""} />
          <span>Test Leaks</span>
        </button>
      </div>

      <div className="mt-2.5 text-[9px] text-zinc-500 text-center">
        Tor routes your traffic through multiple relays. No tool provides 100% absolute anonymity.
      </div>
    </div>
  );
}
