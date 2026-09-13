import type { PlaylistSong } from "@/store/usePlaylistStore";
import type { AudioTrack } from "@/store/audioPlayer/types";

export function playablePlaylistSongs(songs: PlaylistSong[] | null | undefined): PlaylistSong[] {
  if (!Array.isArray(songs)) return [];
  return songs.filter((song) => String(song?.audioUrl || "").trim().length > 0);
}

function playlistRelease(playlistName?: string, playlistId?: string) {
  const title = String(playlistName || "").trim();
  if (!title) return {};
  return {
    releaseTitle: title,
    release: {
      id: String(playlistId || title),
      title,
      type: "playlist",
    },
  };
}

/** Audio engine queue for a playlist — same shape as tapping a catalog song. */
export function playlistSongsToAudioQueue(
  songs: PlaylistSong[],
  playlistName?: string,
  playlistId?: string
): AudioTrack[] {
  const stamp = playlistRelease(playlistName, playlistId);
  return playablePlaylistSongs(songs).map((song) => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    audioUrl: song.audioUrl,
    thumbnailUrl: song.thumbnailUrl,
    duration: song.duration,
    category: song.category,
    description: song.description,
    source:
      song.trackType === "copyrightFree"
        ? ("copyright-free" as const)
        : ("library" as const),
    ...stamp,
  }));
}

/** Overlay / Up-next list for the full-screen player. */
export function playlistSongsToOverlayQueue(
  songs: PlaylistSong[],
  playlistName?: string,
  playlistId?: string
): Array<Record<string, unknown>> {
  const stamp = playlistRelease(playlistName, playlistId);
  return playablePlaylistSongs(songs).map((song) => ({
    id: song.id,
    _id: song.id,
    title: song.title,
    artist: song.artist,
    audioUrl: song.audioUrl,
    thumbnailUrl: song.thumbnailUrl,
    duration: song.duration,
    ...stamp,
  }));
}

export function clampPlaylistStartIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.floor(index), length - 1));
}
