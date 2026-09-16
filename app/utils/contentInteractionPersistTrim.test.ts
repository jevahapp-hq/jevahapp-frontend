import assert from "node:assert/strict";
import { test } from "node:test";
import { trimInteractionMap } from "./contentInteractionPersistTrim";

test("keeps maps under the cap unchanged", () => {
  const map = { a: { likes: 1, updatedAt: 2 } };
  assert.equal(trimInteractionMap(map, 10), map);
});

test("drops the oldest entries when over cap", () => {
  const map = {
    old: { likes: 1, updatedAt: 1 },
    mid: { likes: 2, updatedAt: 5 },
    new: { likes: 3, updatedAt: 9 },
  };
  const trimmed = trimInteractionMap(map, 2);
  assert.deepEqual(Object.keys(trimmed).sort(), ["mid", "new"]);
});
