import { create } from "zustand";
import type { FocusPlaylist, FocusTrack, SoundProviderType } from "./focusPlayerTypes";

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

  // Local Folder Importer
  addFolderPlaylist: (name: string, folderPath: string, files: Array<{ name: string; url: string; size: number }>) => void;
}

const STORAGE_KEY = "forge_focus_player_v1";

const DEFAULT_PLAYLISTS: FocusPlaylist[] = [
  {
    id: "playlist-lofi",
    name: "Lofi Focus Beats",
    description: "Gentle rhythmic chill beats engineered for steady code sessions",
    provider: "youtube",
    coverGradient: "from-amber-600/30 to-orange-700/30",
    tracks: [
      {
        id: "lofi-1",
        title: "Midnight Tokyo Study Session",
        artist: "Forge Audio Lab",
        durationSeconds: 185,
        provider: "youtube",
        sourceUrl: "ambient://lofi-midnight",
        category: "lofi",
      },
      {
        id: "lofi-2",
        title: "Coffee & Code Routine",
        artist: "Forge Audio Lab",
        durationSeconds: 210,
        provider: "youtube",
        sourceUrl: "ambient://lofi-coffee",
        category: "lofi",
      },
      {
        id: "lofi-3",
        title: "Rain on Windowpane",
        artist: "Ambient Forge",
        durationSeconds: 240,
        provider: "youtube",
        sourceUrl: "ambient://lofi-rain",
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
  {
    id: "playlist-classical",
    name: "Baroque Algorithm",
    description: "Structured classical compositions known to stimulate analytical cognition",
    provider: "spotify",
    coverGradient: "from-purple-600/30 to-rose-800/30",
    tracks: [
      {
        id: "classical-1",
        title: "Goldberg Variations, BWV 988",
        artist: "J.S. Bach (Forge Acoustic)",
        durationSeconds: 240,
        provider: "spotify",
        sourceUrl: "synth://classical-bach",
        category: "classical",
      },
      {
        id: "classical-2",
        title: "Clair de Lune (Nocturne)",
        artist: "Claude Debussy",
        durationSeconds: 290,
        provider: "spotify",
        sourceUrl: "synth://classical-debussy",
        category: "classical",
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
      study: "playlist-lofi",
      minimal: "playlist-classical",
    },
  };
}

const saved = loadSavedState();

export const useFocusPlayerStore = create<FocusPlayerState>((set, get) => ({
  isPlaying: false,
  currentTrack: DEFAULT_PLAYLISTS[0].tracks[0],
  currentPlaylistId: DEFAULT_PLAYLISTS[0].id,
  playlists: DEFAULT_PLAYLISTS,
  volume: saved.volume ?? 0.75,
  isMuted: saved.isMuted ?? false,
  isShuffle: saved.isShuffle ?? false,
  isRepeat: saved.isRepeat ?? "none",
  currentTime: 0,
  duration: DEFAULT_PLAYLISTS[0].tracks[0].durationSeconds,
  activeProvider: DEFAULT_PLAYLISTS[0].provider,
  isPlayerModalOpen: false,
  profileBindings: saved.profileBindings || {
    deep_work: "playlist-binaural",
    study: "playlist-lofi",
    minimal: "playlist-classical",
  },

  play: (track) => {
    const target = track || get().currentTrack || get().playlists[0]?.tracks[0];
    if (!target) return;

    set({ currentTrack: target, isPlaying: true, activeProvider: target.provider, duration: target.durationSeconds });

    const effectiveVol = get().isMuted ? 0 : get().volume;

    if (target.sourceUrl.startsWith("synth://") || target.sourceUrl.startsWith("ambient://")) {
      startAmbientSynth(target.sourceUrl, effectiveVol);
    } else {
      const audio = getOrCreateAudio();
      audio.src = target.sourceUrl;
      audio.volume = effectiveVol;
      audio.play().catch(() => {});
    }

    // Set up timer simulation for duration tracking
    if (typeof window !== "undefined") {
      (window as any).__forgeFocusPlayerInterval = setInterval(() => {
        const { isPlaying, currentTime, duration, nextTrack, isRepeat } = get();
        if (!isPlaying) return;
        if (currentTime >= duration) {
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
    set({ currentTime: Math.max(0, Math.min(timeSeconds, get().duration)) });
    if (globalAudio && globalAudio.duration) {
      globalAudio.currentTime = timeSeconds;
    }
  },

  setVolume: (volume) => {
    const vol = Math.max(0, Math.min(1, volume));
    set({ volume: vol, isMuted: false });
    if (globalAudio) globalAudio.volume = vol;
    if (synthGain && audioCtx) synthGain.gain.setValueAtTime(vol * 0.15, audioCtx.currentTime);
    try {
      const state = loadSavedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, volume: vol, isMuted: false }));
    } catch {}
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
    try {
      const state = loadSavedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, isShuffle: next }));
    } catch {}
  },

  cycleRepeat: () => {
    const cur = get().isRepeat;
    const next = cur === "none" ? "all" : cur === "all" ? "one" : "none";
    set({ isRepeat: next });
    try {
      const state = loadSavedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, isRepeat: next }));
    } catch {}
  },

  selectPlaylist: (playlistId, autoPlayFirst = false) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    set({ currentPlaylistId: playlistId, activeProvider: pl.provider });
    if (autoPlayFirst && pl.tracks.length > 0) {
      get().play(pl.tracks[0]);
    }
  },

  setPlayerModalOpen: (open) => set({ isPlayerModalOpen: open }),

  bindPlaylistToProfile: (profileId, playlistId) => {
    set((s) => {
      const next = { ...s.profileBindings, [profileId]: playlistId };
      try {
        const state = loadSavedState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, profileBindings: next }));
      } catch {}
      return { profileBindings: next };
    });
  },

  triggerProfileAutoPlay: (profileId) => {
    const targetPlaylistId = get().profileBindings[profileId];
    if (targetPlaylistId) {
      get().selectPlaylist(targetPlaylistId, true);
    }
  },

  addFolderPlaylist: (name, folderPath, files) => {
    const tracks: FocusTrack[] = files.map((f, i) => ({
      id: `local-track-${Date.now()}-${i}`,
      title: f.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Storage",
      durationSeconds: 180, // Default baseline duration for scanned files
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
    };

    set((s) => ({
      playlists: [...s.playlists, newPl],
      currentPlaylistId: newPl.id,
    }));
    get().play(tracks[0]);
  },
}));
