import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COVER_REQUIRED_TYPES,
  collectFileGuidelineErrors,
  formatUploadGuidelineMessage,
  isUploadFormReady,
} from "./eligibilityRules";
import { MAX_VIDEO_SIZE, validateFileSizeLimits } from "./sizeLimits";
import { isVideoMediaFile } from "./fileTypeDetection";
import { buildFileGuidelineErrors } from "./uploadFileInspect";

const MB = 1024 * 1024;

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

test("video size limit is 300MB so covers remain optional and large MP4s can post", () => {
  assert.equal(MAX_VIDEO_SIZE, 300 * MB);
  const under = validateFileSizeLimits(
    { name: "clip.mp4", mimeType: "video/mp4", size: 150 * MB },
    "videos"
  );
  assert.deepEqual(under, []);
  const over = validateFileSizeLimits(
    { name: "clip.mp4", mimeType: "video/mp4", size: 301 * MB },
    "videos"
  );
  assert.equal(over.length, 1);
  assert.match(over[0], /301/i);
  assert.match(over[0], /300\s*MB/i);
});

test("25MB camera videos (MP4 and MOV) meet the size rule and can post", () => {
  const mp4 = collectFileGuidelineErrors(
    { name: "clip.mp4", mimeType: "video/mp4", size: 25 * MB },
    "videos"
  );
  assert.deepEqual(mp4, []);

  const mov = collectFileGuidelineErrors(
    { name: "IMG_1234.MOV", mimeType: "video/quicktime", size: 25 * MB },
    "videos"
  );
  assert.deepEqual(mov, []);
});

test("when size is fine, format failures explain that size is not the problem", () => {
  const errors = buildFileGuidelineErrors(
    { name: "clip.mkv", mimeType: "video/x-matroska", size: 25 * MB },
    "videos",
    300 * MB
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /25/i);
  assert.match(errors[0], /size is fine/i);
  assert.match(errors[0], /MKV/i);
  assert.doesNotMatch(errors[0], /too large/i);

  const message = formatUploadGuidelineMessage(errors);
  assert.match(message, /size is fine/i);
  assert.match(message, /MP4 or MOV/i);
});
