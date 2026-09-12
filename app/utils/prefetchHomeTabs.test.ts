import assert from "node:assert/strict";
import { test } from "node:test";
import { homeTabModuleLoaderCount } from "./prefetchHomeTabs";

test("home tab warmup covers community, library, music, hymns, and live", () => {
  assert.equal(homeTabModuleLoaderCount(), 7);
});
