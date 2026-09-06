import assert from "node:assert/strict";
import { test } from "node:test";
import { isUploadFormReady, COVER_REQUIRED_TYPES } from "./eligibilityRules";

test("thumbnail is never required for form readiness", () => {
  assert.equal(COVER_REQUIRED_TYPES.size, 0);
  assert.equal(
    isUploadFormReady({
      file: { uri: "x" },
      title: "Song",
      selectedCategory: "worship",
      selectedType: "music",
      thumbnail: null,
    }),
    true
  );
  assert.equal(
    isUploadFormReady({
      file: { uri: "x" },
      title: "Clip",
      selectedCategory: "gospel",
      selectedType: "videos",
    }),
    true
  );
});
