import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findReelsIndexByContentId,
  parseNonNegativeInt,
  resolveReelsStartIndex,
} from "./reelsStartIndex";

const list = [
  { _id: "aaa" },
  { _id: "bbb" },
  { _id: "ccc" },
];

test("parseNonNegativeInt accepts 0 from string or number", () => {
  assert.equal(parseNonNegativeInt(0), 0);
  assert.equal(parseNonNegativeInt("0"), 0);
  assert.equal(parseNonNegativeInt("2"), 2);
  assert.equal(parseNonNegativeInt(""), null);
  assert.equal(parseNonNegativeInt(undefined), null);
});

test("findReelsIndexByContentId matches _id or id", () => {
  assert.equal(findReelsIndexByContentId(list, "bbb"), 1);
  assert.equal(findReelsIndexByContentId([{ id: "zzz" }], "zzz"), 0);
  assert.equal(findReelsIndexByContentId(list, "missing"), -1);
});

test("content id wins over a stale store index of 0", () => {
  assert.equal(
    resolveReelsStartIndex({
      paramIndex: "0",
      storeIndex: 0,
      resumeIndex: 0,
      contentId: "ccc",
      videoList: list,
    }),
    2
  );
});

test("params win when content id is missing", () => {
  assert.equal(
    resolveReelsStartIndex({
      paramIndex: "2",
      storeIndex: 0,
      videoList: list,
    }),
    2
  );
});

test("does not let store 0 shadow a param index", () => {
  assert.equal(
    resolveReelsStartIndex({
      paramIndex: "1",
      storeIndex: 0,
      videoList: list,
    }),
    1
  );
});
