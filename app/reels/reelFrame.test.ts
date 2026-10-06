import assert from "node:assert/strict";
import test from "node:test";
import { FEED_VIDEO_PLAYER_HEIGHT } from "../../src/features/media/video-feed/feedVideoConfig.ts";
import { frameForFeedVideo } from "../../src/features/media/video-feed/frameForFeedVideo.ts";
import {
  reelDisplayFrame,
  reelFrameNeedsBackdrop,
  reelSharpFit,
  swappedPortraitFeedFrame,
} from "./reelFrame.ts";
import { peekReelImageAspect, reelImageUri, rememberReelImageAspect } from "./reelMedia.ts";

const PHONE = { width: 390, height: 844 };

test("9:16 video fills a phone reel", () => {
  const frame = reelDisplayFrame(9 / 16, PHONE.width, PHONE.height);
  assert.equal(frame.contentFit, "cover");
  assert.equal(frame.width, PHONE.width);
  assert.equal(frame.height, PHONE.height);
  assert.equal(reelFrameNeedsBackdrop(frame, PHONE.width, PHONE.height), false);
  assert.equal(reelSharpFit(frame), "cover");
});

test("a non-portrait reel uses the feed portrait frame turned sideways", () => {
  const portrait = frameForFeedVideo(9 / 16, PHONE.width);
  assert.equal(portrait.height, FEED_VIDEO_PLAYER_HEIGHT);
  const frame = reelDisplayFrame(16 / 9, PHONE.width, PHONE.height);
  assert.equal(frame.width, PHONE.width);
  assert.equal(
    frame.height,
    Math.round(portrait.width * (PHONE.width / portrait.height))
  );
  assert.equal(reelFrameNeedsBackdrop(frame, PHONE.width, PHONE.height), true);
});

test("square, 4:5, and wide clips share that turned portrait frame", () => {
  const expected = swappedPortraitFeedFrame(PHONE.width, PHONE.height);
  for (const aspect of [1, 1.03, 4 / 5, 16 / 9, 4 / 3, PHONE.width / PHONE.height]) {
    const frame = reelDisplayFrame(aspect, PHONE.width, PHONE.height);
    assert.equal(frame.width, expected.width);
    assert.equal(frame.height, expected.height);
    assert.equal(frame.contentFit, "cover");
    assert.equal(reelSharpFit(frame), "cover");
  }
});

test("9:16 fills the reel even when the window is landscape", () => {
  const frame = reelDisplayFrame(9 / 16, 844, 390);
  assert.equal(frame.contentFit, "cover");
  assert.equal(frame.width, 844);
  assert.equal(frame.height, 390);
  assert.equal(reelFrameNeedsBackdrop(frame, 844, 390), false);
});

test("a short screen still keeps the turned portrait frame inside the reel", () => {
  const frame = reelDisplayFrame(16 / 9, 800, 300);
  const fitted = swappedPortraitFeedFrame(800, 300);
  assert.equal(frame.width, fitted.width);
  assert.equal(frame.height, fitted.height);
  assert.ok(frame.width <= 800);
  assert.ok(frame.height <= 300);
  const portrait = frameForFeedVideo(9 / 16, 800);
  assert.equal(frame.width, portrait.height);
  assert.equal(frame.height, portrait.width);
});

test("unknown aspect fills the reel so a 9:16 clip is not letterboxed", () => {
  const frame = reelDisplayFrame(null, PHONE.width, PHONE.height);
  assert.equal(frame.contentFit, "cover");
  assert.equal(frame.width, PHONE.width);
  assert.equal(frame.height, PHONE.height);
  assert.equal(reelFrameNeedsBackdrop(frame, PHONE.width, PHONE.height), false);
});

test("image posts use the picture file and videos do not", () => {
  assert.equal(
    reelImageUri({ contentType: "image", fileUrl: "https://cdn.example/a.jpg" }),
    "https://cdn.example/a.jpg"
  );
  assert.equal(
    reelImageUri({ contentType: "video", fileUrl: "https://cdn.example/a.mp4" }),
    null
  );
  assert.equal(
    reelImageUri({
      contentType: "image",
      fileUrl: "https://cdn.example/a.mp4",
      imageUrl: "https://cdn.example/still.jpg",
    }),
    "https://cdn.example/still.jpg"
  );
  rememberReelImageAspect("https://cdn.example/a.jpg", 1);
  assert.equal(peekReelImageAspect("https://cdn.example/a.jpg"), 1);
});
