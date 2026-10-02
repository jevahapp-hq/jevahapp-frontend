import assert from "node:assert/strict";
import test from "node:test";
import { FEED_VIDEO_PLAYER_HEIGHT } from "../../src/features/media/video-feed/feedVideoConfig.ts";
import {
  categoryCardFrame,
  reelDisplayFrame,
  reelFrameNeedsBackdrop,
  reelSharpFit,
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

test("a taller phone video stays centered for a snapshot above and below", () => {
  const frame = reelDisplayFrame(PHONE.width / PHONE.height, PHONE.width, PHONE.height);
  const card = categoryCardFrame(PHONE.width, PHONE.height);
  assert.equal(frame.contentFit, "cover");
  assert.equal(frame.width, card.width);
  assert.equal(frame.height, card.height);
  assert.equal(reelFrameNeedsBackdrop(frame, PHONE.width, PHONE.height), true);
});

test("a square or 4:5 clip stays centered instead of filling the reel", () => {
  for (const aspect of [1, 1.03, 4 / 5]) {
    const frame = reelDisplayFrame(aspect, PHONE.width, PHONE.height);
    const card = categoryCardFrame(PHONE.width, PHONE.height);
    assert.equal(frame.contentFit, "cover");
    assert.equal(frame.width, card.width);
    assert.equal(frame.height, card.height);
    assert.equal(reelFrameNeedsBackdrop(frame, PHONE.width, PHONE.height), true);
  }
});

test("wide videos keep the category card", () => {
  for (const aspect of [16 / 9, 4 / 3]) {
    const frame = reelDisplayFrame(aspect, PHONE.width, PHONE.height);
    const card = categoryCardFrame(PHONE.width, PHONE.height);
    assert.equal(frame.contentFit, "cover");
    assert.equal(frame.width, card.width);
    assert.equal(frame.height, card.height);
    assert.equal(frame.width, PHONE.width);
    assert.equal(frame.height, FEED_VIDEO_PLAYER_HEIGHT);
    assert.equal(reelFrameNeedsBackdrop(frame, PHONE.width, PHONE.height), true);
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

test("a short reel does not grow the category card past the screen", () => {
  const frame = reelDisplayFrame(16 / 9, 800, 300);
  assert.equal(frame.width, 800);
  assert.equal(frame.height, 300);
  assert.equal(frame.contentFit, "cover");
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
