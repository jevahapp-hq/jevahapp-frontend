import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildChapterFromPage,
  buildWordPositions,
  firstReadableChapter,
  joinWords,
  nextReadableChapter,
  prevReadableChapter,
  readableChapterAtOrAfter,
  splitPageIntoBlocks,
  upsertChapter,
} from "../../app/reader/pdfText/buildEbookChapters";

test("page 1 becomes chapter 1 with paragraph blocks", () => {
  const chapter = buildChapterFromPage(
    1,
    "In the beginning God created the heavens.\n\nThe earth was without form and void."
  );
  assert.equal(chapter.chapterNumber, 1);
  assert.equal(chapter.isEmpty, false);
  assert.equal(chapter.blocks.length, 2);
  assert.match(chapter.blocks[0], /In the beginning/);
});

test("blank and page-number-only pages are empty chapters", () => {
  assert.equal(buildChapterFromPage(2, "   ").isEmpty, true);
  assert.equal(buildChapterFromPage(3, "12").isEmpty, true);
  assert.equal(splitPageIntoBlocks("").length, 0);
});

test("a single dense page is split into sentence groups", () => {
  const sentence = (n: number) =>
    `Sentence number ${n} adds enough words so the grouping threshold is crossed eventually in this paragraph of ebook text.`;
  const text = Array.from({ length: 8 }, (_, i) => sentence(i + 1)).join(" ");
  const blocks = splitPageIntoBlocks(text);
  assert.ok(blocks.length >= 2);
  assert.equal(blocks.join(" ").includes("Sentence number 1"), true);
});

test("word map matches the spoken string so highlighting can stay in sync", () => {
  const chapter = buildChapterFromPage(1, "Hello world.\n\nMore words here.");
  const words = buildWordPositions(chapter.blocks);
  assert.equal(joinWords(words), words.map((w) => w.word).join(" "));
  assert.equal(words[0].blockIndex, 0);
  assert.equal(words[0].word, "Hello");
  const more = words.find((w) => w.word === "More");
  assert.equal(more?.blockIndex, 1);
  assert.equal(more?.wordIndex, 0);
});

test("upsert fills missing pages so chapter N is always at index N-1", () => {
  let chapters = upsertChapter([], 3, "Chapter three body text that is long enough.");
  assert.equal(chapters.length, 3);
  assert.equal(chapters[0].isEmpty, true);
  assert.equal(chapters[2].chapterNumber, 3);
  assert.equal(chapters[2].isEmpty, false);
  chapters = upsertChapter(chapters, 1, "Chapter one opening paragraph lives here.");
  assert.equal(chapters[0].isEmpty, false);
  assert.equal(firstReadableChapter(chapters)?.chapterNumber, 1);
});

test("extractor html posts each PDF page as a numbered chapter source", () => {
  const { getPdfJsExtractorHtml } = require("../../app/reader/pdfText/pdfJsExtractorHtml") as {
    getPdfJsExtractorHtml: () => string;
  };
  const html = getPdfJsExtractorHtml();
  assert.match(html, /pdf\.min\.js/);
  assert.match(html, /window\.__extractPdf/);
  assert.match(html, /type: "page"/);
  assert.match(html, /pageNumber/);
});

test("next and previous readable chapters skip empty pages", () => {
  const chapters = [
    buildChapterFromPage(1, "Enough text for chapter one to count as readable."),
    buildChapterFromPage(2, ""),
    buildChapterFromPage(3, "Enough text for chapter three to count as readable."),
  ];
  assert.equal(nextReadableChapter(chapters, 1)?.chapterNumber, 3);
  assert.equal(prevReadableChapter(chapters, 3)?.chapterNumber, 1);
  assert.equal(nextReadableChapter(chapters, 3), undefined);
  assert.equal(readableChapterAtOrAfter(chapters, 2)?.chapterNumber, 3);
  assert.equal(readableChapterAtOrAfter(chapters, 1)?.chapterNumber, 1);
});
