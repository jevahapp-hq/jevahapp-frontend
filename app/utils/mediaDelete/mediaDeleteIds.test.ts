import assert from "node:assert/strict";
import test from "node:test";
import {
  collectMediaDeleteIds,
  localMediaIds,
  matchOwnedMediaId,
  mediaIdFromFileUrl,
} from "./mediaDeleteIds.ts";

const MEDIA = "6ab0724f93e9b3af88a6d404";
const WRAPPER = "6ab06dff93e9b3af88a6d1c5";

test("file url id is the media id, not the storage host id", () => {
  const url = `https://pub-17c463321ed44e22ba0d23a3505140ac.r2.dev/jevah/media-videos/${MEDIA}-video.mp4`;
  assert.equal(mediaIdFromFileUrl(url), MEDIA);
});

test("delete tries the file id before a different row id", () => {
  const ids = collectMediaDeleteIds({
    _id: WRAPPER,
    fileUrl: `https://cdn.example.com/jevah/media-videos/${MEDIA}-video.mp4`,
  });
  assert.deepEqual(ids, [MEDIA, WRAPPER]);
});

test("a visible card matches the account post with the same title", () => {
  const id = matchOwnedMediaId(
    { _id: WRAPPER, title: "Sunday message" },
    [
      { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", title: "Other" },
      { _id: MEDIA, title: "Sunday message" },
    ],
    [WRAPPER]
  );
  assert.equal(id, MEDIA);
});

test("a nested media document id is preferred", () => {
  const ids = collectMediaDeleteIds({
    _id: WRAPPER,
    media: { _id: MEDIA, fileUrl: "https://cdn.example.com/clip.mp4" },
  });
  assert.equal(ids[0], MEDIA);
  assert.ok(ids.includes(WRAPPER));
});

test("a phone-only card id is removed with the file id", () => {
  const ids = localMediaIds({
    _id: "temp-1",
    id: "temp-1",
    fileUrl: `https://cdn.example.com/jevah/media-videos/${MEDIA}-video.mp4`,
  });
  assert.deepEqual(ids, [MEDIA, "temp-1"]);
});
