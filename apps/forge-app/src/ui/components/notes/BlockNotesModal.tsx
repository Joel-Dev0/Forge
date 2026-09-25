import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Phone,
  Search,
  Sparkles,
  Link as LinkIcon,
  Settings,
  MoreHorizontal,
  ChevronDown,
  Mic,
  Zap,
  Tag,
  Share2,
  Heart,
  Grid,
  ListTodo,
  StickyNote,
  Compass,
  Layers,
  FileText,
  Volume2,
  Pin,
} from "lucide-react";
import { useBlockNotesStore } from "../../../core/notes/useBlockNotesStore";
import type { NoteColor, BlockCard } from "../../../core/notes/notesTypes";

const PASTEL_COLORS: { hex: NoteColor; label: string }[] = [
  { hex: "#FFE29A", label: "Yellow" },
  { hex: "#FFB3BA", label: "Pink" },
  { hex: "#BAFFC7", label: "Green" },
  { hex: "#BAE1FF", label: "Blue" },
  { hex: "#D1BAFF", label: "Lavender" },
  { hex: "#FFBAF1", label: "Magenta" },
];

const CATEGORIES = ["Groceries", "Party Supplies", "Household Items", "Ideas", "Dev Sprint"];
const COLLABORATORS = ["Ethan Caldwell", "Liam Foster", "Sophia Chen", "Lucía Fernández", "Alex Rivers"];

export function BlockNotesModal() {
  const {
    isModalOpen,
    activeView,
    workspaceName,
    searchQuery,
    activeTagFilter,
    notes,
    activeNoteId,
    checklists,
    memoryCards,
    voiceMemos,
    setModalOpen,
    setActiveView,
    setSearchQuery,
    setActiveTagFilter,
    setActiveNoteId,
    updateActiveNote,
    addChildCard,
    addAssociationCard,
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
    addMemoryCard,
    deleteMemoryCard,
    togglePinMemoryCard,
    togglePlayVoiceMemo,
  } = useBlockNotesStore();

  // Local state for new memory card creation (Image 2)
  const [newCardText, setNewCardText] = useState("");
  const [newCardColor, setNewCardColor] = useState<NoteColor>("#FFE29A");
  const [newCardCategory, setNewCardCategory] = useState("Groceries");
  const [newCardCollaborators, setNewCardCollaborators] = useState<string[]>(["Lucía Fernández"]);
  const [pinOnCreate, setPinOnCreate] = useState(false);

  // Local state for new checklist item (Image 3)
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistSubtitle, setNewChecklistSubtitle] = useState("");
  const [newChecklistQty, setNewChecklistQty] = useState("");
  const [newChecklistCategory, setNewChecklistCategory] = useState("Groceries");
  const [showAddChecklistForm, setShowAddChecklistForm] = useState(false);

  // Local state for adding children / associations (Image 1)
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState("");
  const [isAddingAssoc, setIsAddingAssoc] = useState(false);
  const [newAssocTitle, setNewAssocTitle] = useState("");

  if (!isModalOpen) return null;

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const handleCreateMemoryCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardText.trim()) return;
    addMemoryCard({
      title: newCardText.slice(0, 24) || "New Memory Card",
      content: newCardText.trim(),
      color: newCardColor,
      category: newCardCategory,
      collaborators: newCardCollaborators,
      authorName: "Alex Rivers",
      hasHeartDoodle: newCardColor === "#FFE29A",
      actionType: "view",
      isPinnedToScreen: pinOnCreate,
      pinnedPosition: pinOnCreate ? { x: 120, y: 150 } : undefined,
    });
    setNewCardText("");
  };

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    addChecklistItem({
      title: newChecklistTitle.trim(),
      subtitle: newChecklistSubtitle.trim() || undefined,
      quantityBadge: newChecklistQty.trim() || undefined,
      checked: false,
      category: newChecklistCategory,
      color: "#FFE29A",
    });
    setNewChecklistTitle("");
    setNewChecklistSubtitle("");
    setNewChecklistQty("");
    setShowAddChecklistForm(false);
  };

  const handleCreateChildCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildTitle.trim()) return;
    addChildCard(activeNote.id, {
      title: newChildTitle.trim(),
      description: "Custom linked thought node.",
      tags: ["#mind", "#custom"],
      type: "child",
      collaborators: ["Alex"],
      icon: "📄",
    });
    setNewChildTitle("");
    setIsAddingChild(false);
  };

  const handleCreateAssocCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssocTitle.trim()) return;
    addAssociationCard(activeNote.id, {
      title: newAssocTitle.trim(),
      description: "Lateral associative connection.",
      tags: ["#mind", "#assoc"],
      type: "association",
      collaborators: ["Alex"],
      icon: "🔗",
      isDotted: true,
    });
    setNewAssocTitle("");
    setIsAddingAssoc(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-6xl h-[92vh] bg-[#FFFFFF] dark:bg-[#121316] text-zinc-900 dark:text-zinc-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200 dark:border-white/10 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP WORKSPACE TOOLBAR (Image 1 Reference) */}
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between bg-zinc-50 dark:bg-[#16171B] shrink-0">
          <div className="flex items-center gap-3">
            {/* Workspace selector dropdown */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#202227] border border-zinc-200 dark:border-white/10 shadow-xs cursor-pointer hover:border-zinc-300">
              <span className="text-base">💼</span>
              <span className="text-xs font-extrabold tracking-tight">{workspaceName}</span>
              <ChevronDown size={13} className="text-zinc-400" />
            </div>

            {/* View Switchers: Mind Palace (Img 1), Memory Cards (Img 2), Checklists (Img 3) */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-200/70 dark:bg-black/30 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveView("mind-palace")}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeView === "mind-palace"
                    ? "bg-white dark:bg-[#202227] text-zinc-900 dark:text-white shadow-xs font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <Layers size={13} />
                <span>Mind Palace (Blocks)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("memory-cards")}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeView === "memory-cards"
                    ? "bg-white dark:bg-[#202227] text-zinc-900 dark:text-white shadow-xs font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <StickyNote size={13} className="text-amber-500" />
                <span>Memory Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("checklists")}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  activeView === "checklists"
                    ? "bg-white dark:bg-[#202227] text-zinc-900 dark:text-white shadow-xs font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <ListTodo size={13} className="text-emerald-500" />
                <span>Checklists & Voice Memos</span>
              </button>
            </div>
          </div>

          {/* Right Action Icons (Image 1 layout) */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative hidden md:block">
              <Search size={13} className="absolute left-2.5 top-2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search blocks, tags, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs rounded-xl bg-white dark:bg-[#202227] border border-zinc-200 dark:border-white/10 outline-none w-44 focus:w-56 transition-all"
              />
            </div>

            {/* Collaborator Avatar Stack (Image 1) */}
            <div className="flex items-center -space-x-1.5">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-[10px] font-bold text-black flex items-center justify-center border-2 border-white dark:border-[#16171B]">
                AL
              </span>
              <span className="w-6 h-6 rounded-full bg-pink-400 text-[10px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-[#16171B]">
                LF
              </span>
              <span className="w-6 h-6 rounded-full bg-blue-400 text-[10px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-[#16171B]">
                EC
              </span>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-8 h-8 rounded-xl bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer ml-1"
              title="Close Mind Palace"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* BODY CONTENT BY VIEW */}
        <div className="flex-1 overflow-hidden flex">
          {/* ============================================================== */}
          {/* VIEW 1: DIGITAL MIND PALACE & BLOCK CARDS (IMAGE 1 REFERENCE)   */}
          {/* ============================================================== */}
          {activeView === "mind-palace" && (
            <div className="flex-1 flex overflow-hidden">
              {/* LEFT COLUMN: OUTLINER, CHILDRENS & ASSOCIATIONS */}
              <div className="w-64 border-r border-zinc-200 dark:border-white/10 p-3.5 overflow-y-auto space-y-4 bg-zinc-50/50 dark:bg-[#141519] shrink-0 hidden md:block">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">
                  <span>Outliner</span>
                  <Compass size={13} />
                </div>

                {/* Childrens (>) Section */}
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                      Childrens (&gt;)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {activeNote.childrenCards.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeNote.childrenCards.map((card) => (
                      <div
                        key={card.id}
                        className="p-3 rounded-2xl bg-white dark:bg-[#1D1F24] border border-zinc-200 dark:border-white/5 shadow-xs hover:border-[#FF6B00]/40 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>{card.icon || "📦"}</span>
                            <span className="truncate">{card.title}</span>
                          </div>
                          <MoreHorizontal size={13} className="text-zinc-400" />
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100 dark:border-white/5">
                          <div className="flex items-center gap-1">
                            {card.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                          <span className="text-[10px]">👥</span>
                        </div>
                      </div>
                    ))}

                    {/* Add Children Note Button / Form */}
                    {isAddingChild ? (
                      <form onSubmit={handleCreateChildCard} className="p-2.5 rounded-xl bg-white dark:bg-[#1D1F24] border border-zinc-300 dark:border-white/20 space-y-2">
                        <input
                          type="text"
                          placeholder="Child note title..."
                          value={newChildTitle}
                          onChange={(e) => setNewChildTitle(e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-black outline-none border border-zinc-200 dark:border-white/10"
                          autoFocus
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsAddingChild(false)}
                            className="px-2 py-0.5 text-[10px] text-zinc-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-2 py-0.5 text-[10px] bg-[#FF4D2D] text-white rounded font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingChild(true)}
                        className="w-full py-2 px-3 rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center gap-1.5 text-xs font-medium hover:border-zinc-400 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add children note</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Associations (&) Section (Dotted Cards from Image 1) */}
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                      Associations (&amp;)
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {activeNote.associationCards.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeNote.associationCards.map((card) => (
                      <div
                        key={card.id}
                        className="p-3 rounded-2xl bg-white dark:bg-[#1D1F24] border-2 border-dashed border-zinc-300 dark:border-white/20 shadow-xs hover:border-[#FF4D2D] transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <span>{card.icon || "🔗"}</span>
                            <span className="truncate">{card.title}</span>
                          </div>
                          <MoreHorizontal size={13} className="text-zinc-400" />
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                          {card.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Add Association Note Button */}
                    {isAddingAssoc ? (
                      <form onSubmit={handleCreateAssocCard} className="p-2.5 rounded-xl bg-white dark:bg-[#1D1F24] border border-zinc-300 dark:border-white/20 space-y-2">
                        <input
                          type="text"
                          placeholder="Associated note title..."
                          value={newAssocTitle}
                          onChange={(e) => setNewAssocTitle(e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-black outline-none border border-zinc-200 dark:border-white/10"
                          autoFocus
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsAddingAssoc(false)}
                            className="px-2 py-0.5 text-[10px] text-zinc-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-2 py-0.5 text-[10px] bg-[#FF4D2D] text-white rounded font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingAssoc(true)}
                        className="w-full py-2 px-3 rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center justify-center gap-1.5 text-xs font-medium hover:border-zinc-400 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add associated note</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CENTER COLUMN: MAIN MIND PALACE DOCUMENT (Image 1) */}
              <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
                {/* Header with Brain Emoji & Meta Chips */}
                <div>
                  <span className="text-3xl block mb-2">{activeNote.icon || "🧠"}</span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-snug">
                    {activeNote.title}
                  </h1>

                  {/* Meta Bar: 66%, 41 Like, 3 Cores, Mic, Lightning (Image 1) */}
                  <div className="flex items-center gap-2.5 mt-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[10px]">
                      {activeNote.progressPercent}%
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveNote({ likesCount: activeNote.likesCount + 1 })
                      }
                      className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-500/25 transition-colors text-[10px]"
                    >
                      <Heart size={10} fill="currentColor" />
                      <span>{activeNote.likesCount} Like</span>
                    </button>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-medium">
                      {activeNote.relatedCores} Cores related
                    </span>
                    <button
                      type="button"
                      className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                    >
                      <Mic size={11} />
                    </button>
                    <button
                      type="button"
                      className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-amber-500 hover:text-amber-400 cursor-pointer"
                    >
                      <Zap size={11} />
                    </button>
                  </div>
                </div>

                {/* Paragraphs with Inline #tags & Drag handles (Image 1) */}
                <div className="space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {activeNote.contentParagraphs.map((para, idx) => (
                    <div key={idx} className="group relative flex items-start gap-2">
                      <span className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity select-none cursor-grab text-xs mt-1">
                        ⠿
                      </span>
                      <p className="flex-1">
                        {para.split(/(#\w+)/g).map((word, i) =>
                          word.startsWith("#") ? (
                            <span
                              key={i}
                              className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded"
                            >
                              {word}
                            </span>
                          ) : (
                            word
                          )
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Embedded Block Card in Content (Image 1: 'Defines how to practice it' -> Mind Journey Map) */}
                {activeNote.embeddedCard && (
                  <div className="space-y-1.5 pl-6 border-l-2 border-zinc-200 dark:border-white/10">
                    <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                      <span>—o-</span>
                      <span>{activeNote.embeddedCard.relationLabel}</span>
                    </span>
                    <div className="max-w-md p-3 rounded-2xl bg-white dark:bg-[#1A1B20] border-2 border-dashed border-zinc-300 dark:border-white/20 shadow-xs flex items-center justify-between cursor-pointer hover:border-[#FF4D2D] transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{activeNote.embeddedCard.card.icon || "🗺️"}</span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          {activeNote.embeddedCard.card.title}
                        </span>
                      </div>
                      <MoreHorizontal size={13} className="text-zinc-400" />
                    </div>
                  </div>
                )}

                <div className="text-center text-zinc-400 tracking-widest text-xs select-none">
                  ***
                </div>

                {/* Callout Card (Image 1: 'What tools can I use to create Mind Palace?') */}
                {activeNote.calloutCard && (
                  <div className="space-y-2">
                    <h3 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                      <span className="text-lg">🧑‍🎨</span>
                      <span>{activeNote.calloutCard.title}</span>
                    </h3>
                    <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-[#161D2B] border border-blue-200/60 dark:border-blue-500/20 text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 space-y-1 shadow-xs">
                      <p>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {activeNote.calloutCard.icon} MakeSense
                        </span>{" "}
                        — {activeNote.calloutCard.text.replace(/^MakeSense — /, "")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: REFERENCE NOTES PANEL (Image 1) */}
              <div className="w-64 border-l border-zinc-200 dark:border-white/10 p-3.5 overflow-y-auto space-y-3.5 bg-zinc-50/50 dark:bg-[#141519] shrink-0 hidden lg:block">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">
                  <span>Notes</span>
                  <Tag size={13} />
                </div>

                {/* Filter Chips: Similar, #Mind, @Notion, @Tools (Image 1) */}
                <div className="flex flex-wrap gap-1.5">
                  {["Similar", "#Mind", "@Notion", "@Tools"].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setActiveTagFilter(activeTagFilter === chip ? null : chip)
                      }
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        activeTagFilter === chip
                          ? "bg-[#FF4D2D] text-white shadow-xs"
                          : "bg-white dark:bg-[#202227] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/5 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-zinc-400 px-1 italic">
                  Drag'n'drop Notes to Editor to create Link
                </p>

                {/* Reference Cards List */}
                <div className="space-y-2">
                  {activeNote.referenceCards.map((card) => (
                    <div
                      key={card.id}
                      className={`p-3 rounded-2xl bg-white dark:bg-[#1D1F24] border transition-all cursor-pointer shadow-xs ${
                        card.isDotted
                          ? "border-2 border-dashed border-zinc-300 dark:border-white/20 hover:border-[#FF4D2D]"
                          : "border-zinc-200 dark:border-white/5 hover:border-zinc-400 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{card.icon || "📄"}</span>
                          <span className="truncate">{card.title}</span>
                        </div>
                        <MoreHorizontal size={13} className="text-zinc-400" />
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {card.description}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100 dark:border-white/5">
                        <div className="flex items-center gap-1">
                          {card.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[9px] font-mono px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px]">👥</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 2: MEMORY CARDS & COLOR PICKER (IMAGE 2 REFERENCE)        */}
          {/* ============================================================== */}
          {activeView === "memory-cards" && (
            <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-8 bg-[#F6F7FA] dark:bg-[#0E0F12]">
              {/* Creator Card Deck (Matching Image 2) */}
              <div className="max-w-xl mx-auto space-y-6">
                {/* Large Rounded Pastel Memory Card Preview */}
                <div
                  style={{ backgroundColor: newCardColor }}
                  className="w-full min-h-[220px] rounded-3xl p-6 shadow-2xl border-4 border-white dark:border-[#222] text-zinc-900 flex flex-col justify-between transition-colors relative"
                >
                  <textarea
                    rows={4}
                    value={newCardText}
                    onChange={(e) => setNewCardText(e.target.value)}
                    placeholder="+ Add text to this note..."
                    className="w-full bg-transparent border-none outline-none font-bold text-lg sm:text-xl placeholder-zinc-700/60 resize-none leading-relaxed text-zinc-900"
                  />

                  <div className="flex items-center justify-between pt-4 border-t border-black/10 flex-wrap gap-2">
                    <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-black/10 text-zinc-800">
                      {newCardCategory}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPinOnCreate((v) => !v)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                          pinOnCreate
                            ? "bg-[#FF6B00] text-black shadow-md font-extrabold"
                            : "bg-black/10 text-zinc-800 hover:bg-black/20"
                        }`}
                        title="Pin this card directly onto your screen when saved"
                      >
                        <Pin size={11} className={pinOnCreate ? "rotate-45" : ""} />
                        <span>{pinOnCreate ? "📌 Pin to Screen: ON" : "Pin to Screen"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateMemoryCard}
                        disabled={!newCardText.trim()}
                        className="px-4 py-1.5 rounded-xl bg-black text-white font-bold text-xs shadow-md hover:bg-zinc-800 disabled:opacity-40 cursor-pointer transition-all"
                      >
                        Save Memory Card
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Control Drawer (Matching Image 2) */}
                <div className="p-6 rounded-3xl bg-white dark:bg-[#16171B] border border-zinc-200 dark:border-white/10 shadow-lg space-y-5">
                  {/* Note Color Swatches (Image 2) */}
                  <div>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                      Note color
                    </span>
                    <div className="flex items-center gap-2.5">
                      {PASTEL_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setNewCardColor(c.hex)}
                          style={{ backgroundColor: c.hex }}
                          className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer hover:scale-110 shadow-xs ${
                            newCardColor === c.hex
                              ? "border-black dark:border-white ring-2 ring-black/20 scale-110"
                              : "border-transparent"
                          }`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Category Pills (Image 2) */}
                  <div>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                      Category
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCardCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            newCardCategory === cat
                              ? "bg-black dark:bg-white text-white dark:text-black font-bold shadow-xs"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Collaboration Pills (Image 2) */}
                  <div>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                      Collaboration
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {COLLABORATORS.map((member) => {
                        const isSelected = newCardCollaborators.includes(member);
                        return (
                          <button
                            key={member}
                            type="button"
                            onClick={() => {
                              setNewCardCollaborators((prev) =>
                                isSelected ? prev.filter((m) => m !== member) : [...prev, member]
                              );
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                          >
                            <span>👤</span>
                            <span>{member}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid of Saved Memory Cards */}
              <div className="space-y-3 max-w-5xl mx-auto pt-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500">
                  Saved Memory Cards ({memoryCards.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {memoryCards.map((card) => (
                    <div
                      key={card.id}
                      style={{ backgroundColor: card.color }}
                      className="rounded-3xl p-5 border-4 border-white dark:border-[#222] shadow-xl text-zinc-900 flex flex-col justify-between min-h-[170px] relative group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/10">
                            {card.category}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-700">
                            {card.createdAtText}
                          </span>
                        </div>
                        <p className="font-bold text-sm leading-relaxed text-zinc-900">
                          {card.content}
                        </p>
                        {card.hasHeartDoodle && (
                          <div className="mt-2 text-rose-600 font-bold text-lg select-none">
                            🏹 ❤️
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/10">
                        <div className="flex items-center gap-1 text-[11px] font-medium text-zinc-700">
                          <span>👤</span>
                          <span>{card.collaborators[0] || "Alex"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => togglePinMemoryCard(card.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                              card.isPinnedToScreen
                                ? "bg-black text-[#FF6B00] shadow-sm ring-1 ring-[#FF6B00]"
                                : "bg-black/10 hover:bg-black/20 text-zinc-800"
                            }`}
                            title={card.isPinnedToScreen ? "Unpin from screen" : "Pin card to screen"}
                          >
                            <Pin size={10} className={card.isPinnedToScreen ? "rotate-45 text-[#FF6B00]" : ""} />
                            <span>{card.isPinnedToScreen ? "Pinned" : "Pin"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMemoryCard(card.id)}
                            className="w-6 h-6 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center text-zinc-700 hover:text-red-600 transition-colors"
                            title="Delete card"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 3: CHECKLIST & VOICE AUDIO MEMOS (IMAGE 3 REFERENCE)       */}
          {/* ============================================================== */}
          {activeView === "checklists" && (
            <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-[#F8F9FB] dark:bg-[#0E0F12]">
              {/* Header Meta: 14 pieces | 2 days ago + Add Button */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-4">
                <div>
                  <span className="text-xs font-mono text-zinc-400">
                    {checklists.length} pieces | Active Checklist
                  </span>
                  <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white mt-0.5">
                    Visual Checklists & Audio Memories
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddChecklistForm((v) => !v)}
                  className="px-4 py-2 rounded-2xl bg-[#FF4D2D] hover:bg-[#FF6B00] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Checklist Item</span>
                </button>
              </div>

              {/* Add Checklist Item Form */}
              {showAddChecklistForm && (
                <form
                  onSubmit={handleCreateChecklist}
                  className="p-4 rounded-3xl bg-white dark:bg-[#16171B] border border-zinc-200 dark:border-white/10 shadow-lg space-y-3 max-w-xl animate-in fade-in duration-150"
                >
                  <h4 className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                    New Checklist Card
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Item name (e.g. Fresh Berries)"
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      className="sm:col-span-2 px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/10 outline-none text-zinc-900 dark:text-white"
                      autoFocus
                    />
                    <input
                      type="text"
                      placeholder="Size/Detail (e.g. 250ml)"
                      value={newChecklistSubtitle}
                      onChange={(e) => setNewChecklistSubtitle(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/10 outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <input
                      type="text"
                      placeholder="Quantity badge (e.g. 2)"
                      value={newChecklistQty}
                      onChange={(e) => setNewChecklistQty(e.target.value)}
                      className="w-32 px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-white/10 outline-none text-zinc-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddChecklistForm(false)}
                        className="px-3 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newChecklistTitle.trim()}
                        className="px-4 py-1.5 rounded-xl bg-[#FF4D2D] hover:bg-[#FF6B00] text-white font-bold text-xs shadow disabled:opacity-40"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Grid of Checklist Cards & Lucía Note (Image 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Item Cards with Checkmark Circle (Image 3: Fentimas Rose Lemonade, Pesto Barilla, Alpro) */}
                {checklists.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between min-h-[170px] relative shadow-md ${
                      item.checked
                        ? "bg-zinc-100 dark:bg-[#16171B] border-zinc-200 dark:border-white/5 opacity-70"
                        : "bg-white dark:bg-[#1C1E24] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4
                            className={`font-extrabold text-sm sm:text-base leading-snug ${
                              item.checked
                                ? "line-through text-zinc-400"
                                : "text-zinc-900 dark:text-white"
                            }`}
                          >
                            {item.title}
                          </h4>
                          {item.subtitle && (
                            <span className="text-xs font-mono text-zinc-400 block mt-0.5">
                              {item.subtitle}
                            </span>
                          )}
                        </div>

                        {item.quantityBadge && (
                          <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {item.quantityBadge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleChecklistItem(item.id);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            item.checked
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "border-2 border-zinc-300 dark:border-zinc-600 hover:border-emerald-500"
                          }`}
                        >
                          {item.checked && <CheckCircle2 size={16} fill="currentColor" />}
                        </button>
                        <span className="text-[11px] font-semibold text-zinc-500">
                          {item.checked ? "Completed" : "Tap to check"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChecklistItem(item.id);
                        }}
                        className="w-6 h-6 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-500 flex items-center justify-center transition-colors"
                        title="Delete item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* 2. Lucía's Note 1 Sticky Card with Doodle & Call Button (Image 3) */}
                <div className="rounded-3xl p-5 bg-[#FFE29A] text-zinc-900 border-4 border-white dark:border-[#222] shadow-xl flex flex-col justify-between min-h-[170px]">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs">Note 1</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/10">
                        1 day ago
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-700 block mb-2 font-medium">
                      from Lucía Fernández
                    </span>
                    <p className="text-xs font-bold leading-relaxed">
                      Check the produce section for any discounts on fresh berries, and don't get
                      distracted by the snack aisle!
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/10">
                    <span className="text-xl">🏹 ❤️</span>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full bg-amber-400/80 hover:bg-amber-400 text-zinc-900 flex items-center justify-center transition-all cursor-pointer shadow"
                      title="Contact Lucía"
                    >
                      <Phone size={13} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Audio Voice Note Cards (Image 3) */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Volume2 size={14} className="text-[#FF4D2D]" />
                  <span>Audio Voice Memos</span>
                </h3>

                <div className="space-y-2 max-w-xl">
                  {voiceMemos.map((memo) => (
                    <div
                      key={memo.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#16171B] border border-zinc-200 dark:border-white/10 shadow-xs flex items-center gap-3"
                    >
                      <span className="text-xl">{memo.authorAvatar}</span>

                      {/* Play / Pause audio button */}
                      <button
                        type="button"
                        onClick={() => togglePlayVoiceMemo(memo.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                          memo.isPlaying
                            ? "bg-[#FF4D2D] text-white animate-pulse"
                            : "bg-black dark:bg-white text-white dark:text-black"
                        }`}
                      >
                        {memo.isPlaying ? (
                          <Pause size={12} fill="currentColor" />
                        ) : (
                          <Play size={12} fill="currentColor" />
                        )}
                      </button>

                      {/* Audio waveform visualizer bars (Image 3) */}
                      <div className="flex-1 flex items-center gap-0.5 h-6 px-2">
                        {memo.audioWaveform.map((h, i) => (
                          <div
                            key={i}
                            style={{ height: `${h * 0.45}px` }}
                            className={`w-0.5 rounded-full transition-all ${
                              memo.isPlaying ? "bg-[#FF4D2D]" : "bg-zinc-300 dark:bg-zinc-600"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Timestamp (01:09 / 00:36 from Image 3) */}
                      <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
                        {String(Math.floor(memo.durationSeconds / 60)).padStart(2, "0")}:
                        {String(memo.durationSeconds % 60).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#15161A] flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles size={13} className="text-[#FF4D2D]" />
            Block Notes &amp; Mind Palace • Connected Memory Architecture
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
