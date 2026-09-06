import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapPlaylistTrackToSong,
  mapPlaylistTracksToSongs,
} from "../playlistTrackMapper";

test("maps populated content tracks", () => {
  const song = mapPlaylistTrackToSong({
    _id: "track1",
    trackType: "copyrightFree",
    copyrightFreeSongId: "song1",
    content: {
      _id: "song1",
      title: "Praise",
      artistName: "Artist",
      fileUrl: "https://cdn.example/a.mp3",
      thumbnailUrl: "https://cdn.example/a.jpg",
      duration: 120,
      contentType: "music",
    },
    order: 0,
    addedAt: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(song?.id, "song1");
  assert.equal(song?.title, "Praise");
  assert.equal(song?.artist, "Artist");
  assert.equal(song?.audioUrl, "https://cdn.example/a.mp3");
});

test("falls back when content is missing", () => {
  const song = mapPlaylistTrackToSong({
    _id: "track2",
    trackType: "copyrightFree",
    copyrightFreeSongId: "song2",
    title: "Fallback Title",
    artistName: "Fallback Artist",
    fileUrl: "https://cdn.example/b.mp3",
    addedAt: "2026-01-02T00:00:00.000Z",
  });

  assert.equal(song?.id, "song2");
  assert.equal(song?.title, "Fallback Title");
  assert.equal(song?.artist, "Fallback Artist");
  assert.equal(song?.audioUrl, "https://cdn.example/b.mp3");
});

test("skips invalid tracks", () => {
  assert.deepEqual(mapPlaylistTracksToSongs([null, {}, { content: {} }]), []);
});
