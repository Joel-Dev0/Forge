import React, { useState, useRef } from "react";
import {
  X,
  Image as ImageIcon,
  Upload,
  Link2,
  Sliders,
  RotateCcw,
  Check,
  Sparkles,
} from "lucide-react";
import {
  useWallpaperStore,
  WALLPAPER_PRESETS,
} from "../../../core/wallpaper/useWallpaperStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = "presets" | "upload" | "url" | "adjust";

export function WallpaperModal({ isOpen, onClose }: Props) {
  const {
    config,
    activeUrl,
    setPreset,
    setCustomUrl,
    setCustomFile,
    setDimOpacity,
    setBlurPx,
    resetToDefault,
  } = useWallpaperStore();

  const [activeTab, setActiveTab] = useState<TabKey>("presets");
  const [urlInput, setUrlInput] = useState(config.customUrl || "");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleApplyUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      setCustomUrl(urlInput.trim());
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (PNG, JPG, WebP, etc.)");
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        await setCustomFile(dataUrl);
      }
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
      alert("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      {/* Modal Container */}
      <div
        className="w-full max-w-2xl rounded-2xl bg-[var(--forge-surface)] border border-[var(--forge-border)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 107, 0, 0.15)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--forge-text)]">
                Customize Wallpaper
              </h2>
              <p className="text-xs text-[var(--forge-text-muted)]">
                Personalize your New Tab background and ambient effects
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] hover:bg-[var(--forge-hover)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--forge-border)] bg-[var(--forge-surface)]">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "presets"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <ImageIcon size={14} />
            <span>Preset Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "upload"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <Upload size={14} />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "url"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <Link2 size={14} />
            <span>Image URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("adjust")}
            className={`flex items-center gap-1.5 pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "adjust"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-[var(--forge-text-muted)] hover:text-[var(--forge-text)]"
            }`}
          >
            <Sliders size={14} />
            <span>Visual Adjustments</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: PRESETS */}
          {activeTab === "presets" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {WALLPAPER_PRESETS.map((preset) => {
                  const isSelected =
                    config.type === "preset" && config.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setPreset(preset.id)}
                      className={`group relative rounded-xl overflow-hidden aspect-video border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#FF6B00] ring-2 ring-[#FF6B00]/40 scale-[1.02]"
                          : "border-[var(--forge-border)] hover:border-[var(--forge-border-strong)] opacity-85 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={preset.thumbnail}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-2">
                        <span className="text-[11px] font-medium text-white truncate drop-shadow-sm">
                          {preset.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#FF6B00] text-white flex items-center justify-center shadow-md">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#FF6B00] bg-[#FF6B00]/10"
                    : "border-[var(--forge-border)] hover:border-[#FF6B00]/60 hover:bg-[var(--forge-hover)]/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)] flex items-center justify-center text-[#FF6B00] mb-3 shadow-inner">
                  <Upload size={22} />
                </div>

                <p className="text-xs font-semibold text-[var(--forge-text)] mb-1">
                  {isProcessingFile ? "Processing image..." : "Choose an image or drop it here"}
                </p>
                <p className="text-[11px] text-[var(--forge-text-muted)] max-w-xs">
                  Supports PNG, JPG, WebP, SVG. Stored locally in your browser storage.
                </p>
              </div>

              {config.type === "custom-file" && activeUrl && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
                  <img
                    src={activeUrl}
                    alt="Active Custom"
                    className="w-16 h-10 rounded-lg object-cover border border-[var(--forge-border)]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--forge-text)] truncate">
                      Custom Local Wallpaper Active
                    </p>
                    <p className="text-[10px] text-emerald-500 font-medium">
                      Stored in local IndexedDB
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-[#FF6B00]/15 text-[#FF6B00] font-medium">
                    Applied
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: IMAGE URL */}
          {activeTab === "url" && (
            <form onSubmit={handleApplyUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--forge-text)] mb-1.5">
                  Direct Image Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/wallpaper.jpg"
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] text-xs text-[var(--forge-text)] placeholder-[var(--forge-text-muted)] outline-none focus:border-[#FF6B00]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-medium hover:bg-[#FF8533] transition-colors cursor-pointer"
                  >
                    Apply URL
                  </button>
                </div>
                <p className="text-[11px] text-[var(--forge-text-muted)] mt-1.5">
                  Make sure the link allows direct image embedding (CORS/HTTPS).
                </p>
              </div>

              {config.type === "custom-url" && config.customUrl && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--forge-surface-elevated)] border border-[var(--forge-border)]">
                  <img
                    src={config.customUrl}
                    alt="Custom URL"
                    className="w-16 h-10 rounded-lg object-cover border border-[var(--forge-border)]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--forge-text)] truncate">
                      {config.customUrl}
                    </p>
                    <p className="text-[10px] text-emerald-500 font-medium">
                      Live URL Active
                    </p>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* TAB 4: VISUAL ADJUSTMENTS */}
          {activeTab === "adjust" && (
            <div className="space-y-5">
              {/* Dim / Overlay darkness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--forge-text)]">
                    Darkness Overlay (Dim)
                  </span>
                  <span className="font-mono text-[var(--forge-text-muted)]">
                    {config.dimOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={config.dimOpacity}
                  onChange={(e) => setDimOpacity(Number(e.target.value))}
                  className="w-full accent-[#FF6B00] cursor-pointer"
                />
                <p className="text-[10px] text-[var(--forge-text-muted)]">
                  Higher dimming ensures text, search results, and cards stay crisp and easy to read.
                </p>
              </div>

              {/* Blur Level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--forge-text)]">
                    Background Blur
                  </span>
                  <span className="font-mono text-[var(--forge-text-muted)]">
                    {config.blurPx}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={config.blurPx}
                  onChange={(e) => setBlurPx(Number(e.target.value))}
                  className="w-full accent-[#FF6B00] cursor-pointer"
                />
                <p className="text-[10px] text-[var(--forge-text-muted)]">
                  Adds a subtle frosted effect behind the dashboard elements.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--forge-border)] bg-[var(--forge-surface-elevated)]/40">
          <button
            type="button"
            onClick={resetToDefault}
            className="flex items-center gap-1.5 text-xs text-[var(--forge-text-muted)] hover:text-[var(--forge-text)] transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#FF6B00] text-white text-xs font-semibold hover:bg-[#FF8533] transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
