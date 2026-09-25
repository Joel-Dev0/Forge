import React, { useState, useEffect, useRef } from "react";
import {
  Pin,
  X,
  Minus,
  Maximize2,
  Heart,
  Palette,
  Plus,
  Trash2,
  Move,
  Check,
} from "lucide-react";
import { useBlockNotesStore } from "../../../core/notes/useBlockNotesStore";
import type { MemoryCard, NoteColor } from "../../../core/notes/notesTypes";

const PASTEL_COLORS: { hex: NoteColor; label: string }[] = [
  { hex: "#FFE29A", label: "Yellow" },
  { hex: "#FFB3BA", label: "Pink" },
  { hex: "#BAFFC7", label: "Green" },
  { hex: "#BAE1FF", label: "Blue" },
  { hex: "#D1BAFF", label: "Lavender" },
  { hex: "#FFBAF1", label: "Magenta" },
];

interface FloatingCardProps {
  card: MemoryCard;
}

const FloatingMemoryCard: React.FC<FloatingCardProps> = ({ card }) => {
  const {
    updatePinnedPosition,
    togglePinMemoryCard,
    toggleCollapsePinnedCard,
    bringCardToFront,
    updateMemoryCard,
    deleteMemoryCard,
  } = useBlockNotesStore();

  const [isDragging, setIsDragging] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [localPos, setLocalPos] = useState({
    x: card.pinnedPosition?.x ?? 120,
    y: card.pinnedPosition?.y ?? 140,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  // Sync position if external update occurs and not currently dragging
  useEffect(() => {
    if (!isDragging && card.pinnedPosition) {
      setLocalPos(card.pinnedPosition);
    }
  }, [card.pinnedPosition, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from header handle
    bringCardToFront(card.id);
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: localPos.x,
      startY: localPos.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - dragStartRef.current.mouseY;

      const maxX = Math.max(0, window.innerWidth - 80);
      const maxY = Math.max(0, window.innerHeight - 50);

      const nextX = Math.min(Math.max(10, dragStartRef.current.startX + deltaX), maxX);
      const nextY = Math.min(Math.max(10, dragStartRef.current.startY + deltaY), maxY);

      setLocalPos({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (dragStartRef.current) {
        setLocalPos((current) => {
          updatePinnedPosition(card.id, current);
          return current;
        });
      }
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      ref={cardRef}
      onMouseDown={() => bringCardToFront(card.id)}
      style={{
        transform: `translate3d(${localPos.x}px, ${localPos.y}px, 0)`,
        zIndex: card.zIndex || 9999,
        backgroundColor: card.color,
      }}
      className={`fixed top-0 left-0 pointer-events-auto rounded-3xl transition-shadow select-none ${
        isDragging
          ? "cursor-grabbing shadow-[0_24px_50px_rgba(0,0,0,0.55)] scale-[1.02] ring-2 ring-[#FF6B00]"
          : "shadow-[0_16px_36px_rgba(0,0,0,0.38)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.48)]"
      } border-4 border-white/90 dark:border-[#222]/90 text-zinc-900 transition-[transform,shadow] duration-75`}
    >
      {/* Decorative Tactile Pushpin Header */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
        <div
          title="Pinned to Screen"
          className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-rose-700 shadow-[0_4px_10px_rgba(239,68,68,0.5)] border-2 border-white flex items-center justify-center text-white text-[11px]"
        >
          📌
        </div>
      </div>

      {/* Drag Handle Bar */}
      <div
        onMouseDown={handleMouseDown}
        className="px-4 pt-3.5 pb-2 flex items-center justify-between cursor-grab border-b border-black/10 active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          <Move size={11} className="text-zinc-600 opacity-60 shrink-0" />
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/10 truncate max-w-[120px]">
            {card.category || "Screen Note"}
          </span>
        </div>

        {/* Card Controls */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Palette button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker((v) => !v);
            }}
            className="w-5 h-5 rounded-md hover:bg-black/15 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer"
            title="Change Card Color"
          >
            <Palette size={12} />
          </button>

          {/* Minimize / Expand */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsePinnedCard(card.id);
            }}
            className="w-5 h-5 rounded-md hover:bg-black/15 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer"
            title={card.isCollapsed ? "Expand Note" : "Collapse Note"}
          >
            {card.isCollapsed ? <Maximize2 size={11} /> : <Minus size={12} />}
          </button>

          {/* Unpin from screen */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePinMemoryCard(card.id);
            }}
            className="w-5 h-5 rounded-md hover:bg-red-500 hover:text-white flex items-center justify-center text-zinc-700 transition-colors cursor-pointer"
            title="Unpin from Screen"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Color Picker Drawer */}
      {showColorPicker && (
        <div className="px-4 py-2 bg-black/10 flex items-center gap-2 border-b border-black/10 animate-in fade-in duration-100">
          <span className="text-[9px] font-bold text-zinc-700 uppercase">Color:</span>
          <div className="flex items-center gap-1.5">
            {PASTEL_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => {
                  updateMemoryCard(card.id, { color: c.hex });
                  setShowColorPicker(false);
                }}
                style={{ backgroundColor: c.hex }}
                className={`w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition-transform cursor-pointer flex items-center justify-center ${
                  card.color === c.hex ? "ring-2 ring-black" : ""
                }`}
                title={c.label}
              >
                {card.color === c.hex && <Check size={10} className="text-zinc-800" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsed View */}
      {card.isCollapsed ? (
        <div className="px-4 py-2.5 w-[220px] flex items-center justify-between">
          <p className="text-xs font-bold truncate text-zinc-800">
            {card.content.slice(0, 30) || "Empty note"}
          </p>
          <button
            type="button"
            onClick={() => toggleCollapsePinnedCard(card.id)}
            className="text-[10px] font-bold text-[#FF6B00] hover:underline ml-2 cursor-pointer"
          >
            Expand
          </button>
        </div>
      ) : (
        /* Full Note Content & Editor */
        <div className="p-4 w-[280px] sm:w-[310px] flex flex-col justify-between gap-3">
          <textarea
            value={card.content}
            onChange={(e) => updateMemoryCard(card.id, { content: e.target.value })}
            placeholder="Type your screen note here..."
            rows={4}
            className="w-full bg-transparent border-none outline-none font-bold text-sm leading-relaxed placeholder-zinc-700/60 resize-none text-zinc-900 focus:ring-0"
          />

          {card.hasHeartDoodle && (
            <div className="text-rose-600 font-bold text-base select-none flex items-center gap-1">
              <span>❤️</span>
              <span className="text-[10px] text-zinc-600 italic">love note</span>
            </div>
          )}

          {/* Footer bar */}
          <div className="flex items-center justify-between pt-2 border-t border-black/10 text-[10px] text-zinc-700 font-medium">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateMemoryCard(card.id, { hasHeartDoodle: !card.hasHeartDoodle })}
                className={`p-1 rounded-md transition-colors ${
                  card.hasHeartDoodle ? "bg-rose-500/20 text-rose-600" : "hover:bg-black/10 text-zinc-600"
                }`}
                title="Toggle Heart Doodle"
              >
                <Heart size={12} className={card.hasHeartDoodle ? "fill-current" : ""} />
              </button>
              <span className="font-mono text-[9px] opacity-75">{card.createdAtText || "Screen"}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => deleteMemoryCard(card.id)}
                className="p-1 rounded-md hover:bg-red-500/20 hover:text-red-700 text-zinc-500 transition-colors"
                title="Delete this card"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PinnedMemoryCardsOverlay: React.FC = () => {
  const memoryCards = useBlockNotesStore((s) => s.memoryCards);
  const pinNewMemoryCard = useBlockNotesStore((s) => s.pinNewMemoryCard);
  const unpinAllCards = useBlockNotesStore((s) => s.unpinAllCards);

  const pinnedCards = memoryCards.filter((c) => c.isPinnedToScreen);

  if (pinnedCards.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[9990]">
      {/* Floating Pinned Memory Cards */}
      {pinnedCards.map((card) => (
        <FloatingMemoryCard key={card.id} card={card} />
      ))}

      {/* Floating Screen Sticky Dock Pill */}
      <div className="fixed bottom-4 left-6 pointer-events-auto z-[9999] flex items-center gap-2 bg-[#121316]/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-2xl shadow-2xl text-xs text-white">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold">
          <Pin size={13} className="rotate-45" />
          <span>
            {pinnedCards.length} Pinned {pinnedCards.length === 1 ? "Note" : "Notes"}
          </span>
        </div>

        <div className="w-[1px] h-3 bg-white/20" />

        <button
          type="button"
          onClick={() => pinNewMemoryCard("✨ Quick note on screen...")}
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-zinc-950 font-extrabold text-[11px] transition-all cursor-pointer shadow-xs"
          title="Add another pinned card"
        >
          <Plus size={11} strokeWidth={3} />
          <span>Add Note</span>
        </button>

        <button
          type="button"
          onClick={unpinAllCards}
          className="text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          title="Unpin all notes from screen"
        >
          Unpin All
        </button>
      </div>
    </div>
  );
};
