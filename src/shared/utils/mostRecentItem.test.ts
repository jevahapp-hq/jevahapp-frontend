import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "../types";
import { resolveMostRecentItem } from "./mostRecentItem.ts";

function item(id: string, createdAt?: string): MediaItem {
  return { _id: id, title: id, createdAt: createdAt || "" } as MediaItem;
}

test("picks the newest real createdAt, not the first shuffled row", () => {
  const chosen = resolveMostRecentItem(
    [
      item("shuffle-a", "2026-01-01T00:00:00.000Z"),
      item("newest", "2026-09-28T00:00:00.000Z"),
      item("shuffle-b", "2026-03-01T00:00:00.000Z"),
    ],
    null
  );
  assert.equal(chosen?._id, "newest");
});

test("keeps the original most recent when the list is reshuffled", () => {
  const first = resolveMostRecentItem(
    [
      item("newest", "2026-09-28T00:00:00.000Z"),
      item("older", "2026-01-01T00:00:00.000Z"),
    ],
    null
  );
  const reshuffled = resolveMostRecentItem(
    [
      item("older", "2026-01-01T00:00:00.000Z"),
      item("newest", "2026-09-28T00:00:00.000Z"),
      item("undated", ""),
    ],
    first?._id || null
  );
  assert.equal(reshuffled?._id, "newest");
});

test("undated rows do not replace a dated most recent", () => {
  const chosen = resolveMostRecentItem(
    [item("undated-a"), item("undated-b"), item("real", "2024-05-01T00:00:00.000Z")],
    "undated-a"
  );
  assert.equal(chosen?._id, "real");
});

test("a genuinely newer upload replaces the previous hero", () => {
  const chosen = resolveMostRecentItem(
    [
      item("old-hero", "2026-09-01T00:00:00.000Z"),
      item("just-uploaded", "2026-09-29T00:00:00.000Z"),
    ],
    "old-hero"
  );
  assert.equal(chosen?._id, "just-uploaded");
});

test("without dates, the previous row stays put across order changes", () => {
  const first = resolveMostRecentItem(
    [item("a"), item("b"), item("c")],
    null
  );
  const again = resolveMostRecentItem(
    [item("c"), item("b"), item("a")],
    first?._id || null
  );
  assert.equal(again?._id, first?._id);
});
