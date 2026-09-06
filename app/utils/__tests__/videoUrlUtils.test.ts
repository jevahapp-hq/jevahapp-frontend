import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractContentIdFromUrl,
  isCloudflareR2Url,
  validateVideoUrl,
} from "../videoUrlUtils";

test("validateVideoUrl rejects empty and non-http URLs", async () => {
  const empty = await validateVideoUrl("");
  assert.equal(empty.isValid, false);
  assert.equal(empty.error, "Empty or invalid URL");

  const invalid = await validateVideoUrl("invalid-url");
  assert.equal(invalid.isValid, false);
  assert.equal(invalid.error, "Invalid URL format");
});

test("isCloudflareR2Url detects R2 hosts", () => {
  assert.equal(
    isCloudflareR2Url(
      "https://870e0e55f75d0d9434531d7518f57e92.r2.cloudflarestorage.com/jevah/jevah/media-videos/video.mp4"
    ),
    true
  );
  assert.equal(isCloudflareR2Url("https://example.com/video.mp4"), false);
});

test("extractContentIdFromUrl reads the filename stem", () => {
  assert.equal(
    extractContentIdFromUrl("https://example.com/videos/content123.mp4"),
    "content123"
  );
  assert.equal(extractContentIdFromUrl("https://example.com/videos/content"), null);
});
