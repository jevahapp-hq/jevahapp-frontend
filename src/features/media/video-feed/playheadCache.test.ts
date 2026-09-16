import assert from "node:assert/strict";
import { test } from "node:test";
import { clearPlayhead, getPlayhead, savePlayhead } from "./playheadCache";

test("playhead lookup survives over-encoded Cloudinary URLs", () => {
  const raw =
    "https://res.cloudinary.com/demo/video/upload/v1/folder%252Fclip.mp4";
  const encoded =
    "https://res.cloudinary.com/demo/video/upload/v1/folder%2Fclip.mp4";
  savePlayhead(raw, 8.25);
  assert.ok(getPlayhead(encoded) > 8);
  clearPlayhead(encoded);
  assert.equal(getPlayhead(raw), 0);
});
