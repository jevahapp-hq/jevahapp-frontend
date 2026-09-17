import assert from "node:assert/strict";
import { test } from "node:test";
import { pdfCacheFileName } from "./pdfCachePath";

test("pdf cache names are flat and unique per URL", () => {
  const url =
    "https://pub-17c463321ed44e22ba0d23a3505140ac.r2.dev/jevah/media-books/Wallis, Arthur - God's chosen fast.pdf";
  const name = pdfCacheFileName(url);
  assert.match(name, /^[0-9a-f]+\.pdf$/);
  assert.equal(name.includes("/"), false);
  assert.equal(name.includes("%"), false);
  assert.equal(pdfCacheFileName(url), name);
  assert.notEqual(pdfCacheFileName(`${url}?v=2`), name);
});
