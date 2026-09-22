import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  RefreshCw,
  Layers,
  Shield,
  Briefcase,
  User,
  Landmark,
  Code,
  Globe,
  Check,
  HardDrive,
  ExternalLink,
} from "lucide-react";
import { useSessionsStore } from "../../core/sessions/useSessionsStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";

const PRESET_COLORS = [
  "#FF6B00", // Forge Orange
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#EC4899", // Pink
];

const PRESET_ICONS = [
  { id: "Globe", label: "Globe" },
  { id: "User", label: "User" },
  { id: "Briefcase", label: "Work" },
  { id: "ShieldAlert", label: "Admin" },
  { id: "Landmark", label: "Finance" },
  { id: "Code", label: "Dev" },
];

function renderSessionIcon(iconName: string, size = 15, className = "") {
  switch (iconName) {
    case "User":
      return <User size={size} className={className} />;
    case "Briefcase":
      return <Briefcase size={size} className={className} />;
    case "ShieldAlert":
    case "Shield":
      return <Shield size={size} className={className} />;
    case "Landmark":
      return <Landmark size={size} className={className} />;
    case "Code":
      return <Code size={size} className={className} />;
    case "Globe":
    default:
      return <Globe size={size} className={className} />;
  }
}

export function SessionModal() {
  const {
    sessions,
    isSessionModalOpen,
    setSessionModalOpen,
    createSession,
    deleteSession,
    clearSessionData,
  } = useSessionsStore();

  const openTab = useTabsStore((s) => s.openTab);

  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionColor, setNewSessionColor] = useState(PRESET_COLORS[0]);
  const [newSessionIcon, setNewSessionIcon] = useState("Globe");
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [clearedMessage, setClearedMessage] = useState<string | null>(null);

  if (!isSessionModalOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSessionName.trim();
    if (!trimmed) return;
    createSession(trimmed, newSessionColor, newSessionIcon);
    setNewSessionName("");
    setIsCreating(false);
  };

  const handleClear = async (sessionId: string) => {
    setClearingId(sessionId);
    try {
      await clearSessionData(sessionId);
      setClearedMessage(sessionId);
      setTimeout(() => setClearedMessage(null), 2000);
    } finally {
      setClearingId(null);
    }
  };

  const handleOpenTabInSession = (sessionId: string) => {
    openTab("about:blank", sessionId);
    setSessionModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[var(--forge-text)] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Session Containers
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF6B00]/15 text-[#FF6B00]">
                  Hardware Isolation
                </span>
              </h2>
              <p className="text-xs text-[var(--forge-text-muted)]">
                Completely isolated browsing partitions for cookies, localStorage, indexedDB, and cache.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSessionModalOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--forge-text-muted)] uppercase tracking-wider">
              Configured Containers ({sessions.length})
            </span>
            {!isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>New Container</span>
              </button>
            )}
          </div>

          {/* New Container Creator Form */}
          {isCreating && (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-xl bg-[var(--forge-surface-elevated)] border border-[#FF6B00]/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FF6B00]">Create New Isolated Container</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-[var(--forge-text-muted)] hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[var(--forge-text-muted)] block mb-1">
                  Container Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client Portal, Banking, Side Project..."
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  autoFocus
                  className="w-full h-8 px-3 rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] text-xs text-white placeholder-[var(--forge-text-muted)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-[11px] font-medium text-[var(--forge-text-muted)] block mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewSessionColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        newSessionColor === c ? "ring-2 ring-white scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="text-[11px] font-medium text-[var(--forge-text-muted)] block mb-1">
                  Container Icon
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_ICONS.map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      onClick={() => setNewSessionIcon(ic.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-all cursor-pointer ${
                        newSessionIcon === ic.id
                          ? "bg-[var(--forge-hover)] border-[#FF6B00] text-[#FF6B00]"
                          : "bg-[var(--forge-input)] border-[var(--forge-border)] text-[var(--forge-text-muted)] hover:text-white"
                      }`}
                    >
                      {renderSessionIcon(ic.id, 12)}
                      <span>{ic.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--forge-text-muted)] hover:text-white hover:bg-[var(--forge-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSessionName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Create Container
                </button>
              </div>
            </form>
          )}

          {/* Containers List */}
          <div className="space-y-2">
            {sessions.map((sess) => {
              const isDefault = sess.id === "default";
              const isClearing = clearingId === sess.id;
              const hasCleared = clearedMessage === sess.id;

              return (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] hover:border-[var(--forge-border-focus)] transition-all flex items-center justify-between gap-4 group"
                >
                  {/* Left: Icon, Name, Partition details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{
                        backgroundColor: `${sess.color}20`,
                        color: sess.color,
                        border: `1px solid ${sess.color}40`,
                      }}
                    >
                      {renderSessionIcon(sess.icon, 16)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate text-white">{sess.name}</span>
                        {isDefault && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                            Primary
                          </span>
                        )}
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: sess.color }}
                          title={`Color: ${sess.color}`}
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--forge-text-muted)] font-mono mt-0.5">
                        <span className="truncate">{sess.partition}</span>
                        <span>•</span>
                        <span>Created {new Date(sess.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Open new tab in this container */}
                    <button
                      type="button"
                      onClick={() => handleOpenTabInSession(sess.id)}
                      title={`Open new tab in ${sess.name}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-xs font-medium text-white transition-colors cursor-pointer"
                    >
                      <ExternalLink size={12} className="text-[#FF6B00]" />
                      <span>Open Tab</span>
                    </button>

                    {/* Clear Storage Data */}
                    <button
                      type="button"
                      disabled={isClearing}
                      onClick={() => handleClear(sess.id)}
                      title="Clear cookies, cache and storage for this container"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-xs font-medium text-[var(--forge-text-muted)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {hasCleared ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Cleared</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} className={isClearing ? "animate-spin" : ""} />
                          <span>Clear Data</span>
                        </>
                      )}
                    </button>

                    {/* Delete Session (disabled for default) */}
                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete container "${sess.name}" and remove its isolated partition?`)) {
                            deleteSession(sess.id);
                          }
                        }}
                        title="Delete container"
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-[var(--forge-text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] flex items-center justify-between text-xs text-[var(--forge-text-muted)]">
          <div className="flex items-center gap-2">
            <HardDrive size={13} className="text-[#FF6B00]" />
            <span>Partitions are permanently saved in Chromium User Data and isolated at process level.</span>
          </div>
          <button
            type="button"
            onClick={() => setSessionModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-white text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
