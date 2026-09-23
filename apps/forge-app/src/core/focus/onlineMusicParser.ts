import type { SoundProviderType } from "./focusPlayerTypes";

export interface ParsedOnlineMedia {
  provider: SoundProviderType;
  sourceUrl: string;
  embedUrl: string;
  title: string;
  artist: string;
  coverArt?: string;
  durationSeconds: number;
  category: "lofi" | "classical" | "ambient" | "binaural" | "nature" | "custom" | "radio";
}

/**
 * Extracts YouTube Video ID or Playlist ID from various URL formats
 */
export function extractYouTubeId(url: string): { type: "video" | "playlist"; id: string } | null {
  try {
    const cleanUrl = url.trim();
    
    // Check for playlist first
    const listMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
    if (listMatch && !cleanUrl.includes("watch?v=")) {
      return { type: "playlist", id: listMatch[1] };
    }

    // Direct 11-char video ID provided
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
      return { type: "video", id: cleanUrl };
    }

    // youtu.be/ID
    const shortMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (shortMatch) return { type: "video", id: shortMatch[1] };

    // youtube.com/watch?v=ID or /live/ID or /embed/ID
    const longMatch = cleanUrl.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=))([a-zA-Z0-9_-]{11})/i);
    if (longMatch) return { type: "video", id: longMatch[1] };

    if (listMatch) {
      return { type: "playlist", id: listMatch[1] };
    }
  } catch {}
  return null;
}

/**
 * Extracts Spotify Resource ID and Type (track, playlist, album)
 */
export function extractSpotifyId(url: string): { type: "track" | "playlist" | "album"; id: string } | null {
  try {
    const cleanUrl = url.trim();
    // URI format: spotify:track:xxxx
    const uriMatch = cleanUrl.match(/^spotify:(track|playlist|album):([a-zA-Z0-9]+)$/i);
    if (uriMatch) {
      return { type: uriMatch[1].toLowerCase() as any, id: uriMatch[2] };
    }

    // URL format: open.spotify.com/track/xxxx
    const urlMatch = cleanUrl.match(/open\.spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/i);
    if (urlMatch) {
      return { type: urlMatch[1].toLowerCase() as any, id: urlMatch[2] };
    }
  } catch {}
  return null;
}

/**
 * Smart URL parser that determines the provider, creates proper embed/stream URLs,
 * and sets intelligent defaults for titles and art.
 */
export function parseOnlineMusicUrl(
  inputUrl: string,
  userTitle?: string,
  userArtist?: string,
  userCategory?: ParsedOnlineMedia["category"]
): ParsedOnlineMedia | null {
  const trimmed = inputUrl.trim();
  if (!trimmed) return null;

  // 1. YouTube
  const yt = extractYouTubeId(trimmed);
  if (yt) {
    const isPlaylist = yt.type === "playlist";
    const embedUrl = isPlaylist
      ? `https://www.youtube.com/embed/videoseries?list=${yt.id}&autoplay=1&enablejsapi=1`
      : `https://www.youtube.com/embed/${yt.id}?autoplay=1&enablejsapi=1&origin=http://localhost`;
    const coverArt = !isPlaylist
      ? `https://img.youtube.com/vi/${yt.id}/hqdefault.jpg`
      : undefined;

    return {
      provider: "youtube",
      sourceUrl: trimmed,
      embedUrl,
      title: userTitle?.trim() || (isPlaylist ? "YouTube Focus Playlist" : "YouTube Focus Stream"),
      artist: userArtist?.trim() || "YouTube Live",
      coverArt,
      durationSeconds: 1800, // 30m default loop representation
      category: userCategory || "lofi",
    };
  }

  // 2. Spotify
  const sp = extractSpotifyId(trimmed);
  if (sp) {
    const embedUrl = `https://open.spotify.com/embed/${sp.type}/${sp.id}?utm_source=generator&theme=0`;
    const typeLabel = sp.type.charAt(0).toUpperCase() + sp.type.slice(1);

    return {
      provider: "spotify",
      sourceUrl: trimmed,
      embedUrl,
      title: userTitle?.trim() || `Spotify ${typeLabel} Focus`,
      artist: userArtist?.trim() || "Spotify Artist",
      durationSeconds: 240,
      category: userCategory || "ambient",
    };
  }

  // 3. SoundCloud
  if (trimmed.includes("soundcloud.com")) {
    const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
      trimmed
    )}&color=%23ff6b00&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;

    return {
      provider: "soundcloud",
      sourceUrl: trimmed,
      embedUrl,
      title: userTitle?.trim() || "SoundCloud Focus Stream",
      artist: userArtist?.trim() || "SoundCloud Audio",
      durationSeconds: 300,
      category: userCategory || "ambient",
    };
  }

  // 4. Web Radio / Direct Audio Stream (mp3, aac, ogg, m3u8, icecast, shoutcast, etc.)
  if (
    /^https?:\/\//i.test(trimmed) &&
    (/\.(mp3|aac|ogg|wav|m4a|m3u8)(\?.*)?$/i.test(trimmed) ||
      trimmed.includes("icecast") ||
      trimmed.includes("somafm.com") ||
      trimmed.includes("stream") ||
      trimmed.includes("radio"))
  ) {
    return {
      provider: "stream",
      sourceUrl: trimmed,
      embedUrl: trimmed,
      title: userTitle?.trim() || "Live Web Radio Stream",
      artist: userArtist?.trim() || "Online Internet Radio",
      durationSeconds: 0, // Live infinite stream
      category: userCategory || "radio",
    };
  }

  // 5. Fallback as Direct Audio Stream if starts with http(s)
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      provider: "stream",
      sourceUrl: trimmed,
      embedUrl: trimmed,
      title: userTitle?.trim() || "Custom Web Audio Stream",
      artist: userArtist?.trim() || "Web Stream",
      durationSeconds: 300,
      category: userCategory || "custom",
    };
  }

  return null;
}
