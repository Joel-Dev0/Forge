import type { FocusTrack } from "./focusPlayerTypes";

export interface CuratedOnlineStation {
  id: string;
  title: string;
  artist: string;
  provider: "youtube" | "spotify" | "stream" | "soundcloud";
  sourceUrl: string;
  embedUrl: string;
  coverArt?: string;
  category: "lofi" | "classical" | "ambient" | "binaural" | "nature" | "custom" | "radio";
  tagline: string;
}

export const CURATED_ONLINE_STATIONS: CuratedOnlineStation[] = [
  {
    id: "curated-yt-lofigirl",
    title: "Lofi Girl — beats to relax/study to",
    artist: "Lofi Girl (24/7 Live)",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1",
    coverArt: "https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg",
    category: "lofi",
    tagline: "The world's most iconic study radio stream with calming beats.",
  },
  {
    id: "curated-yt-synthwave",
    title: "Synthwave Radio — Chill Synth / Retro Beats",
    artist: "Lofi Girl Synthwave",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
    embedUrl: "https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=1&enablejsapi=1",
    coverArt: "https://img.youtube.com/vi/4xDzrJKXOOY/hqdefault.jpg",
    category: "lofi",
    tagline: "Retro-futuristic beats and soothing cyber-synth for programming.",
  },
  {
    id: "curated-yt-chillhop",
    title: "Chillhop Radio — Jazzy & Lofi Beats",
    artist: "Chillhop Music",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=5yx6BWlEVcY",
    embedUrl: "https://www.youtube.com/embed/5yx6BWlEVcY?autoplay=1&enablejsapi=1",
    coverArt: "https://img.youtube.com/vi/5yx6BWlEVcY/hqdefault.jpg",
    category: "lofi",
    tagline: "Warm jazz-hop instrumentals perfect for deep focus workflow.",
  },
  {
    id: "curated-stream-somagroove",
    title: "SomaFM Groove Salad (Ambient / Chill)",
    artist: "SomaFM Independent Radio",
    provider: "stream",
    sourceUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
    embedUrl: "https://ice1.somafm.com/groovesalad-128-mp3",
    category: "ambient",
    tagline: "A nicely chilled plate of ambient/downtempo beats and grooves.",
  },
  {
    id: "curated-stream-dronezone",
    title: "SomaFM Drone Zone (Deep Ambient)",
    artist: "SomaFM Independent Radio",
    provider: "stream",
    sourceUrl: "https://ice1.somafm.com/dronezone-128-mp3",
    embedUrl: "https://ice1.somafm.com/dronezone-128-mp3",
    category: "ambient",
    tagline: "Atmospheric textures and deep ambient soundscapes with no distractions.",
  },
  {
    id: "curated-sp-deepfocus",
    title: "Deep Focus Flow",
    artist: "Spotify Curated",
    provider: "spotify",
    sourceUrl: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0",
    category: "ambient",
    tagline: "Quiet post-rock and neoclassical music for focused coding.",
  },
  {
    id: "curated-sp-peacefulpiano",
    title: "Peaceful Piano Study",
    artist: "Spotify Curated",
    provider: "spotify",
    sourceUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0",
    category: "classical",
    tagline: "Gentle acoustic piano compositions that heighten mental endurance.",
  },
];

export function stationToFocusTrack(station: CuratedOnlineStation): FocusTrack {
  return {
    id: `track-${station.id}-${Date.now()}`,
    title: station.title,
    artist: station.artist,
    durationSeconds: station.provider === "stream" ? 0 : 1800,
    provider: station.provider,
    sourceUrl: station.sourceUrl,
    embedUrl: station.embedUrl,
    coverArt: station.coverArt,
    category: station.category,
  };
}
