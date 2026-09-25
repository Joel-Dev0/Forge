import { useState, useRef, useEffect } from "react";
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
  Plus,
  Globe,
  Sparkles,
  Trash2,
  ExternalLink,
  Headphones,
  Check,
  HardDrive,
  UploadCloud,
  FileAudio,
  CheckCircle2,
  Download,
} from "lucide-react";
import { useFocusPlayerStore } from "../../core/focus/useFocusPlayerStore";
import { useFocusStore } from "../../core/focus/useFocusStore";
import { parseOnlineMusicUrl, type ParsedOnlineMedia } from "../../core/focus/onlineMusicParser";
import { CURATED_ONLINE_STATIONS, type CuratedOnlineStation } from "../../core/focus/focusPresets";
import type { SoundProviderType, FocusTrack } from "../../core/focus/focusPlayerTypes";

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
    play,
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
    addOnlineTrack,
    addCustomPlaylist,
    addCuratedStation,
    removeTrack,
    removePlaylist,
    addFolderPlaylist,
    addLocalTrack,
    addMultipleLocalTracks,
    cacheTrackLocally,
  } = useFocusPlayerStore();

  const [activeTab, setActiveTab] = useState<"player" | "add_online" | "explore" | "add_local">("player");
  const [onlineUrlInput, setOnlineUrlInput] = useState("");
  const [onlineTitleInput, setOnlineTitleInput] = useState("");
  const [onlineArtistInput, setOnlineArtistInput] = useState("");
  const [onlineCategory, setOnlineCategory] = useState<ParsedOnlineMedia["category"]>("lofi");
  const [detectedMedia, setDetectedMedia] = useState<ParsedOnlineMedia | null>(null);
  const [addedNotification, setAddedNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [pendingLocalFiles, setPendingLocalFiles] = useState<
    Array<{ file: File; id: string; title: string; artist: string; size: number }>
  >([]);
  const [targetLocalPlaylistId, setTargetLocalPlaylistId] = useState<string>("auto");
  const [newPlaylistName, setNewPlaylistName] = useState<string>("");
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const profiles = useFocusStore((s) => s.profiles);

  // Parse online URL on input change
  useEffect(() => {
    if (!onlineUrlInput.trim()) {
      setDetectedMedia(null);
      return;
    }
    const parsed = parseOnlineMusicUrl(
      onlineUrlInput,
      onlineTitleInput || undefined,
      onlineArtistInput || undefined,
      onlineCategory
    );
    setDetectedMedia(parsed);
  }, [onlineUrlInput, onlineTitleInput, onlineArtistInput, onlineCategory]);

  const currentPl = playlists.find((p) => p.id === currentPlaylistId) || playlists[0];

  const formatTime = (secs: number) => {
    if (secs === 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleAddOnlineMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectedMedia) return;

    addOnlineTrack({
      title: detectedMedia.title,
      artist: detectedMedia.artist,
      durationSeconds: detectedMedia.durationSeconds,
      provider: detectedMedia.provider,
      sourceUrl: detectedMedia.sourceUrl,
      embedUrl: detectedMedia.embedUrl,
      coverArt: detectedMedia.coverArt,
      category: detectedMedia.category,
    });

    setAddedNotification(`Added "${detectedMedia.title}" to your streams!`);
    setTimeout(() => setAddedNotification(null), 3500);

    setOnlineUrlInput("");
    setOnlineTitleInput("");
    setOnlineArtistInput("");
    setDetectedMedia(null);
    setActiveTab("player");
  };

  const handlePlayCurated = (station: CuratedOnlineStation) => {
    addCuratedStation(station);
    setAddedNotification(`Playing ${station.title}`);
    setTimeout(() => setAddedNotification(null), 3500);
    setActiveTab("player");
  };

  const handleLocalFilesSelected = (filesList: FileList | File[]) => {
    const valid: Array<{ file: File; id: string; title: string; artist: string; size: number }> = [];
    for (let i = 0; i < filesList.length; i++) {
      const f = filesList[i];
      if (f.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a|aac|opus|weba)$/i.test(f.name)) {
        const cleanName = f.name.replace(/\.[^/.]+$/, "");
        valid.push({
          file: f,
          id: `pending-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          title: cleanName,
          artist: "Local Device Audio",
          size: f.size,
        });
      }
    }
    if (valid.length > 0) {
      setPendingLocalFiles((prev) => [...prev, ...valid]);
      setActiveTab("add_local");
    }
  };

  const handleSavePendingLocalSongs = async () => {
    if (pendingLocalFiles.length === 0) return;
    setIsSavingLocal(true);

    try {
      let targetPlId = targetLocalPlaylistId === "auto" ? undefined : targetLocalPlaylistId;
      if (targetLocalPlaylistId === "new") {
        const newPl = addCustomPlaylist(newPlaylistName || "My Local Songs", "Custom local offline tracks", "local");
        targetPlId = newPl.id;
      }

      const filesToSave = pendingLocalFiles.map((p) => ({
        file: p.file,
        name: p.title || p.file.name,
      }));

      const added = await addMultipleLocalTracks(filesToSave, targetPlId, newPlaylistName);
      setPendingLocalFiles([]);
      setNewPlaylistName("");
      setAddedNotification(`Successfully saved ${added.length} songs to your local library!`);
      setTimeout(() => setAddedNotification(null), 4000);
      setActiveTab("player");
    } catch (err) {
      console.error("Failed saving local songs:", err);
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles: Array<{ name: string; url: string; size: number; rawFile?: File }> = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith("audio/") || /\.(mp3|wav|flac|ogg|m4a|aac|opus)$/i.test(f.name)) {
        audioFiles.push({
          name: f.name,
          url: URL.createObjectURL(f),
          size: f.size,
          rawFile: f,
        });
      }
    }

    if (audioFiles.length > 0) {
      setIsSavingLocal(true);
      await addFolderPlaylist("Imported Music Folder", "Local Device Folder", audioFiles);
      setIsSavingLocal(false);
      setAddedNotification(`Saved ${audioFiles.length} local tracks permanently to offline storage!`);
      setTimeout(() => setAddedNotification(null), 4000);
      setActiveTab("player");
    }
  };

  const handleCacheOnlineTrack = async (trk: FocusTrack) => {
    setAddedNotification(`Saving "${trk.title}" offline to local storage...`);
    const success = await cacheTrackLocally(currentPl.id, trk.id);
    if (success) {
      setAddedNotification(`Successfully saved "${trk.title}" offline!`);
    } else {
      setAddedNotification(`Could not download stream for offline caching.`);
    }
    setTimeout(() => setAddedNotification(null), 4000);
  };

  const renderProviderBadge = (provider?: SoundProviderType, isOffline?: boolean) => {
    switch (provider) {
      case "local":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <HardDrive size={10} />
            {isOffline ? "Offline Saved" : "Local Audio"}
          </span>
        );
      case "youtube":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            YouTube
          </span>
        );
      case "spotify":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Spotify
          </span>
        );
      case "soundcloud":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            SoundCloud
          </span>
        );
      case "stream":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Radio size={10} />
            {isOffline ? "Cached Offline" : "Web Radio"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Acoustic / Local
          </span>
        );
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[10015] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-200 ${
        isPlayerModalOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none -z-50"
      }`}
      onClick={() => setPlayerModalOpen(false)}
    >
      <div
        className="bg-[#12141f] border border-[var(--forge-border)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-white font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--forge-border)] bg-[#151827]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center border border-[#FF6B00]/30 shadow-inner">
              <Disc3
                size={18}
                className={isPlaying ? "animate-spin" : ""}
                style={{ animationDuration: "4s" }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">Forge Focus Music & Radios</h2>
                {renderProviderBadge(currentTrack?.provider)}
              </div>
              <p className="text-[11px] text-zinc-400">
                Online streams from YouTube, Spotify, Web Radio, and offline soundscapes
              </p>
            </div>
          </div>

          <button
            onClick={() => setPlayerModalOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 border-b border-[var(--forge-border)] bg-[#12141f] text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("player")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "player"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Headphones size={13} />
            <span>Now Playing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("add_local")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "add_local"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <HardDrive size={13} />
            <span>Add Local Songs</span>
            {pendingLocalFiles.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-black text-[9px] font-bold flex items-center justify-center">
                {pendingLocalFiles.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("add_online")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "add_online"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Globe size={13} />
            <span>Add Online Stream</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === "explore"
                ? "border-[#FF6B00] text-[#FF6B00]"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Sparkles size={13} />
            <span>Curated Radios</span>
          </button>
        </div>

        {/* Notification Banner */}
        {addedNotification && (
          <div className="mx-6 mt-3 px-3.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Check size={14} />
            <span>{addedNotification}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* TAB 1: PLAYER */}
          {activeTab === "player" && (
            <div className="space-y-6">
              {/* Media Card Display */}
              <div
                className={`rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col justify-between ${
                  currentTrack?.provider === "youtube"
                    ? "bg-black"
                    : currentTrack?.provider === "spotify"
                    ? "bg-[#181818]"
                    : `bg-gradient-to-br ${currentPl.coverGradient}`
                }`}
              >
                {/* Embed View for YouTube */}
                {currentTrack?.provider === "youtube" && currentTrack.embedUrl && (
                  <div className="relative w-full aspect-video max-h-56 bg-black flex items-center justify-center">
                    <iframe
                      src={currentTrack.embedUrl}
                      title={currentTrack.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Embed View for Spotify */}
                {currentTrack?.provider === "spotify" && currentTrack.embedUrl && (
                  <div className="p-4 bg-[#121212] flex flex-col items-center justify-center">
                    <iframe
                      src={currentTrack.embedUrl}
                      title={currentTrack.title}
                      className="w-full h-[152px] rounded-xl border-0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Embed View for SoundCloud */}
                {currentTrack?.provider === "soundcloud" && currentTrack.embedUrl && (
                  <div className="p-4 bg-zinc-950 flex flex-col items-center justify-center">
                    <iframe
                      src={currentTrack.embedUrl}
                      title={currentTrack.title}
                      className="w-full h-[150px] border-0"
                      allow="autoplay"
                    />
                  </div>
                )}

                {/* Direct Stream or Local Acoustic Waveform Card */}
                {(currentTrack?.provider === "stream" ||
                  currentTrack?.provider === "local" ||
                  !currentTrack?.embedUrl) && (
                  <div className="p-5 h-44 relative flex flex-col justify-between overflow-hidden">
                    {/* Background Waveform Animation */}
                    <div className="absolute inset-0 flex items-center justify-around opacity-15 pointer-events-none px-4">
                      {Array.from({ length: 28 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-white rounded-full transition-all duration-300"
                          style={{
                            height: isPlaying
                              ? `${20 + Math.sin((i + Date.now() / 300) * 0.8) * 60 + 20}%`
                              : "15%",
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {renderProviderBadge(currentTrack?.provider)}
                          {currentTrack?.category && (
                            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                              • {currentTrack.category}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-white drop-shadow-sm truncate max-w-md">
                          {currentTrack?.title || "No Track Loaded"}
                        </h3>
                        <p className="text-xs text-zinc-300 font-medium">
                          {currentTrack?.artist || "Ambient Soundscape"}
                        </p>
                      </div>

                      {/* Focus Profile Binding Selector */}
                      <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-[11px]">
                        <BookmarkCheck size={12} className="text-[#FF6B00]" />
                        <span className="text-zinc-400">Bind to:</span>
                        <select
                          value={
                            Object.entries(profileBindings).find(([_, pId]) => pId === currentPl.id)?.[0] || ""
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              bindPlaylistToProfile(e.target.value, currentPl.id);
                            }
                          }}
                          className="bg-transparent text-white font-medium outline-none text-[11px] cursor-pointer"
                        >
                          <option value="" className="bg-[#151827]">
                            None
                          </option>
                          {Object.values(profiles).map((p) => (
                            <option key={p.id} value={p.id} className="bg-[#151827]">
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Scrub Bar / Live Status */}
                    <div className="space-y-1 relative z-10">
                      {duration === 0 || currentTrack?.provider === "stream" ? (
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-cyan-400 font-bold font-mono text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            LIVE INTERNET STREAM
                          </span>
                          <span className="text-zinc-400 text-[10px] font-mono">Continuous Playback</span>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Transport Controls */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleShuffle}
                    title="Shuffle"
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
                      isShuffle ? "text-[#FF6B00] bg-[#FF6B00]/10" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Shuffle size={15} />
                  </button>
                  <button
                    onClick={cycleRepeat}
                    title={`Repeat: ${isRepeat}`}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${
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
                    className="w-12 h-12 rounded-full bg-[#FF6B00] hover:bg-[#FF8533] text-white flex items-center justify-center shadow-lg shadow-[#FF6B00]/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>
                  <button
                    onClick={nextTrack}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    <SkipForward size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-2 w-32">
                  <button onClick={toggleMute} className="text-zinc-400 hover:text-white cursor-pointer">
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

              {/* Playlists Grid & Actions */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Soundscapes & Playlists
                  </h4>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("add_local")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs border border-emerald-500/30 transition-colors font-bold cursor-pointer"
                    >
                      <HardDrive size={12} />
                      <span>Add Local Songs</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("add_online")}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 text-[#FF6B00] text-xs border border-[#FF6B00]/30 transition-colors font-bold cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Online Stream</span>
                    </button>

                    <input
                      ref={folderInputRef}
                      type="file"
                      multiple
                      // @ts-ignore
                      webkitdirectory=""
                      directory=""
                      onChange={handleFolderSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs border border-white/10 transition-colors cursor-pointer"
                    >
                      <FolderPlus size={12} className="text-zinc-400" />
                      <span>Local Folder</span>
                    </button>
                  </div>
                </div>

                {/* Playlist selection cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  {playlists.map((pl) => (
                    <div
                      key={pl.id}
                      onClick={() => selectPlaylist(pl.id, true)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group ${
                        currentPlaylistId === pl.id
                          ? "border-[#FF6B00] bg-[#FF6B00]/10 shadow-sm"
                          : "border-[var(--forge-border)] bg-[var(--forge-input)] hover:bg-[var(--forge-hover)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate max-w-[140px]">
                          {pl.provider === "stream" || pl.provider === "youtube" ? (
                            <Globe size={12} className="text-[#FF6B00] shrink-0" />
                          ) : pl.provider === "spotify" ? (
                            <Music size={12} className="text-emerald-400 shrink-0" />
                          ) : (
                            <Radio size={12} className="text-blue-400 shrink-0" />
                          )}
                          <span className="truncate">{pl.name}</span>
                        </div>

                        {pl.isCustom && playlists.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePlaylist(pl.id);
                            }}
                            title="Delete custom playlist"
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity p-1 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">
                        {pl.description}
                      </p>
                      <span className="text-[9px] font-mono text-zinc-500 mt-2 block">
                        {pl.tracks.length} tracks
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tracks list for currently active playlist */}
                <div className="pt-2">
                  <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Tracks in {currentPl.name}</span>
                    <span className="text-zinc-500 font-mono text-[10px]">
                      {currentPl.tracks.length} items
                    </span>
                  </h5>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {currentPl.tracks.map((trk) => {
                      const isTrackActive = currentTrack?.id === trk.id;
                      return (
                        <div
                          key={trk.id}
                          onClick={() => play(trk)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs ${
                            isTrackActive
                              ? "bg-[#FF6B00]/15 border border-[#FF6B00]/40 text-white font-semibold"
                              : "bg-white/5 hover:bg-white/10 text-zinc-300 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-5 flex items-center justify-center">
                              {isTrackActive && isPlaying ? (
                                <Disc3 size={14} className="text-[#FF6B00] animate-spin" />
                              ) : (
                                <Play size={12} className="text-zinc-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{trk.title}</p>
                              <p className="text-[10px] text-zinc-400 truncate">{trk.artist}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {renderProviderBadge(trk.provider, trk.isOfflineAvailable)}
                            {trk.provider === "stream" && trk.sourceUrl.startsWith("http") && !trk.storageKey && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCacheOnlineTrack(trk);
                                }}
                                className="text-zinc-500 hover:text-emerald-400 transition-colors p-1 cursor-pointer"
                                title="Save track offline to local device"
                              >
                                <Download size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTrack(currentPl.id, trk.id);
                              }}
                              className="text-zinc-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                              title="Remove track"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADD ONLINE STREAM */}
          {activeTab === "add_online" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white">Add Online Music or Live Stream</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Paste any YouTube video or playlist, Spotify track/playlist, SoundCloud audio, or direct Web Radio stream.
                </p>
              </div>

              <form onSubmit={handleAddOnlineMedia} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Online Stream or Video URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="e.g. https://www.youtube.com/watch?v=..., https://open.spotify.com/..., or audio stream URL"
                    value={onlineUrlInput}
                    onChange={(e) => setOnlineUrlInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] text-white text-xs focus:border-[#FF6B00] outline-none transition-colors"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Supported: YouTube (Live, Video, Playlists), Spotify (Playlists, Tracks, Albums), SoundCloud, Web Radios (.mp3, Shoutcast, Icecast).
                  </p>
                </div>

                {/* Live Detected Preview Box */}
                {detectedMedia && (
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-3">
                      {detectedMedia.coverArt ? (
                        <img
                          src={detectedMedia.coverArt}
                          alt="Cover"
                          className="w-12 h-12 rounded-lg object-cover border border-white/10 shadow"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/20 text-[#FF6B00] flex items-center justify-center font-bold">
                          <Globe size={20} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{detectedMedia.title}</span>
                          {renderProviderBadge(detectedMedia.provider)}
                        </div>
                        <p className="text-[11px] text-zinc-400">{detectedMedia.artist}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Custom Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lofi Coding Session"
                      value={onlineTitleInput}
                      onChange={(e) => setOnlineTitleInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] text-white text-xs focus:border-[#FF6B00] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Artist or Channel (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lofi Girl / Chillhop"
                      value={onlineArtistInput}
                      onChange={(e) => setOnlineArtistInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] text-white text-xs focus:border-[#FF6B00] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Music Category
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["lofi", "ambient", "classical", "binaural", "radio", "custom"] as const).map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setOnlineCategory(cat)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium capitalize border transition-all cursor-pointer ${
                          onlineCategory === cat
                            ? "bg-[#FF6B00] border-[#FF6B00] text-white"
                            : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!detectedMedia}
                    className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    <span>Add Track & Play Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("player")}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: EXPLORE CURATED STATIONS */}
          {activeTab === "explore" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Curated Focus Broadcasts</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Popular 24/7 internet radio stations, iconic YouTube study streams, and Spotify focus playlists.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CURATED_ONLINE_STATIONS.map((station) => (
                  <div
                    key={station.id}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#FF6B00]/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        {renderProviderBadge(station.provider)}
                        <span className="text-[10px] font-mono uppercase text-zinc-500">
                          {station.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-snug">{station.title}</h4>
                      <p className="text-[11px] text-zinc-400 mt-1">{station.tagline}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => handlePlayCurated(station)}
                        className="flex-1 py-1.5 rounded-lg bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Play Now</span>
                      </button>
                      <a
                        href={station.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Source Link"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ADD LOCAL AUDIO & SONGS (PERSISTENT INDEXEDDB) */}
          {activeTab === "add_local" && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Import & Save Local Songs</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <HardDrive size={10} />
                    Permanent Offline Storage
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Save audio files (MP3, WAV, FLAC, OGG, M4A, AAC) directly into Forge's permanent offline database. Your songs stay preserved across browser restarts and offline sessions, just like online and Spotify streams.
                </p>
              </div>

              {/* Drag and drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFiles(true);
                }}
                onDragLeave={() => setIsDraggingFiles(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFiles(false);
                  if (e.dataTransfer.files) {
                    handleLocalFilesSelected(e.dataTransfer.files);
                  }
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 ${
                  isDraggingFiles
                    ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
                    : "border-white/15 bg-white/5 hover:border-white/25"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                  <UploadCloud size={24} />
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white">Drag & drop your local songs here</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Supports .mp3, .wav, .flac, .ogg, .m4a, .aac, or select whole folders
                  </p>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <input
                    ref={singleFileInputRef}
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus"
                    className="hidden"
                    onChange={(e) => e.target.files && handleLocalFilesSelected(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => singleFileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <FileAudio size={14} />
                    <span>Browse Song Files</span>
                  </button>

                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    className="hidden"
                    onChange={handleFolderSelect}
                  />
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs font-medium border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <FolderPlus size={14} />
                    <span>Select Music Folder</span>
                  </button>
                </div>
              </div>

              {/* Pending Files Queue */}
              {pendingLocalFiles.length > 0 ? (
                <div className="space-y-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Ready to Save</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {pendingLocalFiles.length} {pendingLocalFiles.length === 1 ? "track" : "tracks"}
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Total size: {(pendingLocalFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPendingLocalFiles([])}
                      className="text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  {/* Destination Playlist Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1">
                        Save Into Playlist
                      </label>
                      <select
                        value={targetLocalPlaylistId}
                        onChange={(e) => setTargetLocalPlaylistId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] text-white text-xs focus:border-[#FF6B00] outline-none"
                      >
                        <option value="auto">⭐ Local Music Library (Default)</option>
                        {playlists.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name} ({pl.tracks.length} tracks)
                          </option>
                        ))}
                        <option value="new">➕ Create New Playlist...</option>
                      </select>
                    </div>

                    {targetLocalPlaylistId === "new" && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1">
                          New Playlist Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. My Offline Hits"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--forge-input)] border border-[var(--forge-border)] text-white text-xs focus:border-[#FF6B00] outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Scrollable list of pending tracks with editable title */}
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {pendingLocalFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Music size={14} className="text-emerald-400 shrink-0" />
                          <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPendingLocalFiles((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, title: val } : p))
                                );
                              }}
                              placeholder="Track title"
                              className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs truncate focus:border-emerald-500 outline-none"
                            />
                            <input
                              type="text"
                              value={item.artist}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPendingLocalFiles((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, artist: val } : p))
                                );
                              }}
                              placeholder="Artist name"
                              className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 text-xs truncate focus:border-emerald-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {(item.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingLocalFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Save button */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSavingLocal}
                      onClick={handleSavePendingLocalSongs}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSavingLocal ? (
                        <>
                          <Disc3 size={15} className="animate-spin" />
                          <span>Saving to Offline Database...</span>
                        </>
                      ) : (
                        <>
                          <HardDrive size={15} />
                          <span>Save {pendingLocalFiles.length} Songs to Forge & Play Now</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("player")}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>
                      Forge uses persistent IndexedDB to store audio data locally.
                      Once saved, your songs stay permanently available even when restarting or offline, just like web & Spotify streams.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--forge-border)] bg-[#151827] flex items-center justify-between text-xs text-zinc-400">
          <span>Audio plays continuously in the background across browser tabs.</span>
          <button
            type="button"
            onClick={() => setPlayerModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
