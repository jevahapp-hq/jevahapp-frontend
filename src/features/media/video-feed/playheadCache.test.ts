import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearPlayhead,
  feedStartSeconds,
  getPlayhead,
  savePlayhead,
} from "./playheadCache";

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

test("a clip with no saved time opens just past the blank first frame", () => {
  assert.equal(feedStartSeconds("https://cdn.example/never-saved.mp4"), 0.1);
});

test("a saved playhead is where the card resumes", () => {
  const url = "https://cdn.example/resume-me.mp4";
  savePlayhead(url, 4.2);
  assert.equal(feedStartSeconds(url), 4.2);
  clearPlayhead(url);
});
