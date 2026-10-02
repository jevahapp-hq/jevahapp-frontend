import assert from "node:assert/strict";
import { test } from "node:test";
import { asUploadableVideoFile } from "./asUploadableVideoFile";

test("iPhone screen recordings upload as mp4", () => {
  const file = asUploadableVideoFile({
    uri: "file://clip.mov",
    name: "RPReplay_Final.mov",
    mimeType: "video/quicktime",
    size: 20_000_000,
  });
  assert.equal(file.mimeType, "video/mp4");
  assert.equal(file.name, "RPReplay_Final.mp4");
  assert.equal(file.uri, "file://clip.mov");
});

test("mp4 files are left unchanged", () => {
  const file = {
    name: "sermon.mp4",
    mimeType: "video/mp4",
  };
  assert.equal(asUploadableVideoFile(file), file);
});
