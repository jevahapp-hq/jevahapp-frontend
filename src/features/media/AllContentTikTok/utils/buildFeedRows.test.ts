import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFeedRows } from "./buildFeedRows";
import type { MediaItem } from "../../../../shared/types";

function item(id: string): MediaItem {
  return { _id: id, id, title: id } as MediaItem;
}

test("full All feed: most recent, first four, coming soon, then rest", () => {
  const rows = buildFeedRows({
    mostRecentItem: item("r"),
    firstFour: [item("1"), item("2"), item("3"), item("4")],
    rest: [item("5"), item("6")],
    activeTab: "ALL",
    filteredCount: 7,
    getFeedPlaybackKey: (m) => `ALL::${m._id}`,
    liteActive: false,
  });
  const types = rows.map((row) => row.rowType);
  assert.equal(types.includes("coming-soon"), true);
  assert.equal(rows.filter((row) => row.rowType === "media").length, 7);
});

test("Lite All feed never inserts Coming Soon — list stays one backbone", () => {
  const rows = buildFeedRows({
    mostRecentItem: item("r"),
    firstFour: [item("1"), item("2")],
    rest: [item("3")],
    activeTab: "ALL",
    filteredCount: 3,
    getFeedPlaybackKey: (m) => `ALL::${m._id}`,
    liteActive: true,
  });
  assert.equal(
    rows.some((row) => row.rowType === "coming-soon"),
    false
  );
});
