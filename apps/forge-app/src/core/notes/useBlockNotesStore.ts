import { create } from "zustand";
import type {
  BlockNote,
  BlockCard,
  ChecklistItem,
  MemoryCard,
  VoiceMemoCard,
  NoteColor,
} from "./notesTypes";

interface BlockNotesState {
  isModalOpen: boolean;
  activeView: "mind-palace" | "memory-cards" | "checklists";
  workspaceName: string;
  searchQuery: string;
  activeTagFilter: string | null;

  // Data
  notes: BlockNote[];
  activeNoteId: string;
  checklists: ChecklistItem[];
  memoryCards: MemoryCard[];
  voiceMemos: VoiceMemoCard[];

  // Modal Control
  setModalOpen: (open: boolean) => void;
  setActiveView: (view: "mind-palace" | "memory-cards" | "checklists") => void;
  setSearchQuery: (query: string) => void;
  setActiveTagFilter: (tag: string | null) => void;
  setActiveNoteId: (id: string) => void;

  // Block Notes CRUD
  addBlockNote: (note: Partial<BlockNote>) => void;
  updateActiveNote: (patch: Partial<BlockNote>) => void;
  addChildCard: (noteId: string, card: Omit<BlockCard, "id">) => void;
  addAssociationCard: (noteId: string, card: Omit<BlockCard, "id">) => void;

  // Checklist CRUD
  toggleChecklistItem: (id: string) => void;
  addChecklistItem: (item: Omit<ChecklistItem, "id">) => void;
  deleteChecklistItem: (id: string) => void;

  // Memory Card CRUD
  addMemoryCard: (card: Omit<MemoryCard, "id" | "createdAtText">) => void;
  updateMemoryCard: (id: string, patch: Partial<MemoryCard>) => void;
  deleteMemoryCard: (id: string) => void;

  // Memory Card Screen Pinning
  togglePinMemoryCard: (id: string, initialPos?: { x: number; y: number }) => void;
  updatePinnedPosition: (id: string, pos: { x: number; y: number }) => void;
  toggleCollapsePinnedCard: (id: string) => void;
  bringCardToFront: (id: string) => void;
  pinNewMemoryCard: (content?: string, color?: NoteColor, pos?: { x: number; y: number }) => void;
  unpinAllCards: () => void;

  // Voice Memo Actions
  togglePlayVoiceMemo: (id: string) => void;
}

const STORAGE_KEY = "forge_block_notes_v2";

const SEEDED_NOTES: BlockNote[] = [
  {
    id: "note-mind-palace",
    workspaceName: "Alex's Mind",
    icon: "🧠",
    title: "How to evolve into a Superhuman with your Digital Mind Palace",
    progressPercent: 66,
    likesCount: 41,
    relatedCores: 3,
    tags: ["#mind", "#app", "#tool", "#practice"],
    contentParagraphs: [
      "The method of loci is a strategy of memory enhancement which uses visualizations of familiar spatial environments in order to enhance the recall of information. The method of loci is also known as the memory journey or memory palace.",
      "This method is a mnemonic device adopted in ancient Roman and Greek rhetorical treatises (in the anonymous Rhetorica ad Herennium, Cicero's De Oratore, and Quintilian's Institutio Oratoria). Many contest champions #mind report using this technique to recall faces, digits, and lists of words.",
    ],
    childrenCards: [
      {
        id: "c-makesense",
        title: "MakeSense App",
        description:
          "Visual knowledge organizer transforming unstructured thoughts into linked spatial structures.",
        tags: ["#mind", "#app"],
        type: "child",
        collaborators: ["Alex", "Sophia", "Liam"],
        icon: "📦",
      },
    ],
    associationCards: [
      {
        id: "a-mjm",
        title: "Mind Journey Map",
        description:
          "Step-by-step spatial anchoring routines for mnemonic palace navigation and instant recall.",
        tags: ["#mind", "#practice"],
        type: "association",
        collaborators: ["Lucía"],
        icon: "🗺️",
        isDotted: true,
      },
      {
        id: "a-ai",
        title: "How AI Assistant work?",
        description:
          "Autonomous memory indexing engines and neural retrieval augmented synthesis.",
        tags: ["#mind", "#tool"],
        type: "association",
        collaborators: ["Alex", "Ethan"],
        icon: "🤖",
        isDotted: true,
      },
    ],
    embeddedCard: {
      relationLabel: "Defines how to practice it",
      card: {
        id: "emb-mjm",
        title: "Mind Journey Map",
        description: "Visual spatial routes for deep retention.",
        tags: ["#mind", "#practice"],
        type: "association",
        collaborators: ["Lucía"],
        icon: "🗺️",
        isDotted: true,
      },
    },
    calloutCard: {
      icon: "💎",
      title: "What tools can I use to create Mind Palace?",
      text: "MakeSense — is a no-code thinking tool for information organization into a highly connected data structure as a virtual mind palace for its further surfing and extraction. With MakeSense you can easy create or import notes, manage your digital mind architecture and generate new information from it.",
    },
    referenceCards: [
      {
        id: "ref-1",
        title: "What is Mind Palace?",
        description: "Cognitive geography and spatial storage principles.",
        tags: ["#mind", "#tool"],
        type: "reference",
        collaborators: ["Alex", "Lucía"],
        icon: "🥣",
      },
      {
        id: "ref-2",
        title: "3 types of Mind Models",
        description: "First-principles, inversion, and mental heuristics.",
        tags: ["#mind", "#tool"],
        type: "reference",
        collaborators: ["Sophia", "Liam"],
        icon: "📐",
      },
      {
        id: "ref-3",
        title: "How AI Assistant work?",
        description: "Large language models with vector embeddings and tools.",
        tags: ["#mind", "#tool"],
        type: "reference",
        collaborators: ["Alex", "Ethan"],
        icon: "🤖",
        isDotted: true,
      },
      {
        id: "ref-4",
        title: "Semantic Network",
        description: "Graph relationships connecting concepts via edges.",
        tags: ["#tool", "#semantic"],
        type: "reference",
        collaborators: ["Liam"],
        icon: "🖲️",
      },
      {
        id: "ref-5",
        title: "7 steps to build Data Lake",
        description: "Ingestion, cleansing, cataloging, and analytical layers.",
        tags: ["#data", "#tool"],
        type: "reference",
        collaborators: ["Ethan"],
        icon: "❄️",
      },
    ],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now(),
  },
];

const SEEDED_CHECKLISTS: ChecklistItem[] = [
  {
    id: "chk-1",
    title: "Fentimas Rose Lemonade",
    subtitle: "250ml",
    quantityBadge: "2",
    checked: false,
    category: "Groceries",
    color: "#FDE2E4",
  },
  {
    id: "chk-2",
    title: "Note 1 from Lucía Fernández",
    subtitle: "Produce Section Special",
    checked: false,
    category: "Groceries",
    color: "#FFE29A",
  },
  {
    id: "chk-3",
    title: "Pesto Barilla con Basilico",
    subtitle: "190g",
    checked: true,
    category: "Groceries",
    color: "#E2F0D9",
  },
  {
    id: "chk-4",
    title: "Alpro - Almond Original",
    subtitle: "1L",
    checked: false,
    category: "Groceries",
    color: "#E8F0FE",
  },
  {
    id: "chk-5",
    title: "Avocado Hass Extra Fresh",
    subtitle: "Pack of 3",
    quantityBadge: "1",
    checked: true,
    category: "Groceries",
    color: "#E2F0D9",
  },
];

const SEEDED_MEMORY_CARDS: MemoryCard[] = [
  {
    id: "mem-1",
    title: "Note 1 from Lucía Fernández",
    content:
      "Check the produce section for any discounts on fresh berries, and don't get distracted by the snack aisle! ❤️",
    color: "#FFE29A",
    category: "Groceries",
    collaborators: ["Lucía Fernández"],
    createdAtText: "1 day ago",
    authorName: "Lucía Fernández",
    hasHeartDoodle: true,
    actionType: "call",
  },
  {
    id: "mem-2",
    title: "Weekend Party Supplies",
    content:
      "Pick up eco-friendly paper cups, fresh mint leaves for cold drinks, extra ice, and party speakers.",
    color: "#FFB3BA",
    category: "Party Supplies",
    collaborators: ["Ethan Caldwell", "Sophia"],
    createdAtText: "2 days ago",
  },
  {
    id: "mem-3",
    title: "Spatial Mind Palace Notes",
    content:
      "Anchor each room to 5 distinct loci: front door, hallway console, staircase, library desk, and balcony garden.",
    color: "#BAFFC7",
    category: "Ideas",
    collaborators: ["Alex", "Liam Foster"],
    createdAtText: "Today",
  },
  {
    id: "mem-4",
    title: "Household Inventory & Pantry",
    content:
      "Extra virgin olive oil, sea salt flakes, organic sourdough bread, and sparkling mineral water.",
    color: "#BAE1FF",
    category: "Household Items",
    collaborators: ["Alex", "Lucía Fernández"],
    createdAtText: "3 days ago",
  },
];

const SEEDED_VOICE_MEMOS: VoiceMemoCard[] = [
  {
    id: "vm-1",
    authorName: "Lucía Fernández",
    authorAvatar: "👩‍🦰",
    durationSeconds: 69,
    audioWaveform: [
      14, 28, 18, 36, 44, 22, 38, 16, 42, 28, 50, 24, 38, 16, 44, 30, 48, 20, 36,
      52, 28, 46, 20, 40,
    ],
  },
  {
    id: "vm-2",
    authorName: "Ethan Caldwell",
    authorAvatar: "👨‍💻",
    durationSeconds: 36,
    audioWaveform: [
      18, 32, 14, 26, 38, 20, 30, 42, 24, 18, 34, 46, 22, 36, 16, 28, 40, 22,
    ],
  },
];

function loadSavedState(): {
  notes: BlockNote[];
  activeNoteId: string;
  checklists: ChecklistItem[];
  memoryCards: MemoryCard[];
  voiceMemos: VoiceMemoCard[];
} {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          notes: parsed.notes?.length ? parsed.notes : SEEDED_NOTES,
          activeNoteId: parsed.activeNoteId || SEEDED_NOTES[0].id,
          checklists: parsed.checklists?.length ? parsed.checklists : SEEDED_CHECKLISTS,
          memoryCards: parsed.memoryCards?.length ? parsed.memoryCards : SEEDED_MEMORY_CARDS,
          voiceMemos: parsed.voiceMemos?.length ? parsed.voiceMemos : SEEDED_VOICE_MEMOS,
        };
      }
    }
  } catch {}
  return {
    notes: SEEDED_NOTES,
    activeNoteId: SEEDED_NOTES[0].id,
    checklists: SEEDED_CHECKLISTS,
    memoryCards: SEEDED_MEMORY_CARDS,
    voiceMemos: SEEDED_VOICE_MEMOS,
  };
}

function persistState(
  notes: BlockNote[],
  activeNoteId: string,
  checklists: ChecklistItem[],
  memoryCards: MemoryCard[],
  voiceMemos: VoiceMemoCard[]
) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ notes, activeNoteId, checklists, memoryCards, voiceMemos })
      );
    }
  } catch {}
}

const initial = loadSavedState();

export const useBlockNotesStore = create<BlockNotesState>((set, get) => ({
  isModalOpen: false,
  activeView: "mind-palace",
  workspaceName: "Alex's Mind",
  searchQuery: "",
  activeTagFilter: null,

  notes: initial.notes,
  activeNoteId: initial.activeNoteId,
  checklists: initial.checklists,
  memoryCards: initial.memoryCards,
  voiceMemos: initial.voiceMemos,

  setModalOpen(open) {
    set({ isModalOpen: open });
  },

  setActiveView(view) {
    set({ activeView: view });
  },

  setSearchQuery(query) {
    set({ searchQuery: query });
  },

  setActiveTagFilter(tag) {
    set({ activeTagFilter: tag });
  },

  setActiveNoteId(id) {
    set({ activeNoteId: id });
  },

  addBlockNote(note) {
    const newNote: BlockNote = {
      id: `note_${Date.now()}`,
      workspaceName: get().workspaceName,
      icon: note.icon || "📝",
      title: note.title || "Untitled Mind Note",
      progressPercent: note.progressPercent || 0,
      likesCount: 0,
      relatedCores: 1,
      tags: note.tags || ["#mind"],
      contentParagraphs: note.contentParagraphs || ["Start typing your thoughts..."],
      childrenCards: note.childrenCards || [],
      associationCards: note.associationCards || [],
      referenceCards: note.referenceCards || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...note,
    };
    const nextNotes = [newNote, ...get().notes];
    set({ notes: nextNotes, activeNoteId: newNote.id });
    persistState(nextNotes, newNote.id, get().checklists, get().memoryCards, get().voiceMemos);
  },

  updateActiveNote(patch) {
    const { notes, activeNoteId } = get();
    const nextNotes = notes.map((n) =>
      n.id === activeNoteId ? { ...n, ...patch, updatedAt: Date.now() } : n
    );
    set({ notes: nextNotes });
    persistState(nextNotes, activeNoteId, get().checklists, get().memoryCards, get().voiceMemos);
  },

  addChildCard(noteId, card) {
    const { notes } = get();
    const newCard: BlockCard = {
      id: `card_${Date.now()}`,
      type: "child",
      ...card,
    };
    const nextNotes = notes.map((n) =>
      n.id === noteId ? { ...n, childrenCards: [...n.childrenCards, newCard] } : n
    );
    set({ notes: nextNotes });
    persistState(nextNotes, get().activeNoteId, get().checklists, get().memoryCards, get().voiceMemos);
  },

  addAssociationCard(noteId, card) {
    const { notes } = get();
    const newCard: BlockCard = {
      id: `card_${Date.now()}`,
      type: "association",
      isDotted: true,
      ...card,
    };
    const nextNotes = notes.map((n) =>
      n.id === noteId ? { ...n, associationCards: [...n.associationCards, newCard] } : n
    );
    set({ notes: nextNotes });
    persistState(nextNotes, get().activeNoteId, get().checklists, get().memoryCards, get().voiceMemos);
  },

  toggleChecklistItem(id) {
    const next = get().checklists.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c));
    set({ checklists: next });
    persistState(get().notes, get().activeNoteId, next, get().memoryCards, get().voiceMemos);
  },

  addChecklistItem(item) {
    const newItem: ChecklistItem = {
      id: `chk_${Date.now()}`,
      ...item,
    };
    const next = [newItem, ...get().checklists];
    set({ checklists: next });
    persistState(get().notes, get().activeNoteId, next, get().memoryCards, get().voiceMemos);
  },

  deleteChecklistItem(id) {
    const next = get().checklists.filter((c) => c.id !== id);
    set({ checklists: next });
    persistState(get().notes, get().activeNoteId, next, get().memoryCards, get().voiceMemos);
  },

  addMemoryCard(card) {
    const newCard: MemoryCard = {
      id: `mem_${Date.now()}`,
      createdAtText: "Just now",
      ...card,
    };
    const next = [newCard, ...get().memoryCards];
    set({ memoryCards: next });
    persistState(get().notes, get().activeNoteId, get().checklists, next, get().voiceMemos);
  },

  updateMemoryCard(id, patch) {
    const next = get().memoryCards.map((m) => (m.id === id ? { ...m, ...patch } : m));
    set({ memoryCards: next });
    persistState(get().notes, get().activeNoteId, get().checklists, next, get().voiceMemos);
  },

  deleteMemoryCard(id) {
    const next = get().memoryCards.filter((m) => m.id !== id);
    set({ memoryCards: next });
    persistState(get().notes, get().activeNoteId, get().checklists, next, get().voiceMemos);
  },

  togglePinMemoryCard(id, initialPos) {
    const cards = get().memoryCards;
    const card = cards.find((c) => c.id === id);
    if (!card) return;

    const willBePinned = !card.isPinnedToScreen;
    const pinnedCount = cards.filter((c) => c.isPinnedToScreen).length;
    const defaultX = Math.max(40, 80 + ((pinnedCount * 45) % 360));
    const defaultY = Math.max(90, 120 + ((pinnedCount * 45) % 280));

    const next = cards.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          isPinnedToScreen: willBePinned,
          pinnedPosition: willBePinned
            ? c.pinnedPosition || initialPos || { x: defaultX, y: defaultY }
            : c.pinnedPosition,
          zIndex: willBePinned
            ? Math.max(1000, ...cards.map((x) => x.zIndex || 1000)) + 1
            : c.zIndex,
        };
      }
      return c;
    });

    set({ memoryCards: next });
    persistState(get().notes, get().activeNoteId, get().checklists, next, get().voiceMemos);
  },

  updatePinnedPosition(id, pos) {
    const next = get().memoryCards.map((c) =>
      c.id === id ? { ...c, pinnedPosition: pos } : c
    );
    set({ memoryCards: next });
    persistState(get().notes, get().activeNoteId, get().checklists, next, get().voiceMemos);
  },

  toggleCollapsePinnedCard(id) {
    const next = get().memoryCards.map((c) =>
      c.id === id ? { ...c, isCollapsed: !c.isCollapsed } : c
    );
    set({ memoryCards: next });
    persistState(get().notes, get().activeNoteId, get().checklists, next, get().voiceMemos);
  },

  bringCardToFront(id) {
    const cards = get().memoryCards;
    const highestZ = Math.max(1000, ...cards.map((c) => c.zIndex || 1000));
    const next = cards.map((c) =>
      c.id === id ? { ...c, zIndex: highestZ + 1 } : c
    );
    set({ memoryCards: next });
    persistState(get().notes, get().activeNoteId, get().checklists, next, get().voiceMemos);
  },

  pinNewMemoryCard(content, color, pos) {
    const cards = get().memoryCards;
    const pinnedCount = cards.filter((c) => c.isPinnedToScreen).length;
    const defaultX = pos?.x ?? Math.max(40, 100 + ((pinnedCount * 45) % 360));
    const defaultY = pos?.y ?? Math.max(90, 130 + ((pinnedCount * 45) % 280));
    const highestZ = Math.max(1000, ...cards.map((c) => c.zIndex || 1000)) + 1;

    const newCard: MemoryCard = {
      id: `mem_${Date.now()}`,
      title: "Pinned Note",
      content: content || "✨ Quick screen note... Click to edit!",
      color: color || "#FFE29A",
      category: "Screen Notes",
      collaborators: ["You"],
      createdAtText: "Just now",
      isPinnedToScreen: true,
      pinnedPosition: { x: defaultX, y: defaultY },
      isCollapsed: false,
      zIndex: highestZ,
    };

    const next = [newCard, ...cards];
    set({ memoryCards: next });
    persistState(get().notes, get().activeNoteId, get().checklists, next, get().voiceMemos);
  },

  unpinAllCards() {
    const next = get().memoryCards.map((c) => ({ ...c, isPinnedToScreen: false }));
    set({ memoryCards: next });
    persistState(get().notes, get().activeNoteId, get().checklists, next, get().voiceMemos);
  },

  togglePlayVoiceMemo(id) {
    const next = get().voiceMemos.map((v) =>
      v.id === id ? { ...v, isPlaying: !v.isPlaying } : { ...v, isPlaying: false }
    );
    set({ voiceMemos: next });
  },
}));
