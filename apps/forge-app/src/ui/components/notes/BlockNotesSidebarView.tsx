import { useState } from "react";
import {
  Plus,
  Maximize2,
  CheckCircle2,
  Trash2,
  Sparkles,
  Layers,
  StickyNote,
  ListTodo,
  Play,
  Pause,
  ChevronRight,
  Pin,
} from "lucide-react";
import { useBlockNotesStore } from "../../../core/notes/useBlockNotesStore";
import type { NoteColor } from "../../../core/notes/notesTypes";

interface Props {
  onOpenFullModal: () => void;
}

export function BlockNotesSidebarView({ onOpenFullModal }: Props) {
  const {
    notes,
    checklists,
    memoryCards,
    voiceMemos,
    toggleChecklistItem,
    addChecklistItem,
    addMemoryCard,
    deleteMemoryCard,
    togglePinMemoryCard,
    togglePlayVoiceMemo,
  } = useBlockNotesStore();

  const [activeSection, setActiveSection] = useState<"all" | "cards" | "checklist">("all");
  const [quickText, setQuickText] = useState("");
  const [quickColor, setQuickColor] = useState<NoteColor>("#FFE29A");

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;

    if (activeSection === "checklist") {
      addChecklistItem({
        title: quickText.trim(),
        checked: false,
        category: "Quick Tasks",
        color: "#FFE29A",
      });
    } else {
      addMemoryCard({
        title: quickText.slice(0, 20),
        content: quickText.trim(),
        color: quickColor,
        category: "Notes",
        collaborators: ["You"],
      });
    }
    setQuickText("");
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-[var(--forge-surface)] text-[var(--forge-text)]">
      {/* Top Header */}
      <div className="p-3 border-b border-[var(--forge-border)] flex items-center justify-between bg-[var(--forge-surface-elevated)]/50">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#FF4D2D]" />
          <span className="text-xs font-extrabold tracking-tight">Block Notes &amp; Mind</span>
        </div>
        <button
          type="button"
          onClick={onOpenFullModal}
          className="p-1.5 rounded-lg bg-[var(--forge-input)] hover:bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
          title="Expand to Full Mind Palace Workspace"
        >
          <Maximize2 size={11} />
          <span>Expand</span>
        </button>
      </div>

      {/* Section Switcher */}
      <div className="flex items-center px-3 py-2 gap-1 border-b border-[var(--forge-border)] text-[10px] font-semibold">
        <button
          type="button"
          onClick={() => setActiveSection("all")}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activeSection === "all"
              ? "bg-[#FF4D2D] text-white font-bold"
              : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("cards")}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activeSection === "cards"
              ? "bg-[#FF4D2D] text-white font-bold"
              : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
          }`}
        >
          Memory Cards ({memoryCards.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("checklist")}
          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
            activeSection === "checklist"
              ? "bg-[#FF4D2D] text-white font-bold"
              : "text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
          }`}
        >
          Checklist ({checklists.length})
        </button>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Mind Palace Document Teaser */}
        {(activeSection === "all" || activeSection === "cards") && notes[0] && (
          <div
            onClick={onOpenFullModal}
            className="p-3.5 rounded-2xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] hover:border-[#FF4D2D]/50 transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">{notes[0].icon}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                {notes[0].progressPercent}% Flow
              </span>
            </div>
            <h4 className="text-xs font-bold text-[var(--forge-text)] group-hover:text-[#FF4D2D] transition-colors leading-snug">
              {notes[0].title}
            </h4>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-[var(--forge-border)] text-[9px] text-[var(--forge-text-muted)]">
              <span>{notes[0].childrenCards.length} Children • {notes[0].associationCards.length} Assocs</span>
              <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        )}

        {/* Memory Cards Section */}
        {(activeSection === "all" || activeSection === "cards") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)]">
              <span>Memory Cards</span>
              <StickyNote size={11} />
            </div>

            <div className="grid grid-cols-1 gap-2">
              {memoryCards.map((card) => (
                <div
                  key={card.id}
                  style={{ backgroundColor: card.color }}
                  className="rounded-2xl p-3 text-zinc-900 shadow-sm border border-black/10 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/10">
                      {card.category}
                    </span>
                    <span className="text-[9px] text-zinc-700">{card.createdAtText}</span>
                  </div>
                  <p className="text-xs font-bold leading-relaxed">{card.content}</p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/10 text-[9px]">
                    <span className="text-zinc-700">👤 {card.collaborators[0] || "You"}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => togglePinMemoryCard(card.id)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
                          card.isPinnedToScreen
                            ? "bg-black text-[#FF6B00] ring-1 ring-[#FF6B00]"
                            : "bg-black/10 hover:bg-black/20 text-zinc-800"
                        }`}
                        title={card.isPinnedToScreen ? "Unpin from screen" : "Pin to screen"}
                      >
                        <Pin size={8} className={card.isPinnedToScreen ? "rotate-45 text-[#FF6B00]" : ""} />
                        <span>{card.isPinnedToScreen ? "Pinned" : "Pin"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMemoryCard(card.id)}
                        className="text-zinc-600 hover:text-red-600 cursor-pointer"
                        title="Delete card"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklists Section */}
        {(activeSection === "all" || activeSection === "checklist") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)]">
              <span>Interactive Checklist</span>
              <ListTodo size={11} />
            </div>

            <div className="space-y-1.5">
              {checklists.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    item.checked
                      ? "bg-[var(--forge-surface)] border-[var(--forge-border)] opacity-60 line-through"
                      : "bg-[var(--forge-surface-elevated)] border-[var(--forge-border)] hover:border-[#FF4D2D]/30"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        item.checked
                          ? "bg-emerald-500 text-white"
                          : "border border-[var(--forge-text-muted)]"
                      }`}
                    >
                      {item.checked && <CheckCircle2 size={12} fill="currentColor" />}
                    </button>
                    <span className="text-xs truncate">{item.title}</span>
                  </div>
                  {item.quantityBadge && (
                    <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-white text-[9px] font-bold">
                      {item.quantityBadge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voice Note Audio Memos (Image 3) */}
        {activeSection === "all" && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--forge-text-muted)] block">
              Audio Memos
            </span>
            {voiceMemos.map((memo) => (
              <div
                key={memo.id}
                className="p-2.5 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex items-center gap-2.5"
              >
                <span className="text-base">{memo.authorAvatar}</span>
                <button
                  type="button"
                  onClick={() => togglePlayVoiceMemo(memo.id)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer ${
                    memo.isPlaying ? "bg-[#FF4D2D] text-white animate-pulse" : "bg-zinc-700 text-white"
                  }`}
                >
                  {memo.isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
                </button>
                <div className="flex-1 flex items-center gap-0.5 h-4">
                  {memo.audioWaveform.slice(0, 16).map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h * 0.35}px` }}
                      className={`w-0.5 rounded-full ${memo.isPlaying ? "bg-[#FF4D2D]" : "bg-zinc-600"}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {String(Math.floor(memo.durationSeconds / 60)).padStart(2, "0")}:
                  {String(memo.durationSeconds % 60).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Quick-Add Bar */}
      <form onSubmit={handleQuickAdd} className="p-2.5 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)] space-y-2">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder={activeSection === "checklist" ? "Add checklist item..." : "Quick memory note..."}
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-[var(--forge-input)] border border-[var(--forge-border)] outline-none text-[var(--forge-text)] placeholder-[var(--forge-text-muted)]"
          />
          <button
            type="submit"
            disabled={!quickText.trim()}
            className="w-7 h-7 rounded-lg bg-[#FF4D2D] hover:bg-[#FF6B00] text-white flex items-center justify-center disabled:opacity-40 cursor-pointer shadow-xs"
          >
            <Plus size={14} />
          </button>
        </div>

        {activeSection !== "checklist" && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[var(--forge-text-muted)]">Color:</span>
            <div className="flex items-center gap-1">
              {(["#FFE29A", "#FFB3BA", "#BAFFC7", "#BAE1FF", "#D1BAFF"] as NoteColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setQuickColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-3.5 h-3.5 rounded-full border ${
                    quickColor === c ? "border-black scale-110" : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
