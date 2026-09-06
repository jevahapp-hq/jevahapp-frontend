import type { PlaylistTrack } from "./playlistAPI";
import type { PlaylistSong } from "@/store/usePlaylistStore";

/**
 * Normalize a backend playlist track into a PlaylistSong.
 * List endpoints often omit or partially populate `content`; fall back to
 * ids / urls on the track itself so songs remain visible after add/reload.
 */
export function mapPlaylistTrackToSong(
  track: PlaylistTrack | Record<string, any> | null | undefined
): PlaylistSong | null {
  if (!track || typeof track !== "object") return null;

  const content =
    track.content && typeof track.content === "object" ? track.content : null;

  const id = String(
    content?._id ||
      content?.id ||
      track.copyrightFreeSongId ||
      track.mediaId ||
      track._id ||
      ""
  ).trim();

  if (!id) return null;

  const audioUrl =
    content?.fileUrl ||
    content?.audioUrl ||
    track.fileUrl ||
    track.audioUrl ||
    "";

  return {
    id,
    title: content?.title || track.title || "Untitled",
    artist: content?.artistName || content?.artist || track.artistName || "Unknown",
    audioUrl,
    thumbnailUrl:
      content?.thumbnailUrl ||
      content?.imageUrl ||
      track.thumbnailUrl ||
      undefined,
    duration: Number(content?.duration ?? track.duration ?? 0) || 0,
    category: content?.contentType || track.contentType || track.category,
    description: content?.description || content?.title || track.title,
    addedAt: track.addedAt || new Date().toISOString(),
    trackType: track.trackType,
    mediaId: track.mediaId,
    copyrightFreeSongId: track.copyrightFreeSongId,
  };
}

export function mapPlaylistTracksToSongs(
  tracks: Array<PlaylistTrack | Record<string, any>> | null | undefined
): PlaylistSong[] {
  if (!Array.isArray(tracks)) return [];
  const songs: PlaylistSong[] = [];
  for (const track of tracks) {
    const song = mapPlaylistTrackToSong(track);
    if (song) songs.push(song);
  }
  return songs;
}
