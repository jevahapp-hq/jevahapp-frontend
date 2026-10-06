import assert from "node:assert/strict";
import test from "node:test";
import {
  aspectFromMedia,
  aspectFromSize,
  aspectFromThumbnail,
  confirmedAspectFromTrack,
  frameAspectChanged,
  isFramePosterOf,
  layoutAspectFromMedia,
  preferDisplayedAspect,
  videoFramePosterUrl,
  videoSourceUrls,
} from "./displayedVideoAspect.ts";

test("a poster cut next to the video is a frame of it; cover art is not", () => {
  const base = "https://pub.r2.dev/jevah/media/6abac09c/v1";
  assert.equal(isFramePosterOf(`${base}/poster.jpg`, `${base}/playback.mp4`), true);
  assert.equal(
    isFramePosterOf(
      "https://pub.r2.dev/jevah/user-avatars/jesus.jpeg",
      "https://pub.r2.dev/jevah/media-videos/videoplayback.mp4"
    ),
    false
  );
  assert.equal(isFramePosterOf(null, `${base}/playback.mp4`), false);
});

test("a tall encoded track can be trusted", () => {
  assert.equal(confirmedAspectFromTrack(9 / 16), 9 / 16);
});

test("a wide encoded track is not trusted — iPhone often rotates it", () => {
  assert.equal(confirmedAspectFromTrack(16 / 9), null);
  assert.equal(confirmedAspectFromTrack(1), null);
  assert.equal(confirmedAspectFromTrack(null), null);
});

test("a thumbnail that fills both caps is not an aspect", () => {
  assert.equal(aspectFromThumbnail(96, 96, 96, 96), null);
  assert.equal(aspectFromThumbnail(54, 96, 96, 192), 54 / 96);
  assert.equal(aspectFromThumbnail(96, 54, 96, 192), 96 / 54);
});

test("a rotated frame's pixel size is the displayed aspect", () => {
  assert.equal(aspectFromSize(54, 96), 54 / 96);
  assert.ok((aspectFromSize(54, 96) ?? 1) < 1);
  assert.equal(aspectFromSize(0, 96), null);
});

test("the card updates only when tall and wide readings disagree", () => {
  assert.equal(frameAspectChanged(16 / 9, 9 / 16), true);
  assert.equal(frameAspectChanged(9 / 16, 3 / 4), false);
  assert.equal(frameAspectChanged(16 / 9, 4 / 3), false);
  assert.equal(frameAspectChanged(null, 9 / 16), false);
});

test("a tall picture is not replaced by a wide buffer", () => {
  assert.equal(preferDisplayedAspect(9 / 16, 16 / 9), 9 / 16);
  assert.equal(preferDisplayedAspect(9 / 16, 4 / 5), 9 / 16);
  assert.equal(preferDisplayedAspect(16 / 9, 9 / 16), 9 / 16);
  assert.equal(preferDisplayedAspect(null, 16 / 9), 16 / 9);
  assert.equal(preferDisplayedAspect(16 / 9, null), 16 / 9);
});

test("upload dimensions are the picture and a frame poster is not a cover", () => {
  assert.equal(
    aspectFromMedia({ videoWidth: 1080, videoHeight: 1920 }),
    1080 / 1920
  );
  assert.equal(aspectFromMedia({ width: 1080, height: 1920 }), null);
  assert.equal(layoutAspectFromMedia({ videoWidth: 1080, videoHeight: 1920 }), 1080 / 1920);
  assert.equal(layoutAspectFromMedia({ videoWidth: 1920, videoHeight: 1080 }), null);
  assert.deepEqual(
    videoSourceUrls(
      { fileUrl: "https://cdn.example/a.mp4", hlsUrl: "https://cdn.example/a.m3u8" },
      "https://cdn.example/a.m3u8"
    ),
    ["https://cdn.example/a.m3u8", "https://cdn.example/a.mp4"]
  );
  assert.equal(
    videoFramePosterUrl("https://cdn.example/upload/v1/clip.mp4"),
    "https://cdn.example/upload/so_1/v1/clip.mp4.jpg"
  );
  assert.equal(videoFramePosterUrl("https://cdn.example/plain.mp4"), null);
});
