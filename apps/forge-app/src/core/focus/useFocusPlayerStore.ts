import { create } from "zustand";
import type { FocusPlaylist, FocusTrack, SoundProviderType } from "./focusPlayerTypes";
import { type CuratedOnlineStation, stationToFocusTrack } from "./focusPresets";
import {
  saveLocalAudioBlob,
  saveMultipleAudioBlobs,
  getLocalAudioUrl,
  getCachedAudioUrl,
  deleteLocalAudioBlob,
  cacheOnlineAudioToLocal,
} from "./focusAudioStorage";

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

  // Local File & Folder Storage Management (IndexedDB Persistent)
  addLocalTrack: (
    file: File | Blob,
    options?: {
      title?: string;
      artist?: string;
      playlistId?: string;
      category?: FocusTrack["category"];
      fileName?: string;
    }
  ) => Promise<FocusTrack>;
  addMultipleLocalTracks: (
    files: Array<{ file: File; name?: string }>,
    targetPlaylistId?: string,
    playlistName?: string
  ) => Promise<FocusTrack[]>;
  addFolderPlaylist: (
    name: string,
    folderPath: string,
    files: Array<{ name: string; url: string; size: number; rawFile?: File | Blob }>
  ) => Promise<void>;
  cacheTrackLocally: (playlistId: string, trackId: string) => Promise<boolean>;
  hydrateLocalTracks: () => Promise<void>;
}

const STORAGE_KEY = "forge_focus_player_v3";

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
    // Do NOT set crossOrigin = "anonymous": causes CORS failures for blob: URLs and HTTP Icecast/Shoutcast streams in Chromium
    globalAudio.preload = "auto";

    globalAudio.onloadedmetadata = () => {
      if (globalAudio && globalAudio.duration && !isNaN(globalAudio.duration) && isFinite(globalAudio.duration)) {
        useFocusPlayerStore.setState({ duration: Math.floor(globalAudio.duration) });
      }
    };

    globalAudio.ontimeupdate = () => {
      if (globalAudio && globalAudio.currentTime !== undefined) {
        useFocusPlayerStore.setState({ currentTime: Math.floor(globalAudio.currentTime) });
      }
    };

    globalAudio.onended = () => {
      const state = useFocusPlayerStore.getState();
      if (state.isRepeat === "one") {
        if (globalAudio) {
          globalAudio.currentTime = 0;
          globalAudio.play().catch(() => {});
        }
      } else {
        state.nextTrack();
      }
    };

    globalAudio.onplay = () => {
      useFocusPlayerStore.setState({ isPlaying: true });
    };

    globalAudio.onpause = () => {
      const p = useFocusPlayerStore.getState().currentTrack?.provider;
      if (p === "stream" || p === "local") {
        useFocusPlayerStore.setState({ isPlaying: false });
      }
    };

    globalAudio.onerror = () => {
      console.warn("[FocusPlayer] HTMLAudioElement error event:", globalAudio?.error);
    };
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

      const key = target.storageKey || (target.id.startsWith("local-") ? target.id : undefined);
      const cached = key ? getCachedAudioUrl(key) : null;
      let playSrc = cached || target.sourceUrl;

      // Start playing synchronously (preserves user activation click)
      if (playSrc && !playSrc.startsWith("synth://")) {
        if (audio.src !== playSrc) {
          audio.src = playSrc;
        }
        audio.volume = effectiveVol;
        audio.play().catch((err) => {
          console.warn("[FocusPlayer] Initial audio play caught:", err);
        });
      }

      // Rehydrate fresh blob URL from IndexedDB if not cached or if current is an expired blob
      if (key) {
        getLocalAudioUrl(key)
          .then((fresh) => {
            if (fresh && get().isPlaying) {
              if (audio.src !== fresh) {
                audio.src = fresh;
                audio.volume = effectiveVol;
                audio.play().catch((err) => {
                  console.warn("[FocusPlayer] HTML5 audio playback with rehydrated URL:", err);
                });
              }

              if (target.sourceUrl !== fresh) {
                set((s) => ({
                  currentTrack: { ...target, storageKey: key, sourceUrl: fresh, isOfflineAvailable: true },
                  playlists: s.playlists.map((pl) => ({
                    ...pl,
                    tracks: pl.tracks.map((t) =>
                      t.id === target.id ? { ...t, storageKey: key, sourceUrl: fresh, isOfflineAvailable: true } : t
                    ),
                  })),
                }));
              }
            }
          })
          .catch((err) => {
            console.warn("[FocusPlayer] Error rehydrating audio blob:", err);
          });
      }
    } else if (target.sourceUrl.startsWith("synth://") || target.sourceUrl.startsWith("ambient://")) {
      if (globalAudio) globalAudio.pause();
      startAmbientSynth(target.sourceUrl, effectiveVol);
    } else {
      // YouTube, Spotify, SoundCloud iframe providers
      stopAmbientSynth();
      if (globalAudio) {
        globalAudio.pause();
        globalAudio.removeAttribute("src");
        globalAudio.load();
      }
      if (typeof window !== "undefined") {
        try {
          const iframe = document.getElementById("focus-player-embed-iframe") as HTMLIFrameElement;
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
            iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
            iframe.contentWindow.postMessage('{"method":"play"}', "*");
          }
        } catch {}
      }
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
    if (globalAudio) {
      globalAudio.pause();
      if (get().currentTrack?.provider === "stream") {
        globalAudio.removeAttribute("src");
        globalAudio.load();
      }
    }
    if (typeof window !== "undefined") {
      if ((window as any).__forgeFocusPlayerInterval) {
        clearInterval((window as any).__forgeFocusPlayerInterval);
      }
      try {
        const iframe = document.getElementById("focus-player-embed-iframe") as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*");
          iframe.contentWindow.postMessage('{"method":"pause"}', "*");
        }
      } catch {}
      window.dispatchEvent(new CustomEvent("forge:media-pause"));
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
    if (typeof window !== "undefined") {
      try {
        const iframe = document.getElementById("focus-player-embed-iframe") as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [timeSeconds, true] }), '*');
        }
      } catch {}
    }
  },

  setVolume: (volume) => {
    const vol = Math.max(0, Math.min(1, volume));
    set({ volume: vol, isMuted: false });
    if (globalAudio) globalAudio.volume = vol;
    if (synthGain && audioCtx) synthGain.gain.setValueAtTime(vol * 0.15, audioCtx.currentTime);
    if (typeof window !== "undefined") {
      try {
        const iframe = document.getElementById("focus-player-embed-iframe") as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [vol * 100] }), '*');
        }
      } catch {}
    }

    const s = get();
    persistStore(vol, false, s.isShuffle, s.isRepeat, s.profileBindings, s.playlists);
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    set({ isMuted: nextMuted });
    const effective = nextMuted ? 0 : get().volume;
    if (globalAudio) globalAudio.volume = effective;
    if (synthGain && audioCtx) synthGain.gain.setValueAtTime(effective * 0.15, audioCtx.currentTime);
    if (typeof window !== "undefined") {
      try {
        const iframe = document.getElementById("focus-player-embed-iframe") as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: nextMuted ? 'mute' : 'unMute', args: '' }), '*');
        }
      } catch {}
    }
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
      return { playlists: updatedPlaylists, currentPlaylistId: targetPlaylist.id };
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
    const pl = get().playlists.find((p) => p.id === playlistId);
    const trk = pl?.tracks.find((t) => t.id === trackId);
    if (trk?.storageKey) {
      deleteLocalAudioBlob(trk.storageKey).catch(() => {});
    }

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
    const pl = get().playlists.find((p) => p.id === playlistId);
    if (pl) {
      for (const t of pl.tracks) {
        if (t.storageKey) {
          deleteLocalAudioBlob(t.storageKey).catch(() => {});
        }
      }
    }

    set((s) => {
      const updated = s.playlists.filter((p) => p.id !== playlistId);
      const nextActiveId = updated[0]?.id || "playlist-online-curated";
      persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updated);
      return { playlists: updated, currentPlaylistId: nextActiveId };
    });
  },

  addLocalTrack: async (file, options) => {
    const trackId = `local-track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await saveLocalAudioBlob(trackId, file);
    const freshUrl = (await getLocalAudioUrl(trackId)) || (file instanceof Blob ? URL.createObjectURL(file) : "");

    const fileName = options?.fileName || (file instanceof File ? file.name : "Local Song.mp3");
    const cleanTitle = options?.title?.trim() || fileName.replace(/\.[^/.]+$/, "");

    const newTrack: FocusTrack = {
      id: trackId,
      title: cleanTitle,
      artist: options?.artist?.trim() || "Local Device Audio",
      durationSeconds: 180,
      provider: "local",
      sourceUrl: freshUrl,
      category: options?.category || "custom",
      storageKey: trackId,
      fileSize: file.size,
      mimeType: file.type || "audio/mpeg",
      isOfflineAvailable: true,
    };

    set((s) => {
      let targetId = options?.playlistId || s.currentPlaylistId;
      let targetPlaylist = s.playlists.find((p) => p.id === targetId);

      if (!targetPlaylist) {
        targetPlaylist = s.playlists.find((p) => p.id === "playlist-local-library");
      }

      if (!targetPlaylist) {
        targetPlaylist = {
          id: "playlist-local-library",
          name: "My Local Library",
          description: "Permanent offline audio library saved from local device",
          provider: "local",
          tracks: [newTrack],
          coverGradient: "from-emerald-600/30 via-teal-700/30 to-cyan-800/30",
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

  addMultipleLocalTracks: async (files, targetPlaylistId, playlistName) => {
    const itemsToSave: Array<{ key: string; blobOrFile: Blob | File }> = [];
    const tracks: FocusTrack[] = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      const trackId = `local-track-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      itemsToSave.push({ key: trackId, blobOrFile: item.file });
      const name = item.name || item.file.name;
      tracks.push({
        id: trackId,
        title: name.replace(/\.[^/.]+$/, ""),
        artist: "Local Storage",
        durationSeconds: 180,
        provider: "local",
        sourceUrl: URL.createObjectURL(item.file),
        category: "custom",
        storageKey: trackId,
        fileSize: item.file.size,
        mimeType: item.file.type || "audio/mpeg",
        isOfflineAvailable: true,
      });
    }

    if (itemsToSave.length > 0) {
      await saveMultipleAudioBlobs(itemsToSave).catch((err) => {
        console.warn("[FocusPlayer] Batch save local tracks error:", err);
      });
      for (const t of tracks) {
        if (t.storageKey) {
          const fresh = getCachedAudioUrl(t.storageKey);
          if (fresh) t.sourceUrl = fresh;
        }
      }
    }

    set((s) => {
      let targetPl = targetPlaylistId ? s.playlists.find((p) => p.id === targetPlaylistId) : null;
      if (!targetPl) {
        const newPlId = `playlist-local-${Date.now()}`;
        const newPl: FocusPlaylist = {
          id: newPlId,
          name: playlistName || "Imported Local Songs",
          description: `Saved locally on device (${tracks.length} tracks)`,
          provider: "local",
          tracks,
          coverGradient: "from-emerald-600/30 to-teal-800/30",
          isCustom: true,
        };
        const updated = [...s.playlists, newPl];
        persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updated);
        return { playlists: updated, currentPlaylistId: newPl.id };
      }

      const updatedPlaylists = s.playlists.map((pl) => {
        if (pl.id === targetPl!.id) {
          return {
            ...pl,
            tracks: [...tracks, ...pl.tracks],
          };
        }
        return pl;
      });

      persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updatedPlaylists);
      return { playlists: updatedPlaylists, currentPlaylistId: targetPl.id };
    });

    if (tracks.length > 0) {
      get().play(tracks[0]);
    }
    return tracks;
  },

  addFolderPlaylist: async (name, folderPath, files) => {
    const itemsToSave: Array<{ key: string; blobOrFile: Blob | File }> = [];
    const tracks: FocusTrack[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const trackId = `local-folder-${Date.now()}-${i}`;
      if (f.rawFile) {
        itemsToSave.push({ key: trackId, blobOrFile: f.rawFile });
      }

      tracks.push({
        id: trackId,
        title: f.name.replace(/\.[^/.]+$/, ""),
        artist: "Local Storage",
        durationSeconds: 180,
        provider: "local",
        sourceUrl: f.url,
        category: "custom",
        storageKey: f.rawFile ? trackId : undefined,
        fileSize: f.size,
        isOfflineAvailable: !!f.rawFile,
      });
    }

    if (itemsToSave.length > 0) {
      await saveMultipleAudioBlobs(itemsToSave).catch((err) => {
        console.warn("[FocusPlayer] Batch save folder tracks error:", err);
      });
      for (const t of tracks) {
        if (t.storageKey) {
          const fresh = getCachedAudioUrl(t.storageKey);
          if (fresh) t.sourceUrl = fresh;
        }
      }
    }

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

  cacheTrackLocally: async (playlistId, trackId) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    const trk = pl?.tracks.find((t) => t.id === trackId);
    if (!trk || trk.provider !== "stream" || !trk.sourceUrl.startsWith("http")) return false;

    const savedKey = await cacheOnlineAudioToLocal(trackId, trk.sourceUrl);
    if (!savedKey) return false;

    const freshUrl = await getLocalAudioUrl(savedKey);
    set((s) => {
      const updatedPlaylists = s.playlists.map((p) => {
        if (p.id === playlistId) {
          return {
            ...p,
            tracks: p.tracks.map((t) =>
              t.id === trackId
                ? { ...t, storageKey: savedKey, sourceUrl: freshUrl || t.sourceUrl, isOfflineAvailable: true }
                : t
            ),
          };
        }
        return p;
      });
      persistStore(s.volume, s.isMuted, s.isShuffle, s.isRepeat, s.profileBindings, updatedPlaylists);
      return { playlists: updatedPlaylists };
    });
    return true;
  },

  hydrateLocalTracks: async () => {
    const { playlists, currentTrack } = get();
    let hasChanges = false;
    let updatedCurrentTrack = currentTrack;

    const updatedPlaylists = await Promise.all(
      playlists.map(async (pl) => {
        const updatedTracks = await Promise.all(
          pl.tracks.map(async (t) => {
            const key = t.storageKey || (t.id.startsWith("local-") ? t.id : undefined);
            if (key) {
              const freshUrl = await getLocalAudioUrl(key);
              if (freshUrl) {
                if (freshUrl !== t.sourceUrl || !t.storageKey || !t.isOfflineAvailable) {
                  hasChanges = true;
                }
                const updatedT = { ...t, storageKey: key, sourceUrl: freshUrl, isOfflineAvailable: true };
                if (currentTrack && currentTrack.id === t.id) {
                  updatedCurrentTrack = updatedT;
                }
                return updatedT;
              }
            }
            return t;
          })
        );
        return { ...pl, tracks: updatedTracks };
      })
    );

    if (hasChanges || updatedCurrentTrack !== currentTrack) {
      set({ playlists: updatedPlaylists, currentTrack: updatedCurrentTrack });
    }
  },
}));

// Automatically hydrate local tracks from IndexedDB immediately and on idle
if (typeof window !== "undefined") {
  useFocusPlayerStore.getState().hydrateLocalTracks().catch(() => {});
  setTimeout(() => {
    useFocusPlayerStore.getState().hydrateLocalTracks().catch(() => {});
  }, 100);
}
