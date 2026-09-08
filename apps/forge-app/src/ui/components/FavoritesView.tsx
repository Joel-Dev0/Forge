import { useState } from "react";
import {
  Star,
  Folder,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Download,
  Upload,
  Search,
  Check,
  X,
} from "lucide-react";
import { useFavoritesStore } from "../../core/favorites/useFavoritesStore";
import { useTabsStore } from "../../core/tabs/useTabsStore";

interface Props {
  onNavigate: (url: string) => void;
}

export function FavoritesView({ onNavigate }: Props) {
  const {
    folders,
    items,
    searchQuery,
    selectedFolderId,
    selectedTag,
    addFavorite,
    removeFavorite,
    togglePin,
    createFolder,
    setSearchQuery,
    setSelectedFolderId,
    setSelectedTag,
    exportFavorites,
    importFavorites,
  } = useFavoritesStore();

  const openTab = useTabsStore((s) => s.openTab);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newFolderId, setNewFolderId] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique tags
  const allTags = Array.from(new Set(items.flatMap((i) => i.tags || [])));

  // Filter items
  const filteredItems = items.filter((item) => {
    if (selectedFolderId && item.folderId !== selectedFolderId) return false;
    if (selectedTag && !item.tags.includes(selectedTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(q);
      const matchesUrl = item.url.toLowerCase().includes(q);
      const matchesNotes = item.notes?.toLowerCase().includes(q);
      const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesTitle && !matchesUrl && !matchesNotes && !matchesTags) return false;
    }
    return true;
  });

  const handleCreateFavorite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    let url = newUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const tags = newTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    addFavorite({
      title: newTitle.trim() || url,
      url,
      folderId: newFolderId || undefined,
      tags,
      notes: newNotes.trim(),
    });

    setNewTitle("");
    setNewUrl("");
    setNewTags("");
    setNewNotes("");
    setShowAddModal(false);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim());
    setNewFolderName("");
    setShowFolderInput(false);
  };

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExport = () => {
    const json = exportFavorites();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forge-favorites-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) importFavorites(text);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-[11px]">
      {/* Top Header & Actions */}
      <div className="p-2 border-b border-[var(--forge-border)] flex items-center justify-between gap-1 bg-[var(--forge-surface-elevated)]/30">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--forge-text)]">
          <Star size={13} className="text-[#FF6B00] fill-[#FF6B00]" />
          <span>Favorites</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[var(--forge-input)] text-[var(--forge-text-muted)] font-mono">
            {items.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAddModal(true)}
            title="Add Favorite"
            className="p-1 rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={handleExport}
            title="Export JSON"
            className="p-1 rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
          >
            <Download size={12} />
          </button>
          <button
            onClick={handleImport}
            title="Import JSON"
            className="p-1 rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
          >
            <Upload size={12} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-[var(--forge-border)]">
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--forge-input)] border border-[var(--forge-border)] focus-within:border-[#FF6B00] transition-colors">
          <Search size={11} className="text-[var(--forge-text-muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search favorites, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-[10px] text-[var(--forge-text)] placeholder:text-[var(--forge-text-muted)]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Folder Chips */}
      <div className="px-2 py-1.5 border-b border-[var(--forge-border)] flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSelectedFolderId(null)}
          className={`px-2 py-0.5 rounded text-[9px] font-medium shrink-0 transition-colors cursor-pointer ${
            selectedFolderId === null
              ? "bg-[#FF6B00]/20 text-[#FF6B00] font-semibold border border-[#FF6B00]/40"
              : "bg-[var(--forge-input)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
          }`}
        >
          All ({items.length})
        </button>

        {folders.map((f) => {
          const count = items.filter((i) => i.folderId === f.id).length;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFolderId(selectedFolderId === f.id ? null : f.id)}
              className={`px-2 py-0.5 rounded text-[9px] font-medium shrink-0 flex items-center gap-1 transition-colors cursor-pointer ${
                selectedFolderId === f.id
                  ? "bg-[#FF6B00]/20 text-[#FF6B00] font-semibold border border-[#FF6B00]/40"
                  : "bg-[var(--forge-input)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color || "#FF6B00" }} />
              {f.name} ({count})
            </button>
          );
        })}

        <button
          onClick={() => setShowFolderInput((v) => !v)}
          title="New Folder"
          className="p-1 rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
        >
          <Folder size={11} />
        </button>
      </div>

      {/* New Folder Inline Form */}
      {showFolderInput && (
        <form onSubmit={handleCreateFolder} className="p-2 border-b border-[var(--forge-border)] flex items-center gap-1 bg-[var(--forge-input)]/50">
          <input
            type="text"
            placeholder="Folder name..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="flex-1 bg-[var(--forge-input)] border border-[var(--forge-border)] px-2 py-0.5 rounded text-[10px] text-[var(--forge-text)] outline-none"
            autoFocus
          />
          <button type="submit" className="px-2 py-0.5 bg-[#FF6B00] text-white rounded text-[9px] font-semibold cursor-pointer">
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowFolderInput(false)}
            className="p-1 text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] cursor-pointer"
          >
            <X size={11} />
          </button>
        </form>
      )}

      {/* Tag Filter Pills */}
      {allTags.length > 0 && (
        <div className="px-2 py-1 border-b border-[var(--forge-border)] flex items-center gap-1 overflow-x-auto scrollbar-none">
          <span className="text-[8px] uppercase tracking-wider text-[var(--forge-text-muted)] shrink-0 mr-0.5">
            Tags:
          </span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-1.5 py-0.2 rounded text-[8px] shrink-0 transition-colors cursor-pointer ${
                selectedTag === tag
                  ? "bg-[#FF6B00] text-white font-semibold"
                  : "bg-[var(--forge-hover)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Items List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-1">
        {filteredItems.length === 0 ? (
          <div className="p-4 text-center text-[var(--forge-text-muted)] text-[10px] italic">
            No favorites match your filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const folder = folders.find((f) => f.id === item.folderId);
            return (
              <div
                key={item.id}
                onClick={() => onNavigate(item.url)}
                className="group relative flex items-start gap-2 p-2 mb-1 rounded-md hover:bg-[var(--forge-hover)] cursor-pointer transition-all border border-transparent hover:border-[var(--forge-border)]"
              >
                {/* Pin/Star toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(item.id);
                  }}
                  className={`mt-0.5 text-[var(--forge-text-muted)] hover:text-[#FF6B00] transition-colors cursor-pointer ${
                    item.pinned ? "text-[#FF6B00]" : "opacity-40 group-hover:opacity-100"
                  }`}
                  title={item.pinned ? "Unpin" : "Pin to top"}
                >
                  <Star size={12} className={item.pinned ? "fill-[#FF6B00]" : ""} />
                </button>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[11px] text-[var(--forge-text)] truncate group-hover:text-[#FF6B00] transition-colors">
                      {item.title}
                    </span>
                    {folder && (
                      <span
                        className="text-[8px] px-1 py-0.2 rounded font-mono font-bold shrink-0"
                        style={{
                          backgroundColor: `${folder.color || "#FF6B00"}20`,
                          color: folder.color || "#FF6B00",
                        }}
                      >
                        {folder.name}
                      </span>
                    )}
                  </div>

                  <p className="text-[9px] text-[var(--forge-text-muted)] truncate font-mono">
                    {item.url}
                  </p>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {item.tags.map((t) => (
                        <span key={t} className="text-[8px] px-1 rounded bg-[var(--forge-input)] text-[var(--forge-text-muted)]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-[9px] text-[var(--forge-text-secondary)] mt-1 line-clamp-1 italic">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Action Buttons (visible on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openTab(item.url);
                    }}
                    title="Open in new tab"
                    className="p-1 rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-surface)] transition-colors cursor-pointer"
                  >
                    <ExternalLink size={10} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(item.url, item.id);
                    }}
                    title="Copy URL"
                    className="p-1 rounded text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-surface)] transition-colors cursor-pointer"
                  >
                    {copiedId === item.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavorite(item.id);
                    }}
                    title="Delete"
                    className="p-1 rounded text-[var(--forge-text-muted)] hover:text-red-500 hover:bg-[var(--forge-surface)] transition-colors cursor-pointer"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Favorite Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateFavorite}
            className="w-80 bg-[var(--forge-surface)] border border-[var(--forge-border)] rounded-lg shadow-xl p-4 flex flex-col gap-3 text-[11px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--forge-text)] flex items-center gap-1.5">
                <Star size={13} className="text-[#FF6B00] fill-[#FF6B00]" />
                Add to Favorites
              </span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)]">Title</label>
              <input
                type="text"
                placeholder="Page title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-[var(--forge-input)] border border-[var(--forge-border)] px-2.5 py-1.5 rounded text-[11px] text-[var(--forge-text)] outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)]">URL *</label>
              <input
                type="text"
                placeholder="https://example.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                required
                className="bg-[var(--forge-input)] border border-[var(--forge-border)] px-2.5 py-1.5 rounded text-[11px] text-[var(--forge-text)] outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)]">Folder</label>
              <select
                value={newFolderId}
                onChange={(e) => setNewFolderId(e.target.value)}
                className="bg-[var(--forge-input)] border border-[var(--forge-border)] px-2 py-1 rounded text-[11px] text-[var(--forge-text)] outline-none"
              >
                <option value="">No folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)]">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="docs, api, design"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                className="bg-[var(--forge-input)] border border-[var(--forge-border)] px-2.5 py-1 rounded text-[11px] text-[var(--forge-text)] outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-semibold text-[var(--forge-text-muted)]">Notes</label>
              <textarea
                placeholder="Quick notes or reminders..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                className="bg-[var(--forge-input)] border border-[var(--forge-border)] px-2.5 py-1.5 rounded text-[10px] text-[var(--forge-text)] outline-none focus:border-[#FF6B00] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1 rounded bg-[var(--forge-input)] text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-[#FF6B00] hover:bg-[#e05e00] text-white font-semibold cursor-pointer shadow-xs"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}