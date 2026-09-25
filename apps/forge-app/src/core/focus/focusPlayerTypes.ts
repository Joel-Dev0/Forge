export type SoundProviderType = "local" | "youtube" | "spotify" | "soundcloud" | "stream";

export interface FocusTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds: number;
  provider: SoundProviderType;
  sourceUrl: string; // File URI, stream URL, YouTube link, or Spotify link
  embedUrl?: string; // Generated iframe embed URL for YouTube, Spotify, SoundCloud
  coverArt?: string;
  category?: "lofi" | "classical" | "ambient" | "binaural" | "nature" | "custom" | "radio";
  storageKey?: string; // Key in IndexedDB for permanent local audio storage
  fileSize?: number; // Size in bytes
  mimeType?: string;
  isOfflineAvailable?: boolean;
}

export interface FocusPlaylist {
  id: string;
  name: string;
  description: string;
  provider: SoundProviderType;
  tracks: FocusTrack[];
  coverGradient: string;
  isFolderBacked?: boolean;
  folderPath?: string;
  isCustom?: boolean;
}

export interface SoundProviderAdapter {
  type: SoundProviderType;
  name: string;
  isAvailable: () => boolean;
  loadTrack: (track: FocusTrack) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void; // 0 to 1
  stop: () => void;
}
