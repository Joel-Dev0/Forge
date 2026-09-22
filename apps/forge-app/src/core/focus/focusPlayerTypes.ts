export type SoundProviderType = "local" | "youtube" | "spotify";

export interface FocusTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds: number;
  provider: SoundProviderType;
  sourceUrl: string; // File URI or stream/embed URL
  coverArt?: string;
  category?: "lofi" | "classical" | "ambient" | "binaural" | "nature" | "custom";
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
