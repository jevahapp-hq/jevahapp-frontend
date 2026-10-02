import assert from "node:assert/strict";
import test from "node:test";
import { extractUploadedMedia } from "./extractUploadedMedia.ts";

test("reads a nested upload that has an id before fileUrl is ready", () => {
  const media = extractUploadedMedia({
    success: true,
    data: {
      media: {
        id: "abc123",
        title: "Sunday message",
        contentType: "videos",
        processingStatus: "processing",
      },
    },
  });
  assert.equal(media?._id, "abc123");
  assert.equal(media?.fileUrl, "");
  assert.equal(media?.contentType, "videos");
  assert.equal(media?.processingStatus, "processing");
});

test("prefers the nested media document over a wrapper id", () => {
  const media = extractUploadedMedia({
    success: true,
    data: {
      _id: "6ab06dff93e9b3af88a6d1c5",
      media: {
        _id: "6ab0724f93e9b3af88a6d404",
        title: "Sunday message",
        fileUrl: "https://cdn.example.com/jevah/media-videos/6ab0724f93e9b3af88a6d404-video.mp4",
        contentType: "videos",
      },
    },
  });
  assert.equal(media?._id, "6ab0724f93e9b3af88a6d404");
  assert.match(media?.fileUrl || "", /6ab0724f93e9b3af88a6d404-video/);
});

test("reads fileUrl from the current data payload", () => {
  const media = extractUploadedMedia({
    data: {
      _id: "507f1f77bcf86cd799439011",
      title: "Clip",
      fileUrl: "https://cdn.example.com/clip.mp4",
    },
  });
  assert.equal(media?.fileUrl, "https://cdn.example.com/clip.mp4");
});
