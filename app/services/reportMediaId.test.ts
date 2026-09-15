import assert from "node:assert/strict";
import { test } from "node:test";
import { getItemMediaId, resolveReportMediaId } from "./reportMediaId";

test("resolveReportMediaId trims strings and unwraps Mongo-style objects", () => {
  assert.equal(resolveReportMediaId("  64f1ab2c3d4e5f60718293a4  "), "64f1ab2c3d4e5f60718293a4");
  assert.equal(resolveReportMediaId({ $oid: "64f1ab2c3d4e5f60718293a4" }), "64f1ab2c3d4e5f60718293a4");
  assert.equal(resolveReportMediaId({ _id: "abc123" }), "abc123");
  assert.equal(resolveReportMediaId(""), "");
  assert.equal(resolveReportMediaId(null), "");
});

test("getItemMediaId prefers _id and falls back to id", () => {
  assert.equal(getItemMediaId({ _id: "media-1", id: "other" }), "media-1");
  assert.equal(getItemMediaId({ id: "media-2" }), "media-2");
  assert.equal(getItemMediaId({ _id: { $oid: "64f1ab2c3d4e5f60718293a4" } }), "64f1ab2c3d4e5f60718293a4");
  assert.equal(getItemMediaId(null), "");
});
