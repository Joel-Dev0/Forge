import { useState } from "react";
import {
  FolderGit2,
  Terminal,
  Play,
  Square,
  Globe,
  GitBranch,
  Search,
  X,
  FolderOpen,
  FileCode,
} from "lucide-react";
import { useProjectsStore } from "../../core/projects/useProjectsStore";
import { type ProjectEcosystem } from "../../core/projects/projectScanner";
import { useTerminalStore } from "../../core/terminal/useTerminalStore";
import { IdeExplorerSidebarView } from "./IdeExplorerSidebarView";

export function ProjectDashboardModal() {
  const {
    projects,
    selectedProjectPath,
    activeEcosystemFilter,
    runningProcesses,
    isDashboardOpen,
    setDashboardOpen,
    setSelectedProject,
    setEcosystemFilter,
    runProjectScript,
    stopProjectScript,
    bindPortToBrowserTab,
  } = useProjectsStore();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"explorer" | "overview">("explorer");
  const setTerminalCwd = useTerminalStore((s) => s.setCwd);

  if (!isDashboardOpen) return null;

  const filteredProjects = projects.filter((p) => {
    const matchesEco = activeEcosystemFilter === "all" || p.ecosystem === activeEcosystemFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.path.toLowerCase().includes(search.toLowerCase()) ||
      (p.framework && p.framework.toLowerCase().includes(search.toLowerCase()));
    return matchesEco && matchesSearch;
  });

  const selected = projects.find((p) => p.path === selectedProjectPath) || filteredProjects[0];

  const ECOSYSTEM_BADGES: Record<ProjectEcosystem, { label: string; color: string; bg: string }> = {
    node: { label: "Node.js / React", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
    rust: { label: "Rust / Cargo", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
    python: { label: "Python", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
    go: { label: "Go", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
    java: { label: "Java / Spring", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
    dotnet: { label: ".NET Core", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  };

  return (
    <div className="fixed inset-0 z-[10015] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#12141f] border border-[var(--forge-border)] w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--forge-border)] bg-[#151827]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/30 shadow-inner">
              <FolderGit2 size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Developer Project Dashboard & Launcher</h2>
              <p className="text-[11px] text-zinc-400">
                Auto-detection across 6 ecosystems with manifest script runners and browser tab port binding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("explorer")}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === "explorer"
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Explorer Tree
              </button>
              <button
                type="button"
                onClick={() => setViewMode("overview")}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === "overview"
                    ? "bg-[#FF6B00] text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Project Overview
              </button>
            </div>

            <button
              onClick={() => setDashboardOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Content - Two Columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Explorer View or Project List */}
          {viewMode === "explorer" ? (
            <div className="w-80 border-r border-[var(--forge-border)] h-full">
              <IdeExplorerSidebarView />
            </div>
          ) : (
            <div className="w-80 border-r border-[var(--forge-border)] bg-[#10121d] flex flex-col">
            {/* Search and Filters */}
            <div className="p-3 border-b border-[var(--forge-border)] space-y-2">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)]">
                <Search size={13} className="text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none w-full placeholder-zinc-500 font-mono"
                />
              </div>

              {/* Ecosystem Chips */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                {(["all", "node", "rust", "python", "go", "java", "dotnet"] as const).map((eco) => (
                  <button
                    key={eco}
                    onClick={() => setEcosystemFilter(eco)}
                    className={`px-2 py-0.5 rounded-md font-medium capitalize shrink-0 transition-colors cursor-pointer ${
                      activeEcosystemFilter === eco
                        ? "bg-[#FF6B00] text-white"
                        : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {eco}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredProjects.map((prj) => {
                const badge = ECOSYSTEM_BADGES[prj.ecosystem];
                const isSelected = selected?.path === prj.path;
                return (
                  <button
                    key={prj.path}
                    onClick={() => setSelectedProject(prj.path)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#FF6B00] bg-[#FF6B00]/10 shadow-sm"
                        : "border-transparent hover:border-[var(--forge-border)] hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate max-w-[170px]">{prj.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono border ${badge.bg} ${badge.color}`}>
                        {prj.ecosystem.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-400 font-mono">
                      <span className="text-zinc-300 font-medium">{prj.framework}</span>
                      <span>•</span>
                      <span>{prj.packageManager}</span>
                    </div>
                    {prj.gitBranch && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400 font-mono">
                        <GitBranch size={10} className="text-blue-400" />
                        <span className="truncate">{prj.gitBranch}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

          {/* Right: Project Details & Runner */}
          {selected ? (
            <div className="flex-1 flex flex-col bg-[#12141f] overflow-y-auto p-6 space-y-6">
              {/* Project Title Bar */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                    <span className="text-xs font-mono text-zinc-400">v{selected.version || "1.0.0"}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        ECOSYSTEM_BADGES[selected.ecosystem].bg
                      } ${ECOSYSTEM_BADGES[selected.ecosystem].color}`}
                    >
                      {selected.framework}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 mt-1 flex items-center gap-1">
                    <FolderOpen size={12} className="text-zinc-500" />
                    <span>{selected.path}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTerminalCwd(selected.path);
                      window.dispatchEvent(new CustomEvent("forge:open-terminal"));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    <Terminal size={12} />
                    <span>Open in Terminal</span>
                  </button>

                  {selected.activePort && (
                    <button
                      onClick={() => bindPortToBrowserTab(selected.activePort!, selected.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-xs font-bold text-white shadow-md shadow-[#FF6B00]/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Globe size={12} />
                      <span>Launch :{selected.activePort} in Tab</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Manifest Scripts Section (Section 12.1 Project Runner) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode size={13} className="text-[#FF6B00]" />
                    <span>Manifest Scripts ({selected.packageManager})</span>
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">Auto-detected from manifest file</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {Object.entries(selected.scripts).map(([name, cmd]) => {
                    const procKey = `${selected.path}:${name}`;
                    const proc = runningProcesses[procKey];
                    const isRunning = proc?.status === "running";

                    return (
                      <div
                        key={name}
                        className="p-3 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold font-mono text-white">{name}</span>
                            {isRunning && (
                              <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/20 px-1.5 rounded border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">{cmd}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {isRunning ? (
                            <button
                              onClick={() => stopProjectScript(selected.path, name)}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                              title="Stop Process"
                            >
                              <Square size={13} />
                            </button>
                          ) : (
                            <button
                              onClick={() => runProjectScript(selected.path, name)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF6B00]/20 text-[#FF6B00] hover:bg-[#FF6B00] hover:text-white text-xs font-bold border border-[#FF6B00]/30 transition-all cursor-pointer"
                            >
                              <Play size={11} />
                              <span>Run</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Integrated Runner Terminal Logs */}
              <div className="space-y-2 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal size={13} className="text-blue-400" />
                    <span>Process Output & Port Tracker</span>
                  </h4>
                  {selected.activePort && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      Detected Listening Port: {selected.activePort}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-h-[160px] p-3 rounded-xl bg-[#090b11] border border-[var(--forge-border)] font-mono text-[11px] text-zinc-300 overflow-y-auto space-y-1">
                  {Object.values(runningProcesses)
                    .filter((p) => p.projectPath === selected.path)
                    .flatMap((p) => p.logs)
                    .map((line, idx) => (
                      <p key={idx} className="leading-relaxed">
                        <span className="text-zinc-500 mr-2">&gt;</span>
                        {line}
                      </p>
                    ))}
                  {Object.values(runningProcesses).filter((p) => p.projectPath === selected.path).length === 0 && (
                    <p className="text-zinc-600 italic">No active processes. Click "Run" on any script above to launch.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
              Select or scan a project to view configuration
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
