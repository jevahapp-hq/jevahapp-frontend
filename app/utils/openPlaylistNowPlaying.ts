import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import type { Playlist } from "@/store/usePlaylistStore";
import { playlistAPI } from "./playlistAPI";
import {
  clampPlaylistStartIndex,
  playablePlaylistSongs,
  playlistSongsToAudioQueue,
  playlistSongsToOverlayQueue,
} from "./playlistPlaybackQueue";
import { mapPlaylistTracksToSongs } from "./playlistTrackMapper";

export async function hydratePlaylist(playlist: Playlist): Promise<Playlist> {
  try {
    const result = await playlistAPI.getPlaylistById(playlist.id);
    if (!result.success || !result.data) return playlist;
    const songs = mapPlaylistTracksToSongs(result.data.tracks);
    return {
      id: result.data._id,
      name: result.data.name,
      description: result.data.description,
      songs: songs.length > 0 ? songs : playlist.songs || [],
      createdAt: result.data.createdAt,
      updatedAt: result.data.updatedAt,
      thumbnailUrl:
        songs[0]?.thumbnailUrl ||
        playlist.thumbnailUrl ||
        result.data.tracks?.[0]?.content?.thumbnailUrl,
      totalTracks:
        result.data.totalTracks || songs.length || playlist.songs?.length,
    };
  } catch {
    return playlist;
  }
}

export async function playPlaylistQueue(
  playlist: Playlist,
  startIndex = 0
): Promise<{ played: boolean; playlist: Playlist }> {
  const full = await hydratePlaylist(playlist);
  const playable = playablePlaylistSongs(full.songs);
  if (playable.length === 0) {
    return { played: false, playlist: full };
  }

  const start = clampPlaylistStartIndex(startIndex, playable.length);
  const queue = playlistSongsToAudioQueue(playable, full.name, full.id);
  const overlayQueue = playlistSongsToOverlayQueue(
    playable,
    full.name,
    full.id
  );

  useGlobalAudioPlayerStore.setState({
    queue,
    originalQueue: queue,
    currentIndex: start,
    isShuffled: false,
  });
  await useGlobalAudioPlayerStore.getState().setTrack(queue[start], true);

  const overlay = useCopyrightFreeOverlayStore.getState();
  overlay.setQueue(overlayQueue);
  overlay.setSong(overlayQueue[start]);

  return { played: true, playlist: full };
}

/**
 * Play the playlist and open the shared full-screen now-playing overlay.
 */
export async function openPlaylistNowPlaying(
  playlist: Playlist,
  startIndex = 0
): Promise<{ opened: boolean; playlist: Playlist }> {
  const result = await playPlaylistQueue(playlist, startIndex);
  if (!result.played) {
    return { opened: false, playlist: result.playlist };
  }
  const overlayQueue = playlistSongsToOverlayQueue(
    playablePlaylistSongs(result.playlist.songs),
    result.playlist.name,
    result.playlist.id
  );
  const start = clampPlaylistStartIndex(startIndex, overlayQueue.length);
  useCopyrightFreeOverlayStore
    .getState()
    .open(overlayQueue[start], { queue: overlayQueue });
  return { opened: true, playlist: result.playlist };
}
