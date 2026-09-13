import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampPlaylistStartIndex,
  playablePlaylistSongs,
  playlistSongsToAudioQueue,
  playlistSongsToOverlayQueue,
} from "./playlistPlaybackQueue";
import type { PlaylistSong } from "@/store/usePlaylistStore";

const songs: PlaylistSong[] = [
  {
    id: "a",
    title: "First",
    artist: "One",
    audioUrl: "https://cdn.example/a.mp3",
    thumbnailUrl: "https://cdn.example/a.jpg",
    duration: 120,
    addedAt: "2026-01-01T00:00:00.000Z",
    trackType: "copyrightFree",
  },
  {
    id: "b",
    title: "Silent",
    artist: "Two",
    audioUrl: "",
    thumbnailUrl: "",
    duration: 0,
    addedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "c",
    title: "Third",
    artist: "Three",
    audioUrl: "https://cdn.example/c.mp3",
    thumbnailUrl: "https://cdn.example/c.jpg",
    duration: 90,
    addedAt: "2026-01-01T00:00:00.000Z",
    trackType: "media",
  },
];

test("playablePlaylistSongs drops tracks without audio", () => {
  assert.deepEqual(
    playablePlaylistSongs(songs).map((s) => s.id),
    ["a", "c"]
  );
});

test("playlist queues stamp the playlist name and keep added order", () => {
  const audio = playlistSongsToAudioQueue(songs, "Sunday Mix", "pl1");
  const overlay = playlistSongsToOverlayQueue(songs, "Sunday Mix", "pl1");
  assert.deepEqual(
    audio.map((t) => t.id),
    ["a", "c"]
  );
  assert.equal(audio[0].source, "copyright-free");
  assert.equal(audio[1].source, "library");
  assert.equal(audio[0].releaseTitle, "Sunday Mix");
  assert.equal(overlay[1]._id, "c");
  assert.equal(overlay[1].releaseTitle, "Sunday Mix");
});

test("clampPlaylistStartIndex stays inside the playable list", () => {
  assert.equal(clampPlaylistStartIndex(-2, 3), 0);
  assert.equal(clampPlaylistStartIndex(9, 3), 2);
  assert.equal(clampPlaylistStartIndex(1, 3), 1);
  assert.equal(clampPlaylistStartIndex(0, 0), 0);
});
