import assert from "node:assert/strict";
import { test } from "node:test";
import { chunkWordsForSpeech, chunkWordsForCalmReading, breathPauseMs, markBreathAtBoundary, splitWords } from "./chunkSpeechText";

test("short text stays a single chunk", () => {
  const words = splitWords("In the beginning God created the heavens.");
  const chunks = chunkWordsForSpeech(words, 80);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].startWord, 0);
  assert.match(chunks[0].text, /In the beginning/);
});

test("long text splits on word boundaries under the cap", () => {
  const words = Array.from({ length: 40 }, (_, i) => `word${i}`);
  const chunks = chunkWordsForSpeech(words, 24);
  assert.ok(chunks.length > 1);
  chunks.forEach((chunk) => {
    assert.ok(chunk.text.length <= 24);
    assert.equal(chunk.text.includes("  "), false);
  });
  assert.equal(
    chunks.map((c) => c.text).join(" "),
    words.join(" ")
  );
});

test("calm reading breaks at sentences and keeps every word", () => {
  const words = splitWords(
    "In the beginning God created the heavens. The earth was without form."
  );
  const chunks = chunkWordsForCalmReading(words, 400);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].text, "In the beginning God created the heavens.");
  assert.equal(chunks[0].startWord, 0);
  assert.equal(chunks[1].startWord, 7);
  assert.equal(breathPauseMs(chunks[0].text), 320);
  assert.equal(
    chunks.map((chunk) => chunk.text).join(" "),
    words.join(" ")
  );
});

test("a verse boundary gains a period without adding a word", () => {
  assert.equal(markBreathAtBoundary("earth", true), "earth.");
  assert.equal(markBreathAtBoundary("earth.", true), "earth.");
  assert.equal(markBreathAtBoundary("earth,", true), "earth.");
  assert.equal(markBreathAtBoundary("earth", false), "earth");
});
