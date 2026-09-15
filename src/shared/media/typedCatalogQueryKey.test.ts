import assert from "node:assert/strict";
import { test } from "node:test";
import { typedCatalogQueryKey } from "./typedCatalogKeys";

test("typed catalog keys are not default-content", () => {
  assert.deepEqual(typedCatalogQueryKey("sermon", 12), ["sermons", 12]);
  assert.deepEqual(typedCatalogQueryKey("ebook", 12), ["ebooks", 12]);
  assert.deepEqual(typedCatalogQueryKey("music", 12), ["music-tracks", 12]);
  for (const kind of ["sermon", "ebook", "music"] as const) {
    assert.notEqual(typedCatalogQueryKey(kind, 12)[0], "default-content");
  }
});
