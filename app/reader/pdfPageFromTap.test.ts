import test from "node:test";
import assert from "node:assert/strict";
import { pageFromScrollPosition, pdfPageCountFromSnippet } from "./pdfPageFromTap";

test("tap near the top of a known document is page 1", () => {
  assert.equal(pageFromScrollPosition(0, 20, 1400, 700, 400, 14), 1);
});

test("tap uses the page under the finger, not the top of the screen", () => {
  // 14 pages across 1400px => 100px each. Scroll 200, tap 150px down => y 350 => page 4.
  assert.equal(pageFromScrollPosition(200, 150, 1400, 700, 400, 14), 4);
});

test("page count is the root Pages tree, not a nested one", () => {
  const snippet = "/Type /Pages /Kids [] /Count 2 << /Type /Pages /Count 14 >>";
  assert.equal(pdfPageCountFromSnippet(snippet), 14);
});
