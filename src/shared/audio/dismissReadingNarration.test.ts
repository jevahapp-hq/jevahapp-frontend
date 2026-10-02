import assert from "node:assert/strict";
import test from "node:test";
import { isReadingNarrationTrackId } from "./readingNarrationTrack.ts";

test("recognizes ebook and bible read-aloud tracks", () => {
  assert.equal(isReadingNarrationTrackId("ebook-narration-page-25"), true);
  assert.equal(isReadingNarrationTrackId("bible-narration-john-3"), true);
  assert.equal(isReadingNarrationTrackId("ebook-tts-abc"), true);
});

test("leaves music and video audio alone", () => {
  assert.equal(isReadingNarrationTrackId("hymn-12"), false);
  assert.equal(isReadingNarrationTrackId("feed-video"), false);
  assert.equal(isReadingNarrationTrackId(""), false);
  assert.equal(isReadingNarrationTrackId(null), false);
});
