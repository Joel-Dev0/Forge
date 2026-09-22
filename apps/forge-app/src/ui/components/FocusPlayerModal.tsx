import { useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  FolderPlus,
  Music,
  Radio,
  X,
  Disc3,
  BookmarkCheck,
} from "lucide-react";
import { useFocusPlayerStore } from "../../core/focus/useFocusPlayerStore";
import { useFocusStore } from "../../core/focus/useFocusStore";

export function FocusPlayerModal() {
  const {
    isPlayerModalOpen,
    setPlayerModalOpen,
    isPlaying,
    currentTrack,
    currentPlaylistId,
    playlists,
    volume,
    isMuted,
    isShuffle,
    isRepeat,
    currentTime,
    duration,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    selectPlaylist,
    profileBindings,
    bindPlaylistToProfile,
    addFolderPlaylist,
  } = useFocusPlayerStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profiles = useFocusStore((s) => s.profiles);

  if (!isPlayerModalOpen) return null;

  const currentPl = playlists.find((p) => p.id === currentPlaylistId) || playlists[0];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles: Array<{ name: string; url: string; size: number }> = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f.name)) {
        audioFiles.push({
          name: f.name,
          url: URL.createObjectURL(f),
          size: f.size,
        });
      }
    }

    if (audioFiles.length > 0) {
      addFolderPlaylist("Imported Music Folder", "Local Device Folder", audioFiles);
    }
  };

  return (
    <div className="fixed inset-0 z-[10015] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#12141f] border border-[var(--forge-border)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--forge-border)] bg-[#151827]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/30 shadow-inner">
              <Disc3 size={18} className={isPlaying ? "animate-spin" : ""} style={{ animationDuration: "4s" }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Forge Focus Player</h2>
              <p className="text-[11px] text-zinc-400">Audio Environment & Autonomous Sound Engine</p>
            </div>
          </div>
          <button
            onClick={() => setPlayerModalOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Player Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Main Display / Waveform Card */}
          <div className={`p-5 rounded-2xl bg-gradient-to-br ${currentPl.coverGradient} border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between h-44`}>
            {/* Background waveform simulation */}
            <div className="absolute inset-0 flex items-center justify-around opacity-15 pointer-events-none px-4">
              {Array.from({ length: 28 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-white rounded-full transition-all duration-300"
                  style={{
                    height: isPlaying ? `${20 + Math.sin((i + Date.now() / 300) * 0.8) * 60 + 20}%` : "15%",
                  }}
                />
              ))}
            </div>

            <div className="flex items-start justify-between relative z-10">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[#FF6B00]">
                  {currentTrack?.provider.toUpperCase() || "ENGINE"} PROVIDER
                </span>
                <h3 className="text-lg font-bold text-white mt-1 drop-shadow-sm truncate max-w-md">
                  {currentTrack?.title || "No Track Loaded"}
                </h3>
                <p className="text-xs text-zinc-300 font-medium">
                  {currentTrack?.artist || "Ambient Generator"}
                </p>
              </div>

              {/* Focus Profile Binding Selector */}
              <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-[11px]">
                <BookmarkCheck size={12} className="text-[#FF6B00]" />
                <span className="text-zinc-400">Bind to:</span>
                <select
                  value={Object.entries(profileBindings).find(([_, pId]) => pId === currentPl.id)?.[0] || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      bindPlaylistToProfile(e.target.value, currentPl.id);
                    }
                  }}
                  className="bg-transparent text-white font-medium outline-none text-[11px] cursor-pointer"
                >
                  <option value="" className="bg-[#151827]">None</option>
                  {Object.values(profiles).map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#151827]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrub Bar */}
            <div className="space-y-1 relative z-10">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-300">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleShuffle}
                title="Shuffle"
                className={`p-2 rounded-lg transition-colors ${
                  isShuffle ? "text-[#FF6B00] bg-[#FF6B00]/10" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Shuffle size={15} />
              </button>
              <button
                onClick={cycleRepeat}
                title={`Repeat: ${isRepeat}`}
                className={`p-2 rounded-lg transition-colors ${
                  isRepeat !== "none" ? "text-[#FF6B00] bg-[#FF6B00]/10" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Repeat size={15} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={previousTrack}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <SkipBack size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="w-13 h-13 rounded-full bg-[#FF6B00] hover:bg-[#FF8533] text-white flex items-center justify-center shadow-lg shadow-[#FF6B00]/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
              </button>
              <button
                onClick={nextTrack}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <SkipForward size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 w-32">
              <button onClick={toggleMute} className="text-zinc-400 hover:text-white">
                {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
              />
            </div>
          </div>

          {/* Playlist Tabs & Folder Importer */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Focus Soundscapes & Playlists
              </h4>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  onChange={handleFolderSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs border border-white/10 transition-colors"
                >
                  <FolderPlus size={12} className="text-[#FF6B00]" />
                  <span>Scan Local Folder</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => selectPlaylist(pl.id, true)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentPlaylistId === pl.id
                      ? "border-[#FF6B00] bg-[#FF6B00]/10 shadow-sm"
                      : "border-[var(--forge-border)] bg-[var(--forge-input)] hover:bg-[var(--forge-hover)]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                    {pl.provider === "local" ? <Radio size={12} className="text-blue-400 shrink-0" /> : <Music size={12} className="text-[#FF6B00] shrink-0" />}
                    <span className="truncate">{pl.name}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">
                    {pl.description}
                  </p>
                  <span className="text-[9px] font-mono text-zinc-500 mt-2 block">
                    {pl.tracks.length} tracks
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
