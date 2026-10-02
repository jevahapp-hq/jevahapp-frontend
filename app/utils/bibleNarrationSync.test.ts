import assert from "node:assert/strict";
import { test } from "node:test";
import { bibleBookCode } from "./bibleBookCode";
import {
  parseNarrationTimings,
  spokenChapterVerses,
  verseNumberAtTime,
  verseStartMs,
  type VerseTiming,
} from "./bibleNarrationSync";

const timings: VerseTiming[] = [
  { verseNumber: 1, startMs: 8056, endMs: 11288 },
  { verseNumber: 2, startMs: 11288, endMs: 18000 },
  { verseNumber: 3, startMs: 18000, endMs: 24000 },
];

test("book names map to the audio Bible codes", () => {
  assert.equal(bibleBookCode("Genesis"), "GEN");
  assert.equal(bibleBookCode("1 Samuel"), "1SA");
  assert.equal(bibleBookCode("Psalms"), "PSA");
  assert.equal(bibleBookCode("Song of Solomon"), "SNG");
  assert.equal(bibleBookCode("Revelation"), "REV");
  assert.equal(bibleBookCode("Not A Book"), null);
});

test("the highlighted verse follows the recording", () => {
  assert.equal(verseNumberAtTime(timings, 1000), 1);
  assert.equal(verseNumberAtTime(timings, 8056), 1);
  assert.equal(verseNumberAtTime(timings, 11288), 2);
  assert.equal(verseNumberAtTime(timings, 20000), 3);
  assert.equal(verseNumberAtTime([], 0), null);
});

test("tapping a verse seeks to when that verse is spoken", () => {
  assert.equal(verseStartMs(timings, 2), 11288);
  assert.equal(verseStartMs(timings, 99), 8056);
});

test("the narrator reads the selected chapter's wording", () => {
  const spoken = spokenChapterVerses(
    [
      {
        bookName: "Genesis",
        chapterNumber: 1,
        verseNumber: 1,
        text: "In the beginning God created the heaven and the earth.",
      },
      {
        bookName: "Genesis",
        chapterNumber: 2,
        verseNumber: 1,
        text: "Thus the heavens and the earth were finished.",
      },
      {
        bookName: "Exodus",
        chapterNumber: 1,
        verseNumber: 1,
        text: "Now these are the names of the children of Israel.",
      },
    ],
    "Genesis",
    1
  );
  assert.deepEqual(
    spoken.map((verse) => verse.text),
    ["In the beginning God created the heaven and the earth."]
  );
});

test("recorded timings are one start time per verse", () => {
  const parsed = parseNarrationTimings([8.056, 11.288, 19.514]);
  assert.deepEqual(parsed, [
    { verseNumber: 1, startMs: 8056, endMs: 11288 },
    { verseNumber: 2, startMs: 11288, endMs: 19514 },
    { verseNumber: 3, startMs: 19514, endMs: 23514 },
  ]);
  assert.equal(verseNumberAtTime(parsed, 12000), 2);
});
