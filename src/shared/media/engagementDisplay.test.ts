import assert from "node:assert/strict";
import { test } from "node:test";
import {
  commentCountFromMetadata,
  libraryItemMatchesId,
  resolveCommentDisplayCount,
} from "./engagementDisplay";

test("comment metadata counts an array of comments", () => {
  assert.equal(commentCountFromMetadata({ comments: [{}, {}] as any }), 2);
});

test("confirmed store comments win even when the feed payload is higher", () => {
  assert.equal(
    resolveCommentDisplayCount({
      storeComments: 0,
      commentsConfirmed: true,
      fallback: 9,
    }),
    0
  );
});

test("unconfirmed comments keep the larger of store and feed", () => {
  assert.equal(
    resolveCommentDisplayCount({
      storeComments: 2,
      commentsConfirmed: false,
      fallback: 5,
    }),
    5
  );
  assert.equal(
    resolveCommentDisplayCount({
      storeComments: 8,
      commentsConfirmed: false,
      fallback: 1,
    }),
    8
  );
});

test("library ids match either the content id or the surface key", () => {
  assert.equal(
    libraryItemMatchesId(
      { id: "abc", originalKey: "reel-abc-title" },
      "abc"
    ),
    true
  );
  assert.equal(
    libraryItemMatchesId(
      { id: "abc", originalKey: "reel-abc-title" },
      "reel-abc-title"
    ),
    true
  );
  assert.equal(libraryItemMatchesId({ id: "abc" }, "other"), false);
});
