import assert from "node:assert/strict";
import { test } from "node:test";
import {
  playOrToggleDecision,
  shouldReplaceAudioQueue,
} from "./playOrToggleDecision";

test("same track toggles the one Sound instead of loading another", () => {
  assert.equal(playOrToggleDecision("abc", "abc"), "toggle");
});

test("a different track loads into the session", () => {
  assert.equal(playOrToggleDecision("abc", "xyz"), "load");
  assert.equal(playOrToggleDecision(undefined, "xyz"), "load");
});

test("feed/library/hymn/ebook replace the queue; copyright-free does not", () => {
  assert.equal(shouldReplaceAudioQueue("feed"), true);
  assert.equal(shouldReplaceAudioQueue("library"), true);
  assert.equal(shouldReplaceAudioQueue("hymn"), true);
  assert.equal(shouldReplaceAudioQueue("ebook"), true);
  assert.equal(shouldReplaceAudioQueue("copyright-free"), false);
});
