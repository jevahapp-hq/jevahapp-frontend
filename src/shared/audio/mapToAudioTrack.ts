import type { AudioTrack } from "../../../app/store/audioPlayer/types";
import type { MediaItem } from "../types";
import { getUserDisplayNameFromContent, isValidUri } from "../utils";

export type PlaybackSource = "feed" | "copyright-free" | "library" | "hymn" | "ebook";

export function resolveMediaAudioUrl(item: MediaItem | Record<string, unknown>): string {
  const candidates = [
    (item as any).fileUrl,
    (item as any).audioUrl,
    (item as any).playbackUrl,
    (item as any).mediaUrl,
  ];
  for (const raw of candidates) {
    if (typeof raw === "string" && isValidUri(raw)) return raw.trim();
  }
  return "";
}

export function mapMediaItemToTrack(
  item: MediaItem,
  source: PlaybackSource = "feed"
): AudioTrack | null {
  const audioUrl = resolveMediaAudioUrl(item);
  if (!audioUrl) return null;
  const id = String(item._id || (item as any).id || "");
  if (!id) return null;

  const thumb = item.imageUrl || item.thumbnailUrl;
  const thumbnailUrl =
    typeof thumb === "string" ? thumb : (thumb as any)?.uri || "";

  return {
    id,
    title: item.title || "Untitled",
    artist: getUserDisplayNameFromContent(item) || "Unknown Artist",
    audioUrl,
    thumbnailUrl,
    duration: Number(item.duration) || 0,
    category: item.category?.[0] || item.contentType || "audio",
    description: item.description || "",
    source,
  };
}

export function mapCopyrightFreeSongToTrack(song: any): AudioTrack {
  return {
    id: String(song.id || song._id || ""),
    title: song.title || "Untitled",
    artist: song.artist || "Unknown Artist",
    audioUrl: song.audioUrl || song.fileUrl || "",
    thumbnailUrl: song.thumbnailUrl || "",
    duration: Number(song.duration) || 0,
    category: song.category,
    description: song.description || "",
    source: "copyright-free",
  };
}
