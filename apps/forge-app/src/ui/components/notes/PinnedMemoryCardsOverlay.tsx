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
  const currentPosRef = useRef(localPos);
  currentPosRef.current = localPos;
  const rafIdRef = useRef<number | null>(null);

  // Sync position if external update occurs and not currently dragging
  useEffect(() => {
    if (!isDragging && card.pinnedPosition) {
      setLocalPos(card.pinnedPosition);
    }
  }, [card.pinnedPosition, isDragging]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag with primary mouse button
    if (e.button !== 0) return;

    bringCardToFront(card.id);

    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    setIsDragging(true);

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startPosX = currentPosRef.current.x;
    const startPosY = currentPosRef.current.y;
    let latestX = startPosX;
    let latestY = startPosY;

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startMouseX;
      const deltaY = moveEvent.clientY - startMouseY;

      const cardWidth = cardRef.current?.offsetWidth || 280;
      const minX = -(cardWidth - 80);
      const maxX = Math.max(10, window.innerWidth - 80);
      const minY = 10;
      const maxY = Math.max(10, window.innerHeight - 50);

      latestX = Math.min(Math.max(minX, startPosX + deltaX), maxX);
      latestY = Math.min(Math.max(minY, startPosY + deltaY), maxY);

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        if (cardRef.current) {
          cardRef.current.style.transform = `translate3d(${latestX}px, ${latestY}px, 0)`;
        }
      });
    };

    const cleanup = () => {
      setIsDragging(false);
      try {
        if (target.hasPointerCapture(e.pointerId)) {
          target.releasePointerCapture(e.pointerId);
        }
      } catch {}

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
      window.removeEventListener("blur", cleanup);

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      setLocalPos({ x: latestX, y: latestY });
      updatePinnedPosition(card.id, { x: latestX, y: latestY });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
    window.addEventListener("blur", cleanup);
  };

  return (
    <>
      {/* Mouse interceptor overlay while dragging to shield against webviews eating events */}
      {isDragging && (
        <div className="fixed inset-0 z-[999998] cursor-grabbing select-none pointer-events-auto" />
      )}

      <div
        ref={cardRef}
        onMouseDown={() => bringCardToFront(card.id)}
        style={{
          transform: `translate3d(${localPos.x}px, ${localPos.y}px, 0)`,
          zIndex: isDragging ? 999999 : (card.zIndex || 9999),
          backgroundColor: card.color,
        }}
        className={`fixed top-0 left-0 pointer-events-auto rounded-3xl select-none will-change-transform ${
          isDragging
            ? "cursor-grabbing shadow-[0_28px_60px_rgba(0,0,0,0.6)] scale-[1.02] ring-2 ring-[#FF6B00] transition-none"
            : "shadow-[0_16px_36px_rgba(0,0,0,0.38)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.48)] transition-shadow duration-150"
        } border-4 border-white/90 dark:border-[#222]/90 text-zinc-900`}
      >
        {/* Decorative Tactile Pushpin Header */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center pointer-events-none">
          <div
            title="Pinned to Screen"
            className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-rose-700 shadow-[0_4px_10px_rgba(239,68,68,0.5)] border-2 border-white flex items-center justify-center text-white text-[11px]"
          >
            📌
          </div>
        </div>

        {/* Drag Handle Bar */}
        <div
          onPointerDown={handlePointerDown}
          className="px-4 pt-3.5 pb-2 flex items-center justify-between cursor-grab border-b border-black/10 active:cursor-grabbing select-none touch-none"
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
              onPointerDown={(e) => e.stopPropagation()}
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
              onPointerDown={(e) => e.stopPropagation()}
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
              onPointerDown={(e) => e.stopPropagation()}
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
  </>
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
