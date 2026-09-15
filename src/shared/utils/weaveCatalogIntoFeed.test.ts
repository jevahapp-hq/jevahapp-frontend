import assert from "node:assert/strict";
import { test } from "node:test";
import { weaveCatalogIntoFeed } from "./weaveCatalogIntoFeed";

const video = (id: string) =>
  ({ _id: id, contentType: "videos", fileUrl: "", title: id, createdAt: "" }) as any;
const sermon = (id: string) =>
  ({ _id: id, contentType: "sermon", fileUrl: "https://a", title: id, createdAt: "" }) as any;
const ebook = (id: string) =>
  ({ _id: id, contentType: "ebook", fileUrl: "https://b", title: id, createdAt: "" }) as any;

test("replaces discovery items with catalog records of the same id", () => {
  const mixed = weaveCatalogIntoFeed(
    [video("v1"), video("s1"), video("v2")],
    [sermon("s1")]
  );
  assert.equal(mixed.find((i) => i._id === "s1")?.contentType, "sermon");
  assert.deepEqual(
    mixed.map((i) => i._id),
    ["v1", "s1", "v2"]
  );
});

test("interleaves leftover catalog items from the first screen", () => {
  const mixed = weaveCatalogIntoFeed(
    [video("v1"), video("v2"), video("v3"), video("v4")],
    [sermon("s1"), ebook("e1")]
  );
  assert.deepEqual(
    mixed.map((i) => i._id),
    ["v1", "s1", "v2", "e1", "v3", "v4"]
  );
});

test("catalog-only list is used when ALL discovery is empty", () => {
  const mixed = weaveCatalogIntoFeed([], [sermon("s1"), sermon("s2")]);
  assert.deepEqual(
    mixed.map((i) => i._id),
    ["s1", "s2"]
  );
});
