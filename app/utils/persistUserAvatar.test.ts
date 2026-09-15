import assert from "node:assert/strict";
import test from "node:test";
import { patchUserAvatar, pickDisplayAvatarUrl } from "./persistUserAvatar";

test("pickDisplayAvatarUrl prefers avatar over stale avatarUpload", () => {
  assert.equal(
    pickDisplayAvatarUrl({
      avatar: "https://cdn.example.com/new.jpg",
      avatarUpload: "https://cdn.example.com/old.jpg",
    }),
    "https://cdn.example.com/new.jpg"
  );
});

test("pickDisplayAvatarUrl falls back to avatarUpload", () => {
  assert.equal(
    pickDisplayAvatarUrl({
      avatar: null,
      avatarUpload: "https://cdn.example.com/upload.jpg",
    }),
    "https://cdn.example.com/upload.jpg"
  );
});

test("pickDisplayAvatarUrl appends cache-bust version", () => {
  assert.equal(
    pickDisplayAvatarUrl({
      avatar: "https://cdn.example.com/pic.jpg",
      avatarUpdatedAt: 123,
    }),
    "https://cdn.example.com/pic.jpg?v=123"
  );
});

test("patchUserAvatar writes both avatar fields", () => {
  const next = patchUserAvatar(
    { firstName: "Ada", avatarUpload: "old.jpg" },
    "https://cdn.example.com/new.jpg"
  );
  assert.equal(next?.avatar, "https://cdn.example.com/new.jpg");
  assert.equal(next?.avatarUpload, "https://cdn.example.com/new.jpg");
  assert.equal(typeof next?.avatarUpdatedAt, "number");
});
