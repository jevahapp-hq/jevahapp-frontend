import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isEbookFeedActive,
  isEbookReaderPath,
  setEbookFeedActive,
} from "./createFabGate";

test("the create button stays off the ebook feed only while that page is open", () => {
  setEbookFeedActive(false);
  assert.equal(isEbookFeedActive(), false);
  setEbookFeedActive(true);
  assert.equal(isEbookFeedActive(), true);
  setEbookFeedActive(false);
  assert.equal(isEbookFeedActive(), false);
});

test("reader routes are ebook pages", () => {
  assert.equal(isEbookReaderPath("/reader/PdfViewer"), true);
  assert.equal(isEbookReaderPath("/reader/EbookReadAloud"), true);
  assert.equal(isEbookReaderPath("/categories/ViewContent/ViewEbook"), true);
  assert.equal(isEbookReaderPath("/categories/HomeScreen"), false);
});
