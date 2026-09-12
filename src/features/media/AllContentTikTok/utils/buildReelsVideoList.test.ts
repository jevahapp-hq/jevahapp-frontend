import assert from "node:assert/strict";
import { test } from "node:test";
import type { MediaItem } from "../../../../shared/types";
import { buildReelsVideoList } from "./buildReelsVideoList";

function video(id: string, extra?: Partial<MediaItem>): MediaItem {
  return {
    _id: id,
    id,
    title: id,
    contentType: "videos",
    fileUrl: `${id}.mp4`,
    ...extra,
  } as MediaItem;
}

test("most recent video is first even when it appears later in the feed", () => {
  const list = buildReelsVideoList({
    mostRecentItem: video("newest"),
    firstFour: [video("a"), video("b")],
    rest: [video("newest"), video("c")],
    fallbackVideos: [video("a"), video("d")],
  });
  assert.deepEqual(
    list.map((item) => item._id),
    ["newest", "a", "b", "c", "d"]
  );
});

test("skips non-video rows so Reels is only playable clips", () => {
  const music = {
    _id: "song",
    contentType: "music",
    fileUrl: "song.mp3",
    title: "song",
  } as MediaItem;
  const list = buildReelsVideoList({
    mostRecentItem: music,
    firstFour: [video("v1"), music],
    rest: [video("v2")],
  });
  assert.deepEqual(
    list.map((item) => item._id),
    ["v1", "v2"]
  );
});
