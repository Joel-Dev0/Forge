import { useState, useRef, useEffect } from "react";
import {
  Briefcase,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  Pin,
} from "lucide-react";
import { useWorkspacesStore } from "../../core/workspaces/useWorkspacesStore";
import { useBlockNotesStore } from "../../core/notes/useBlockNotesStore";

export function WorkspaceSelector() {
  const [open, setOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#FF6B00");
  const [newDesc, setNewDesc] = useState("");

  const [activeTab, setActiveTab] = useState<"projects" | "env" | "notes">("projects");
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvVal, setNewEnvVal] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    workspaces,
    activeWorkspaceId,
    createWorkspace,
    switchWorkspace,
    deleteWorkspace,
    setEnvVar,
    deleteEnvVar,
    setNotes,
    getActiveWorkspace,
  } = useWorkspacesStore();

  const activeWs = getActiveWorkspace();

  const {
    memoryCards,
    togglePinMemoryCard,
    pinNewMemoryCard,
    setModalOpen: setBlockNotesModalOpen,
  } = useBlockNotesStore();

  const pinnedCardsCount = memoryCards.filter((c) => c.isPinnedToScreen).length;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id = createWorkspace(newName.trim(), newColor, newDesc.trim());
    switchWorkspace(id);
    setNewName("");
    setNewDesc("");
    setShowNewModal(false);
    setOpen(false);
  };

  const handleAddEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvKey.trim()) return;
    setEnvVar(activeWs.id, newEnvKey.trim().toUpperCase(), newEnvVal.trim());
    setNewEnvKey("");
    setNewEnvVal("");
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 h-5 rounded bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] border border-[var(--forge-border)] text-[10px] text-[var(--forge-text)] font-medium transition-colors cursor-pointer"
        title="Switch Project Workspace"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: activeWs.color || "#FF6B00" }}
        />
        <span className="font-semibold truncate max-w-[110px]">{activeWs.name}</span>
        <ChevronDown size={10} className="text-[var(--forge-text-muted)]" />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 mt-1 w-80 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col text-[11px] animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/40">
            <div className="flex items-center gap-1.5 font-bold text-[var(--forge-text)]">
              <Briefcase size={12} className="text-[#FF6B00]" />
              <span>Project Workspaces</span>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#FF6B00] hover:bg-[#e05e00] text-white font-bold text-[9px] cursor-pointer shadow-xs transition-colors"
            >
              <Plus size={10} />
              New
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center px-2 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/20">
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-2.5 py-1 text-[10px] font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "projects"
                  ? "border-[#FF6B00] text-[#FF6B00]"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              Projects ({workspaces.length})
            </button>
            <button
              onClick={() => setActiveTab("env")}
              className={`px-2.5 py-1 text-[10px] font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "env"
                  ? "border-[#FF6B00] text-[#FF6B00]"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              Env Vars ({Object.keys(activeWs.envVars || {}).length})
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-2.5 py-1 text-[10px] font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === "notes"
                  ? "border-[#FF6B00] text-[#FF6B00]"
                  : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              Notes
            </button>
          </div>

          {/* Tab 1: Projects List */}
          {activeTab === "projects" && (
            <div className="p-1.5 max-h-64 overflow-y-auto scrollbar-thin space-y-1">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeWorkspaceId;
                return (
                  <div
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all border ${
                      isActive
                        ? "bg-[#FF6B00]/10 border-[#FF6B00]/40 text-[#FF6B00]"
                        : "border-transparent hover:bg-[var(--forge-hover)] text-[var(--forge-text)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: ws.color }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[11px] truncate flex items-center gap-1.5">
                          <span>{ws.name}</span>
                          {isActive && <Check size={11} className="text-[#FF6B00]" />}
                        </div>
                        {ws.description && (
                          <div className="text-[9px] text-[var(--forge-text-muted)] truncate">
                            {ws.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--forge-input)] text-[var(--forge-text-muted)] font-mono">
                        {ws.tabs.length} tabs
                      </span>

                      {workspaces.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkspace(ws.id);
                          }}
                          title="Delete workspace"
                          className="p-1 text-[var(--forge-text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Environment Variables */}
          {activeTab === "env" && (
            <div className="p-2 flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin">
              <span className="text-[9px] text-[var(--forge-text-muted)]">
                Variables scoped to <strong className="text-[var(--forge-text)]">{activeWs.name}</strong>:
              </span>

              {/* List */}
              <div className="space-y-1 font-mono text-[10px]">
                {Object.entries(activeWs.envVars || {}).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-1.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)]">
                    <span className="text-[#FF6B00] font-bold">{key}:</span>
                    <span className="text-[var(--forge-text)] truncate max-w-[120px]">{val}</span>
                    <button
                      onClick={() => deleteEnvVar(activeWs.id, key)}
                      className="text-[var(--forge-text-muted)] hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                {Object.keys(activeWs.envVars || {}).length === 0 && (
                  <div className="text-[10px] text-[var(--forge-text-muted)] italic p-2 text-center">
                    No variables set for this project.
                  </div>
                )}
              </div>

              {/* Add form */}
              <form onSubmit={handleAddEnv} className="flex items-center gap-1 mt-1 font-mono text-[10px]">
                <input
                  type="text"
                  placeholder="KEY"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  className="w-24 bg-[var(--forge-input)] border border-[var(--forge-border)] px-1.5 py-1 rounded text-[var(--forge-text)] outline-none uppercase"
                />
                <input
                  type="text"
                  placeholder="value"
                  value={newEnvVal}
                  onChange={(e) => setNewEnvVal(e.target.value)}
                  className="flex-1 bg-[var(--forge-input)] border border-[var(--forge-border)] px-1.5 py-1 rounded text-[var(--forge-text)] outline-none"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-[#FF6B00] text-white rounded font-sans font-bold text-[9px] cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Project Notes & Pinned Memory Cards */}
          {activeTab === "notes" && (
            <div className="p-2.5 flex flex-col gap-2.5">
              {/* Scratchpad Section */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-bold text-[var(--forge-text-muted)] tracking-wider">
                    Scratchpad ({activeWs.name})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setBlockNotesModalOpen(true);
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#FF4D2D]/15 text-[#FF4D2D] hover:bg-[#FF4D2D] hover:text-white transition-all text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={10} />
                    <span>Open Mind Palace</span>
                  </button>
                </div>
                <textarea
                  value={activeWs.notes || ""}
                  onChange={(e) => setNotes(activeWs.id, e.target.value)}
                  placeholder="Write project links, credentials, or task notes..."
                  rows={3}
                  className="w-full bg-[var(--forge-input)] border border-[var(--forge-border)] p-2 rounded text-[10px] text-[var(--forge-text)] outline-none focus:border-[#FF6B00] resize-none font-mono"
                />
              </div>

              {/* Screen Memory Cards Section */}
              <div className="pt-2 border-t border-[var(--forge-border)] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Pin size={11} className="text-[#FF6B00] rotate-45" />
                    <span className="text-[9px] uppercase font-extrabold text-[var(--forge-text)] tracking-wider">
                      Screen Memory Cards
                    </span>
                    {pinnedCardsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#FF6B00]/20 text-[#FF6B00] text-[8px] font-mono font-bold">
                        {pinnedCardsCount} pinned
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      pinNewMemoryCard(`✨ Note: ${activeWs.name} task...`);
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#FF6B00] hover:bg-[#FF8533] text-black font-extrabold text-[9px] flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="Pin a new sticky memory card anywhere on screen"
                  >
                    <Plus size={10} strokeWidth={3} />
                    <span>Pin New</span>
                  </button>
                </div>

                {/* Quick list of memory cards with Pin/Unpin action */}
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                  {memoryCards.slice(0, 4).map((card) => {
                    const isPinned = card.isPinnedToScreen;
                    return (
                      <div
                        key={card.id}
                        style={{ borderLeftColor: card.color }}
                        className="flex items-center justify-between p-1.5 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] border-l-4 text-[10px] gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-[var(--forge-text)] block truncate">
                            {card.title || card.content.slice(0, 24)}
                          </span>
                          <span className="text-[8px] text-[var(--forge-text-muted)] truncate block">
                            {card.content.slice(0, 36)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePinMemoryCard(card.id)}
                          className={`px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            isPinned
                              ? "bg-[#FF6B00] text-black shadow-xs font-extrabold"
                              : "bg-[var(--forge-surface)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] border border-[var(--forge-border)]"
                          }`}
                          title={isPinned ? "Unpin from screen" : "Pin to screen"}
                        >
                          <Pin size={9} className={isPinned ? "rotate-45" : ""} />
                          <span>{isPinned ? "Pinned" : "Pin"}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreate}
            className="w-80 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-lg shadow-xl p-4 flex flex-col gap-3 text-[11px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--forge-text)] flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#FF6B00]" />
                Create New Project Workspace
              </span>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)]">Name *</label>
              <input
                type="text"
                placeholder="e.g. E-Commerce App"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                className="bg-[var(--forge-input)] border border-[var(--forge-border)] px-2.5 py-1.5 rounded text-[11px] text-[var(--forge-text)] outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)]">Description</label>
              <input
                type="text"
                placeholder="Frontend development & API testing"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bg-[var(--forge-input)] border border-[var(--forge-border)] px-2.5 py-1.5 rounded text-[11px] text-[var(--forge-text)] outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)]">Theme Color</label>
              <div className="flex items-center gap-2">
                {["#FF6B00", "#0EA5E9", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                      newColor === c ? "scale-125 ring-2 ring-white shadow-xs" : "opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1 rounded bg-[var(--forge-input)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold cursor-pointer shadow-xs"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}