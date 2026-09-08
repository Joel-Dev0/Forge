import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Network,
  Terminal,
  Gauge,
  Radio,
  Send,
  Crosshair,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { HttpEngineInspector } from "./HttpEngineInspector";
import { NetworkInspector } from "./NetworkInspector";
import { ConsoleIA } from "./ConsoleIA";
import { VisualInspector } from "./VisualInspector";
import { ApiMonitor } from "./ApiMonitor";
import { PerformanceAnalyzer } from "./PerformanceAnalyzer";
import { BlockedRequestsInspector } from "./BlockedRequestsInspector";
import { useNetworkStore } from "../../core/network/useNetworkStore";
import { useConsoleStore } from "../../core/console/useConsoleStore";
import { useAdBlockStore } from "../../core/adblock/useAdBlockStore";

type DevTab = "inspector" | "console" | "network" | "adblock" | "api_monitor" | "performance" | "status";

interface DevToolsBarProps {
  getActiveWebview?: () => WebviewElement | null;
}

export function DevToolsBar({ getActiveWebview }: DevToolsBarProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DevTab>("network");
  const [networkSubView, setNetworkSubView] = useState<"live" | "studio">("live");

  const networkEntries = useNetworkStore((s) => s.entries);
  const consoleLogs = useConsoleStore((s) => s.logs);
  const errorCount = consoleLogs.filter((l) => l.level === "error").length;

  const blockedCount = useAdBlockStore((s) => s.stats?.blockedCount ?? s.requests.filter((r) => r.status === "blocked").length);

  const tabs: { id: DevTab; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    {
      id: "inspector",
      label: "Visual Inspector",
      icon: <Crosshair size={12} />,
    },
    {
      id: "console",
      label: "Console IA",
      icon: <Terminal size={12} />,
      badge: errorCount > 0 ? String(errorCount) : undefined,
      badgeColor: "bg-red-500/20 text-red-400",
    },
    {
      id: "network",
      label: "Inspector Red",
      icon: <Network size={12} />,
      badge: networkEntries.length > 0 ? String(networkEntries.length) : undefined,
      badgeColor: "bg-[#FF6B00]/20 text-[#FF6B00]",
    },
    {
      id: "adblock",
      label: "Blocked Requests",
      icon: <ShieldAlert size={12} />,
      badge: blockedCount > 0 ? String(blockedCount) : undefined,
      badgeColor: "bg-red-500/20 text-red-400",
    },
    {
      id: "api_monitor",
      label: "API Monitor",
      icon: <Radio size={12} />,
    },
    {
      id: "performance",
      label: "Performance",
      icon: <Gauge size={12} />,
    },
    {
      id: "status",
      label: "Status",
      icon: <ShieldCheck size={12} />,
    },
  ];

  return (
    <div className="w-full shrink-0 border-t border-[var(--forge-border)] bg-[var(--forge-bg)] transition-colors select-none">
      {/* Tab strip */}
      <div className="flex items-center h-6 px-3 gap-3 w-full">
        {tabs.map((t) => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => {
              setActiveTab(t.id);
              setOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3 h-5 text-[10px] rounded transition-all cursor-pointer ${
              activeTab === t.id && open
                ? "bg-[var(--forge-surface-elevated)] text-[#FF6B00] font-semibold shadow-xs"
                : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)]"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline font-sans">{t.label}</span>
            {t.badge && (
              <span className={`text-[8px] px-1 rounded font-mono font-bold leading-tight ${t.badgeColor || "bg-[#FF6B00]/20 text-[#FF6B00]"}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}

        {/* Subview switch for Network Inspector */}
        {open && activeTab === "network" && (
          <div className="flex items-center ml-1 p-0.5 rounded bg-[var(--forge-input)] text-[9px]">
            <button
              title="Live Traffic"
              onClick={() => setNetworkSubView("live")}
              className={`flex items-center gap-0.5 px-1.5 py-0 rounded transition-colors cursor-pointer ${
                networkSubView === "live"
                  ? "bg-[var(--forge-surface)] text-[#FF6B00] font-semibold shadow-xs"
                  : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              <Radio size={10} />
            </button>
            <button
              title="HTTP Engine (Stage A)"
              onClick={() => setNetworkSubView("studio")}
              className={`flex items-center gap-0.5 px-1.5 py-0 rounded transition-colors cursor-pointer ${
                networkSubView === "studio"
                  ? "bg-[var(--forge-surface)] text-[#FF6B00] font-semibold shadow-xs"
                  : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              <Send size={10} />
            </button>
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="ml-auto text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors p-0.5 rounded hover:bg-[var(--forge-hover)] cursor-pointer"
          title={open ? "Collapse dev tools" : "Expand dev tools"}
        >
          {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      {/* Panel */}
      {open && (
        <div className="h-80 w-full border-t border-[var(--forge-border)] bg-[var(--forge-surface)] overflow-hidden transition-all flex flex-col">
          {activeTab === "inspector" && (
            <VisualInspector getActiveWebview={getActiveWebview} />
          )}
          {activeTab === "console" && (
            <ConsoleIA getActiveWebview={getActiveWebview} />
          )}
          {activeTab === "network" && (
            networkSubView === "live" ? <NetworkInspector /> : <HttpEngineInspector />
          )}
          {activeTab === "adblock" && (
            <BlockedRequestsInspector />
          )}
          {activeTab === "api_monitor" && (
            <ApiMonitor
              onSwitchToEngineStudio={() => {
                setActiveTab("network");
                setNetworkSubView("studio");
              }}
            />
          )}
          {activeTab === "performance" && (
            <PerformanceAnalyzer getActiveWebview={getActiveWebview} />
          )}
          {activeTab === "status" && (
            <div className="p-4 text-[var(--forge-text-muted)] text-xs font-mono space-y-2 select-text w-full">
              <p className="font-bold text-[var(--forge-text)] flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#FF6B00]" />
                Forge System Status & Diagnostics
              </p>
              <div className="p-3 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] space-y-1 text-[11px]">
                <p>? Visual Inspector (DOM / CSS / Box Model): Active</p>
                <p>? Console IA (JS REPL & AI Debugger): Active</p>
                <p>? Inspector Red (Network Traffic & Response Capture): Active</p>
                <p>? API Monitor (REST / GraphQL / JSON Payloads): Active</p>
                <p>? Performance Analyzer (Core Web Vitals & Waterfall): Active</p>
                <p>? Project Workspaces: Active</p>
                <p>? Stage A Native HTTP Engine: Active</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}