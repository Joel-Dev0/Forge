import React, { useState } from "react";
import { X, Check, Globe, RefreshCw, Key, Shield, ExternalLink } from "lucide-react";
import { useDevOpsActivityStore } from "../../../core/devops/useDevOpsActivityStore";

interface DevOpsConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevOpsConnectionModal: React.FC<DevOpsConnectionModalProps> = ({ isOpen, onClose }) => {
  const { connections, updateConnection, syncActivity, isSyncing } = useDevOpsActivityStore();

  const [activeTab, setActiveTab] = useState<"github" | "azure" | "gitlab">("github");

  // Local form states
  const [ghRepo, setGhRepo] = useState(connections.github.repoOrProject || "Joel-Dev0/Forge");
  const [ghToken, setGhToken] = useState(connections.github.token || "");
  const [ghMode, setGhMode] = useState<"simulation" | "live">(connections.github.mode || "simulation");

  const [azOrg, setAzOrg] = useState(connections.azure.orgName || "Forge-Engineering");
  const [azProject, setAzProject] = useState(connections.azure.repoOrProject || "Forge-Core / Sprint 38");
  const [azToken, setAzToken] = useState(connections.azure.token || "");
  const [azMode, setAzMode] = useState<"simulation" | "live">(connections.azure.mode || "simulation");

  const [glProject, setGlProject] = useState(connections.gitlab.repoOrProject || "forge-platform");
  const [glToken, setGlToken] = useState(connections.gitlab.token || "");
  const [glMode, setGlMode] = useState<"simulation" | "live">(connections.gitlab.mode || "simulation");

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (activeTab === "github") {
      updateConnection("github", {
        repoOrProject: ghRepo,
        token: ghToken,
        mode: ghMode,
        connected: true,
      });
    } else if (activeTab === "azure") {
      updateConnection("azure", {
        orgName: azOrg,
        repoOrProject: azProject,
        token: azToken,
        mode: azMode,
        connected: true,
      });
    } else if (activeTab === "gitlab") {
      updateConnection("gitlab", {
        repoOrProject: glProject,
        token: glToken,
        mode: glMode,
        connected: true,
      });
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        style={{ backgroundColor: "#16171B", borderColor: "#2B2B2B" }}
        className="w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col text-white"
      >
        {/* Header */}
        <div style={{ borderColor: "#2B2B2B" }} className="p-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: "#2B2B2B", color: "#FF6B00" }}
              className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md font-bold"
            >
              <span>⚡</span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">DevOps Activity Connections</h3>
              <p className="text-xs text-[#FFB947]/70">
                Sync developer activity, commits, PRs &amp; work items with your streaks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Provider Tabs */}
        <div style={{ borderColor: "#2B2B2B" }} className="flex border-b px-5 pt-3 gap-2 bg-[#0D0D0D]">
          <button
            type="button"
            onClick={() => setActiveTab("github")}
            style={{
              borderColor: activeTab === "github" ? "#FF6B00" : "transparent",
              color: activeTab === "github" ? "#FF6B00" : "#888",
            }}
            className="flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs cursor-pointer transition-colors"
          >
            <span>🐙</span>
            <span>GitHub</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("azure")}
            style={{
              borderColor: activeTab === "azure" ? "#FF6B00" : "transparent",
              color: activeTab === "azure" ? "#FF6B00" : "#888",
            }}
            className="flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs cursor-pointer transition-colors"
          >
            <span>🔷</span>
            <span>Azure DevOps</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gitlab")}
            style={{
              borderColor: activeTab === "gitlab" ? "#FF6B00" : "transparent",
              color: activeTab === "gitlab" ? "#FF6B00" : "#888",
            }}
            className="flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs cursor-pointer transition-colors"
          >
            <span>🦊</span>
            <span>GitLab</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-4">
          {activeTab === "github" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D0D0D] border border-[#2B2B2B]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🐙</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">GitHub Integration Mode</h4>
                    <p className="text-[11px] text-[#FFB947]/70">
                      {ghMode === "live" ? "Fetching live commits & PRs via GitHub REST API" : "Simulating live development velocity"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#1E1E1E] p-1 rounded-xl border border-[#2B2B2B]">
                  <button
                    type="button"
                    onClick={() => setGhMode("simulation")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      ghMode === "simulation" ? "bg-[#FF6B00] text-black" : "text-zinc-400"
                    }`}
                  >
                    Simulated
                  </button>
                  <button
                    type="button"
                    onClick={() => setGhMode("live")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      ghMode === "live" ? "bg-[#FF6B00] text-black" : "text-zinc-400"
                    }`}
                  >
                    Live API
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#FFB947] block mb-1.5">
                  Repository Name (owner/repo)
                </label>
                <input
                  type="text"
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
                  placeholder="e.g. Joel-Dev0/Forge"
                  style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs text-white outline-none focus:border-[#FF6B00] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#FFB947] block mb-1.5 flex items-center justify-between">
                  <span>Personal Access Token (PAT)</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Optional for public repos</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                    className="w-full px-3.5 py-2 pl-9 rounded-xl border text-xs text-white outline-none focus:border-[#FF6B00] font-mono"
                  />
                  <Key size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "azure" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D0D0D] border border-[#2B2B2B]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🔷</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">Azure DevOps Mode</h4>
                    <p className="text-[11px] text-[#FFB947]/70">
                      Syncing Azure Boards Work Items, Sprint Telemetry &amp; Pipelines
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#1E1E1E] p-1 rounded-xl border border-[#2B2B2B]">
                  <button
                    type="button"
                    onClick={() => setAzMode("simulation")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      azMode === "simulation" ? "bg-[#FF6B00] text-black" : "text-zinc-400"
                    }`}
                  >
                    Simulated
                  </button>
                  <button
                    type="button"
                    onClick={() => setAzMode("live")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      azMode === "live" ? "bg-[#FF6B00] text-black" : "text-zinc-400"
                    }`}
                  >
                    Live API
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#FFB947] block mb-1.5">
                  Organization / Team Project
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={azOrg}
                    onChange={(e) => setAzOrg(e.target.value)}
                    placeholder="Organization"
                    style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                    className="px-3.5 py-2 rounded-xl border text-xs text-white outline-none focus:border-[#FF6B00] font-mono"
                  />
                  <input
                    type="text"
                    value={azProject}
                    onChange={(e) => setAzProject(e.target.value)}
                    placeholder="Project / Sprint"
                    style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                    className="px-3.5 py-2 rounded-xl border text-xs text-white outline-none focus:border-[#FF6B00] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#FFB947] block mb-1.5">
                  Azure DevOps Personal Access Token
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={azToken}
                    onChange={(e) => setAzToken(e.target.value)}
                    placeholder="Azure DevOps PAT"
                    style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                    className="w-full px-3.5 py-2 pl-9 rounded-xl border text-xs text-white outline-none focus:border-[#FF6B00] font-mono"
                  />
                  <Key size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "gitlab" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0D0D0D] border border-[#2B2B2B]">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🦊</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">GitLab Mode</h4>
                    <p className="text-[11px] text-[#FFB947]/70">
                      Syncing Merge Requests, Pipeline CI/CD, and Group Milestones
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#1E1E1E] p-1 rounded-xl border border-[#2B2B2B]">
                  <button
                    type="button"
                    onClick={() => setGlMode("simulation")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      glMode === "simulation" ? "bg-[#FF6B00] text-black" : "text-zinc-400"
                    }`}
                  >
                    Simulated
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlMode("live")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      glMode === "live" ? "bg-[#FF6B00] text-black" : "text-zinc-400"
                    }`}
                  >
                    Live API
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#FFB947] block mb-1.5">
                  Project Path / Identifier
                </label>
                <input
                  type="text"
                  value={glProject}
                  onChange={(e) => setGlProject(e.target.value)}
                  placeholder="e.g. group/forge-platform"
                  style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs text-white outline-none focus:border-[#FF6B00] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#FFB947] block mb-1.5">
                  GitLab Personal Access Token
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={glToken}
                    onChange={(e) => setGlToken(e.target.value)}
                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                    style={{ backgroundColor: "#0D0D0D", borderColor: "#2B2B2B" }}
                    className="w-full px-3.5 py-2 pl-9 rounded-xl border text-xs text-white outline-none focus:border-[#FF6B00] font-mono"
                  />
                  <Key size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderColor: "#2B2B2B" }} className="p-4 border-t flex items-center justify-between bg-[#0D0D0D]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => syncActivity()}
              disabled={isSyncing}
              style={{ backgroundColor: "#1E1E1E", borderColor: "#2B2B2B", color: "#FFB947" }}
              className="px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:text-[#FF6B00] disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? "Syncing..." : "Sync Activity"}</span>
            </button>
            {savedSuccess && (
              <span className="text-xs text-[#FF6B00] font-bold flex items-center gap-1">
                <Check size={13} />
                <span>Configuration Saved!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white cursor-pointer font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{ backgroundColor: "#FF6B00", color: "#0D0D0D" }}
              className="px-4 py-1.5 rounded-xl font-bold text-xs shadow-md hover:bg-[#FFB947] transition-all cursor-pointer"
            >
              Save &amp; Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
