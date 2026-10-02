import assert from "node:assert/strict";
import { test } from "node:test";
import {
  blockIndexAtTime,
  blockMarks,
  blockStartMs,
  pageChunks,
} from "./ebookNarrationSync";

test("paragraph highlight follows spoken word times", () => {
  const marks = blockMarks(
    ["In the beginning God", "created the heavens"],
    [
      { startMs: 80 },
      { startMs: 200 },
      { startMs: 340 },
      { startMs: 500 },
      { startMs: 900 },
      { startMs: 1100 },
      { startMs: 1400 },
    ]
  );
  assert.deepEqual(marks, [
    { blockIndex: 0, startMs: 80 },
    { blockIndex: 1, startMs: 900 },
  ]);
  assert.equal(blockIndexAtTime(marks, 100), 0);
  assert.equal(blockIndexAtTime(marks, 900), 1);
  assert.equal(blockStartMs(marks, 1), 900);
});

test("a short page starts as one recording", () => {
  const paragraphs = Array.from({ length: 4 }, (_, index) => `Paragraph ${index + 1}.`);
  const chunks = pageChunks(paragraphs);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].blockOffset, 0);
});

test("a long page starts with a short piece and still includes every paragraph", () => {
  const paragraphs = Array.from(
    { length: 12 },
    (_, index) => `Paragraph ${index + 1}. ${"word ".repeat(40)}`
  );
  const chunks = pageChunks(paragraphs);
  assert.ok(chunks.length > 1);
  assert.equal(chunks[0].blockOffset, 0);
  assert.deepEqual(
    chunks.flatMap((chunk) => chunk.blocks),
    paragraphs
  );
});
