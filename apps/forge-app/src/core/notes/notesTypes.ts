export type NoteColor =
  | "#FFE29A" // Pastel Yellow
  | "#FFB3BA" // Pastel Pink
  | "#BAFFC7" // Pastel Green
  | "#BAE1FF" // Pastel Blue
  | "#D1BAFF" // Pastel Lavender
  | "#FFBAF1"; // Pastel Magenta

export interface BlockCard {
  id: string;
  title: string;
  description: string;
  tags: string[];
  type: "child" | "association" | "reference";
  collaborators: string[];
  icon?: string;
  isDotted?: boolean;
}

export interface BlockNote {
  id: string;
  workspaceName: string;
  icon: string;
  title: string;
  progressPercent: number; // e.g. 66
  likesCount: number; // e.g. 41
  relatedCores: number; // e.g. 3
  contentParagraphs: string[];
  tags: string[];
  childrenCards: BlockCard[];
  associationCards: BlockCard[];
  embeddedCard?: {
    relationLabel: string; // e.g. "Defines how to practice it"
    card: BlockCard;
  };
  calloutCard?: {
    icon: string;
    title: string;
    text: string;
  };
  referenceCards: BlockCard[];
  createdAt: number;
  updatedAt: number;
}

export interface ChecklistItem {
  id: string;
  title: string;
  subtitle?: string; // e.g. "250ml", "190g", "1L"
  quantityBadge?: string | number; // e.g. "2"
  checked: boolean;
  category: string; // e.g. "Groceries", "Party Supplies"
  iconUrl?: string;
  color?: string;
}

export interface MemoryCard {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  category: string;
  collaborators: string[];
  createdAtText: string; // e.g. "1 day ago"
  authorName?: string;
  hasHeartDoodle?: boolean;
  actionType?: "call" | "view" | "none";
  isPinnedToScreen?: boolean;
  pinnedPosition?: { x: number; y: number };
  isCollapsed?: boolean;
  zIndex?: number;
}

export interface VoiceMemoCard {
  id: string;
  authorName: string;
  authorAvatar: string;
  durationSeconds: number; // e.g. 69 -> 01:09
  audioWaveform: number[];
  isPlaying?: boolean;
}
