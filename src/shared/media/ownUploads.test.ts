import assert from "node:assert/strict";
import test from "node:test";
import {
  forgetDeletedMedia,
  forgetOwnUploads,
  ingestAccountVideos,
  isRememberedOwnUpload,
  mergeOwnUploads,
  rememberOwnUpload,
  resetOwnUploadsForTests,
} from "./ownUploads.ts";

test("keeps a just-uploaded video ahead of the ranked feed", () => {
  resetOwnUploadsForTests();
  rememberOwnUpload({
    _id: "upload-1",
    title: "New clip",
    contentType: "videos",
    fileUrl: "file:///clip.mp4",
    createdAt: "2026-09-26T00:00:00.000Z",
    moderationStatus: "under_review",
    uploadedBy: { _id: "owner-1" },
  });

  assert.equal(isRememberedOwnUpload({ _id: "upload-1" }), true);
  const merged = mergeOwnUploads([
    {
      _id: "other",
      title: "Ranked",
      contentType: "videos",
      fileUrl: "https://cdn.example.com/a.mp4",
      createdAt: "2026-09-26T00:00:00.000Z",
      moderationStatus: "approved",
    },
  ]);
  assert.equal(merged[0]._id, "upload-1");
  assert.equal(merged[1]._id, "other");
});

test("a deleted video stays off this phone even if it is pinned again", () => {
  resetOwnUploadsForTests();
  rememberOwnUpload({
    _id: "upload-1",
    title: "New clip",
    contentType: "videos",
    fileUrl: "file:///clip.mp4",
    createdAt: "2026-09-26T00:00:00.000Z",
    moderationStatus: "under_review",
    uploadedBy: { _id: "owner-1" },
  });
  forgetOwnUploads(["upload-1"]);
  assert.equal(isRememberedOwnUpload({ _id: "upload-1" }), false);
  rememberOwnUpload({
    _id: "upload-1",
    title: "New clip",
    contentType: "videos",
    fileUrl: "file:///clip.mp4",
    createdAt: "2026-09-26T00:00:00.000Z",
    moderationStatus: "under_review",
    uploadedBy: { _id: "owner-1" },
  });
  ingestAccountVideos(
    [{ _id: "upload-1", title: "New clip", moderationStatus: "under_review" }],
    "owner-1"
  );
  assert.deepEqual(mergeOwnUploads([]), []);
  const stillListed = mergeOwnUploads([
    {
      _id: "upload-1",
      title: "New clip",
      contentType: "videos",
      fileUrl: "file:///clip.mp4",
      createdAt: "2026-09-26T00:00:00.000Z",
      moderationStatus: "under_review",
    },
  ]);
  assert.deepEqual(stillListed, []);
});

test("a deleted file stays hidden when another row uses the same file", () => {
  resetOwnUploadsForTests();
  forgetDeletedMedia({
    _id: "temp-1",
    fileUrl: "file:///clip.mp4",
    imageUrl: "file:///cover.jpg",
  });
  const merged = mergeOwnUploads([
    {
      _id: "server-row",
      title: "New clip",
      contentType: "videos",
      fileUrl: "file:///clip.mp4",
      createdAt: "2026-09-26T00:00:00.000Z",
      moderationStatus: "approved",
    },
  ]);
  assert.deepEqual(merged, []);
});

test("a pinned copy of the same file is not added beside the feed row", () => {
  resetOwnUploadsForTests();
  rememberOwnUpload({
    _id: "local-1",
    title: "New clip",
    contentType: "videos",
    fileUrl: "https://cdn.example.com/clip.mp4",
    createdAt: "2026-09-26T00:00:00.000Z",
    moderationStatus: "under_review",
    uploadedBy: { _id: "owner-1" },
  });
  const merged = mergeOwnUploads(
    [
      {
        _id: "server-1",
        title: "New clip",
        contentType: "videos",
        fileUrl: "https://cdn.example.com/clip.mp4?token=1",
        createdAt: "2026-09-26T00:00:00.000Z",
        moderationStatus: "under_review",
      },
    ],
    undefined,
    "owner-1"
  );
  assert.deepEqual(
    merged.map((item) => item._id),
    ["server-1"]
  );
});

test("account videos that are still in review are pinned, approved ones are not", () => {
  resetOwnUploadsForTests();
  ingestAccountVideos(
    [
      { _id: "pending-1", title: "Waiting", moderationStatus: "under_review" },
      { _id: "live-1", title: "Public", moderationStatus: "approved" },
    ],
    "owner-1"
  );
  const merged = mergeOwnUploads([]);
  assert.deepEqual(
    merged.map((item) => item._id),
    ["pending-1"]
  );
  const otherViewer = mergeOwnUploads([], undefined, "someone-else");
  assert.deepEqual(otherViewer, []);
});

test("an approved account video drops the under-review pin", () => {
  resetOwnUploadsForTests();
  rememberOwnUpload({
    _id: "upload-1",
    title: "New clip",
    contentType: "videos",
    fileUrl: "https://cdn.example.com/clip.mp4",
    createdAt: "2026-09-26T00:00:00.000Z",
    moderationStatus: "under_review",
    uploadedBy: { _id: "owner-1" },
  });
  ingestAccountVideos(
    [{ _id: "upload-1", title: "New clip", moderationStatus: "approved" }],
    "owner-1"
  );
  const merged = mergeOwnUploads([], undefined, "owner-1");
  assert.equal(merged[0]?.moderationStatus, "approved");
});
