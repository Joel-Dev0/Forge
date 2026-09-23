import { create } from "zustand";
import type { FocusPlaylist, FocusTrack, SoundProviderType } from "./focusPlayerTypes";
import { type CuratedOnlineStation, stationToFocusTrack } from "./focusPresets";

interface FocusPlayerState {
  isPlaying: boolean;
  currentTrack: FocusTrack | null;
  currentPlaylistId: string;
  playlists: FocusPlaylist[];
  volume: number; // 0 to 1
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: "none" | "all" | "one";
  currentTime: number;
  duration: number;
  activeProvider: SoundProviderType;
  isPlayerModalOpen: boolean;

  // Focus Profile Bindings (profileId -> playlistId)
  profileBindings: Record<string, string>;

  // Actions
  play: (track?: FocusTrack) => void;
  pause: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  seek: (timeSeconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  selectPlaylist: (playlistId: string, autoPlayFirst?: boolean) => void;
  setPlayerModalOpen: (open: boolean) => void;

  // Profile Auto-Play Binding
  bindPlaylistToProfile: (profileId: string, playlistId: string) => void;
  triggerProfileAutoPlay: (profileId: string) => void;

  // Online Music & Stream Management
  addOnlineTrack: (track: Omit<FocusTrack, "id">, targetPlaylistId?: string) => FocusTrack;
  addCustomPlaylist: (name: string, description: string, provider: SoundProviderType) => FocusPlaylist;
  removeTrack: (playlistId: string, trackId: string) => void;
  removePlaylist: (playlistId: string) => void;
  addCuratedStation: (station: CuratedOnlineStation) => FocusTrack;

  // Local Folder Importer
  addFolderPlaylist: (name: string, folderPath: string, files: Array<{ name: string; url: string; size: number }>) => void;
}

const STORAGE_KEY = "forge_focus_player_v2";

const DEFAULT_PLAYLISTS: FocusPlaylist[] = [
  {
    id: "playlist-online-curated",
    name: "Online Focus Streams",
    description: "Curated 24/7 internet radio, lofi streams, and deep study broadcasts",
    provider: "stream",
    coverGradient: "from-amber-500/30 via-orange-600/30 to-red-700/30",
    tracks: [
      {
        id: "stream-somafm-groove",
        title: "SomaFM Groove Salad",
        artist: "SomaFM (128k Chillout)",
        durationSeconds: 0,
        provider: "stream",
        sourceUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
        embedUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
        category: "ambient",
      },
      {
        id: "stream-somafm-drone",
        title: "SomaFM Drone Zone",
        artist: "SomaFM (Atmospheric)",
        durationSeconds: 0,
        provider: "stream",
        sourceUrl: "https://ice1.somafm.com/dronezone-128-mp3",
        embedUrl: "https://ice1.somafm.com/dronezone-128-mp3",
        category: "ambient",
      },
      {
        id: "yt-lofigirl",
        title: "Lofi Girl — beats to relax/study to",
        artist: "Lofi Girl 24/7",
        durationSeconds: 1800,
        provider: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
        embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1",
        coverArt: "https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg",
        category: "lofi",
      },
      {
        id: "yt-synthwave",
        title: "Synthwave Radio — Chill Synth",
        artist: "Lofi Girl Synthwave",
        durationSeconds: 1800,
        provider: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
        embedUrl: "https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=1&enablejsapi=1",
        coverArt: "https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg",
        category: "lofi",
      },
      {
        id: "sp-deepfocus",
        title: "Deep Focus Playlist",
        artist: "Spotify Curated",
        durationSeconds: 240,
        provider: "spotify",
        sourceUrl: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
        embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
        category: "ambient",
      },
    ],
  },
  {
    id: "playlist-lofi",
    name: "Lofi Chill Beats",
    description: "Gentle rhythmic chill beats engineered for steady code sessions",
    provider: "local",
    coverGradient: "from-amber-600/30 to-orange-700/30",
    tracks: [
      {
        id: "lofi-1",
        title: "Midnight Tokyo Study Session",
        artist: "Forge Audio Lab",
        durationSeconds: 185,
        provider: "local",
        sourceUrl: "synth://ambient-brown",
        category: "lofi",
      },
      {
        id: "lofi-2",
        title: "Coffee & Code Routine",
        artist: "Forge Audio Lab",
        durationSeconds: 210,
        provider: "local",
        sourceUrl: "synth://ambient-brown",
        category: "lofi",
      },
    ],
  },
  {
    id: "playlist-binaural",
    name: "40Hz Gamma Concentration",
    description: "Pure acoustic binaural beats tuned for hyperfocus and problem solving",
    provider: "local",
    coverGradient: "from-blue-600/30 to-indigo-800/30",
    tracks: [
      {
        id: "binaural-1",
        title: "40Hz Gamma Deep Architecture",
        artist: "NeuroAcoustic Engine",
        durationSeconds: 300,
        provider: "local",
        sourceUrl: "synth://binaural-40hz",
        category: "binaural",
      },
      {
        id: "binaural-2",
        title: "Theta 6Hz Flow State",
        artist: "NeuroAcoustic Engine",
        durationSeconds: 270,
        provider: "local",
        sourceUrl: "synth://binaural-theta",
        category: "binaural",
      },
      {
        id: "binaural-3",
        title: "Brown Noise Shielding",
        artist: "Forge Soundscape",
        durationSeconds: 360,
        provider: "local",
        sourceUrl: "synth://brown-noise",
        category: "ambient",
      },
    ],
  },
];

// Audio element & Web Audio context singleton
let globalAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let synthOsc: OscillatorNode | null = null;
let synthGain: GainNode | null = null;

function getOrCreateAudio(): HTMLAudioElement {
  if (!globalAudio && typeof Audio !== "undefined") {
    globalAudio = new Audio();
    globalAudio.crossOrigin = "anonymous";
    globalAudio.preload = "auto";
  }
  return globalAudio!;
}

function startAmbientSynth(type: string, volume: number) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    stopAmbientSynth();

    synthGain = audioCtx.createGain();
    synthGain.gain.setValueAtTime(volume * 0.15, audioCtx.currentTime);
    synthGain.connect(audioCtx.destination);

    if (type.includes("40hz") || type.includes("gamma")) {
      synthOsc = audioCtx.createOscillator();
      synthOsc.type = "sine";
      synthOsc.frequency.setValueAtTime(220, audioCtx.currentTime);
      synthOsc.connect(synthGain);
      synthOsc.start();
    } else {
      // White/Brown noise buffer
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise filter
        lastOut = output[i];
        output[i] *= 3.5;
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      whiteNoise.connect(synthGain);
      whiteNoise.start();
    }
  } catch (err) {
    console.warn("[FocusPlayer] Web Audio Ambient generator fallback:", err);
  }
}

function stopAmbientSynth() {
  try {
    if (synthOsc) {
      synthOsc.stop();
      synthOsc.disconnect();
      synthOsc = null;
    }
    if (synthGain) {
      synthGain.disconnect();
      synthGain = null;
    }
  } catch {}
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    volume: 0.75,
    isMuted: false,
    isShuffle: false,
    isRepeat: "none" as const,
    profileBindings: {
      deep_work: "playlist-binaural",
      study: "playlist-online-curated",
      minimal: "playlist-lofi",
    },
    customPlaylists: [] as FocusPlaylist[],
  };
}

const saved = loadSavedState();

// Initialize combined playlists with defaults + stored custom playlists
const initialPlaylists: FocusPlaylist[] = [...DEFAULT_PLAYLISTS];
if (Array.isArray(saved.customPlaylists)) {
  for (const cp of saved.customPlaylists) {
    if (!initialPlaylists.some((p) => p.id === cp.id)) {
      initialPlaylists.push(cp);
    }
  }
}

function persistStore(
  volume: number,
  isMuted: boolean,
  isShuffle: boolean,
  isRepeat: "none" | "all" | "one",
  profileBindings: Record<string, string>,
  playlists: FocusPlaylist[]
) {
  try {
    const customPlaylists = playlists.filter(
      (p) => !DEFAULT_PLAYLISTS.some((dp) => dp.id === p.id) || p.isFolderBacked || p.isCustom
    );
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        volume,
        isMuted,
        isShuffle,
        isRepeat,
        profileBindings,
        customPlaylists,
      })
    );
  } catch {}
}

export const useFocusPlayerStore = create<FocusPlayerState>((set, get) => ({
  isPlaying: false,
  currentTrack: initialPlaylists[0].tracks[0] || null,
  currentPlaylistId: initialPlaylists[0].id,
  playlists: initialPlaylists,
  volume: saved.volume ?? 0.75,
  isMuted: saved.isMuted ?? false,
  isShuffle: saved.isShuffle ?? false,
  isRepeat: saved.isRepeat ?? "none",
  currentTime: 0,
  duration: initialPlaylists[0].tracks[0]?.durationSeconds || 300,
  activeProvider: initialPlaylists[0].tracks[0]?.provider || "stream",
  isPlayerModalOpen: false,
  profileBindings: saved.profileBindings || {
    deep_work: "playlist-binaural",
    study: "playlist-online-curated",
    minimal: "playlist-lofi",
  },

  play: (track) => {
    const target = track || get().currentTrack || get().playlists[0]?.tracks[0];
    if (!target) return;

    set({
      currentTrack: target,
      isPlaying: true,
      activeProvider: target.provider,
      duration: target.durationSeconds || 0,
      currentTime: 0,
    });

    const effectiveVol = get().isMuted ? 0 : get().volume;

    // Direct streams or local audio files
    if (target.provider === "stream" || (target.provider === "local" && !target.sourceUrl.startsWith("synth://"))) {
      stopAmbientSynth();
      const audio = getOrCreateAudio();
      if (audio.src !== target.sourceUrl) {
        audio.src = target.sourceUrl;
      }
      audio.volume = effectiveVol;
      audio.play().catch((err) => {
        console.warn("[FocusPlayer] HTML5 audio playback notification:", err);
      });
    } else if (target.sourceUrl.startsWith("synth://") || target.sourceUrl.startsWith("ambient://")) {
      if (globalAudio) globalAudio.pause();
      startAmbientSynth(target.sourceUrl, effectiveVol);
    } else {
      // YouTube, Spotify, SoundCloud iframe providers
      stopAmbientSynth();
      if (globalAudio) globalAudio.pause();
    }

    // Interval for progress tracking
    if (typeof window !== "undefined") {
      if ((window as any).__forgeFocusPlayerInterval) {
        clearInterval((window as any).__forgeFocusPlayerInterval);
      }
      (window as any).__forgeFocusPlayerInterval = setInterval(() => {
        const { isPlaying, currentTime, duration, nextTrack, isRepeat } = get();
        if (!isPlaying) return;
        if (duration > 0 && currentTime >= duration) {
          if (isRepeat === "one") {
            set({ currentTime: 0 });
          } else {
            nextTrack();
          }
        } else {
          set({ currentTime: currentTime + 1 });
        }
      }, 1000);
    }
  },

  pause: () => {
    set({ isPlaying: false });
    stopAmbientSynth();
    if (globalAudio) globalAudio.pause();
    if (typeof window !== "undefined" && (window as any).__forgeFocusPlayerInterval) {
      clearInterval((window as any).__forgeFocusPlayerInterval);
    }
  },

  togglePlay: () => {
    if (get().isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  nextTrack: () => {
    const { playlists, currentPlaylistId, currentTrack, isShuffle, play } = get();
    const pl = playlists.find((p) => p.id === currentPlaylistId) || playlists[0];
    if (!pl || pl.tracks.length === 0) return;

    let nextIndex = 0;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * pl.tracks.length);
    } else if (currentTrack) {
      const idx = pl.tracks.findIndex((t) => t.id === currentTrack.id);
      nextIndex = (idx + 1) % pl.tracks.length;
    }

    const next = pl.tracks[nextIndex];
    set({ currentTime: 0 });
    play(next);
  },

  previousTrack: () => {
    const { playlists, currentPlaylistId, currentTrack, play } = get();
    const pl = playlists.find((p) => p.id === currentPlaylistId) || playlists[0];
    if (!pl || pl.tracks.length === 0) return;

    let prevIndex = 0;
    if (currentTrack) {
      const idx = pl.tracks.findIndex((t) => t.id === currentTrack.id);
      prevIndex = (idx - 1 + pl.tracks.length) % pl.tracks.length;
    }

    const prev = pl.tracks[prevIndex];
    set({ currentTime: 0 });
    play(prev);
  },

  seek: (timeSeconds) => {
    set({ currentTime: Math.max(0, Math.min(timeSeconds, get().duration || timeSeconds)) });
    if (globalAudio && globalAudio.duration) {
      globalAudio.currentTime = timeSeconds;
    }
  },

  setVolume: (volume) => {
    const vol = Math.max(0, Math.min(1, volume));
    set({ volume: vol, isMuted: false });
    if (globalAudio) globalAudio.volume = vol;
    if (synthGain && audioCtx) synthGain.gain.setValueAtTime(vol * 0.15, audioCtx.currentTime);

    const s = get();
    persistStore(vol, false, s.isShuffle, s.isRepeat, s.profileBindings, s.playlists);
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    set({ isMuted: nextMuted });
    const effective = nextMuted ? 0 : get().volume;
    if (globalAudio) globalAudio.volume = effective;
    if (synthGain && audioCtx) synthGain.gain.setValueAtTime(effective * 0.15, audioCtx.currentTime);
  },

  toggleShuffle: () => {
    const next = !get().isShuffle;
    set({ isShuffle: next });
    const s = get();
    persistStore(s.volume, s.isMuted, next, s.isRepeat, s.profileBindings, s.playlists);
  },

  cycleRepeat: () => {
    const cur = get().isRepeat;
    const next = cur === "none" ? "all" : cur === "all" ? "one" : "none";
    set({ isRepeat: next });
    const s = get();
    persistStore(s.volume, s.isMuted, s.isShuffle, next, s.profileBindings, s.playlists);
  },

  selectPlaylist: (playlistId, autoPlayFirst = false) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    set({ currentPlaylistId: playlistId });
    if (autoPlayFirst && pl.tracks.length > 0) {
      get().play(pl.tracks[0]);
    }
  },

  setPlayerModalOpen: (open) => set({ isPlayerModalOpen: open }),

  bindPlaylistToProfile: (profileId, playlistId) => {
    set((s) => {
      const next = { ...s.profileBindings, [profileId]: playlistId };
      persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, next, s.playlists);
      return { profileBindings: next };
    });
  },

  triggerProfileAutoPlay: (profileId) => {
    const targetPlaylistId = get().profileBindings[profileId];
    if (targetPlaylistId) {
      get().selectPlaylist(targetPlaylistId, true);
    }
  },

  // Add an online track (YouTube, Spotify, SoundCloud, or Web Radio)
  addOnlineTrack: (trackData, targetPlaylistId) => {
    const newTrack: FocusTrack = {
      ...trackData,
      id: `online-track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };

    set((s) => {
      let targetId = targetPlaylistId || s.currentPlaylistId;
      let targetPlaylist = s.playlists.find((p) => p.id === targetId);

      // If target playlist doesn't exist, use or create "Online Focus Streams"
      if (!targetPlaylist) {
        targetPlaylist = s.playlists.find((p) => p.id === "playlist-online-curated");
      }

      if (!targetPlaylist) {
        targetPlaylist = {
          id: `playlist-online-${Date.now()}`,
          name: "My Online Streams",
          description: "Custom YouTube, Spotify, and Web Radio focus streams",
          provider: newTrack.provider,
          tracks: [newTrack],
          coverGradient: "from-amber-600/30 to-rose-700/30",
          isCustom: true,
        };
        const updated = [...s.playlists, targetPlaylist];
        persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updated);
        return { playlists: updated, currentPlaylistId: targetPlaylist.id };
      }

      const updatedPlaylists = s.playlists.map((pl) => {
        if (pl.id === targetPlaylist!.id) {
          return {
            ...pl,
            tracks: [newTrack, ...pl.tracks],
          };
        }
        return pl;
      });

      persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updatedPlaylists);
      return { playlists: updatedPlaylists };
    });

    get().play(newTrack);
    return newTrack;
  },

  addCuratedStation: (station) => {
    const track = stationToFocusTrack(station);
    return get().addOnlineTrack(track, "playlist-online-curated");
  },

  addCustomPlaylist: (name, description, provider) => {
    const newPl: FocusPlaylist = {
      id: `playlist-custom-${Date.now()}`,
      name: name.trim() || "My Online Playlist",
      description: description.trim() || "User curated stream collection",
      provider,
      tracks: [],
      coverGradient: "from-fuchsia-600/30 to-purple-800/30",
      isCustom: true,
    };

    set((s) => {
      const updated = [...s.playlists, newPl];
      persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updated);
      return { playlists: updated, currentPlaylistId: newPl.id };
    });

    return newPl;
  },

  removeTrack: (playlistId, trackId) => {
    set((s) => {
      const updatedPlaylists = s.playlists.map((pl) => {
        if (pl.id === playlistId) {
          return {
            ...pl,
            tracks: pl.tracks.filter((t) => t.id !== trackId),
          };
        }
        return pl;
      });

      persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updatedPlaylists);
      return { playlists: updatedPlaylists };
    });
  },

  removePlaylist: (playlistId) => {
    set((s) => {
      const updated = s.playlists.filter((p) => p.id !== playlistId);
      const nextActiveId = updated[0]?.id || "playlist-online-curated";
      persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updated);
      return { playlists: updated, currentPlaylistId: nextActiveId };
    });
  },

  addFolderPlaylist: (name, folderPath, files) => {
    const tracks: FocusTrack[] = files.map((f, i) => ({
      id: `local-track-${Date.now()}-${i}`,
      title: f.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Storage",
      durationSeconds: 180,
      provider: "local",
      sourceUrl: f.url,
      category: "custom",
    }));

    const newPl: FocusPlaylist = {
      id: `playlist-folder-${Date.now()}`,
      name: name || "Local Music Folder",
      description: `Autodetected from ${folderPath} (${files.length} tracks)`,
      provider: "local",
      tracks,
      coverGradient: "from-emerald-600/30 to-teal-800/30",
      isFolderBacked: true,
      folderPath,
      isCustom: true,
    };

    set((s) => {
      const updated = [...s.playlists, newPl];
      persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updated);
      return { playlists: updated, currentPlaylistId: newPl.id };
    });

    if (tracks.length > 0) {
      get().play(tracks[0]);
    }
  },
}));
