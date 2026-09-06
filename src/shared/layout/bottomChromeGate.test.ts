import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isBottomChromeMounted,
  releaseBottomChrome,
  retainBottomChrome,
} from "./bottomChromeGate";

test("chrome is inactive until retained", () => {
  while (isBottomChromeMounted()) releaseBottomChrome();
  assert.equal(isBottomChromeMounted(), false);
  retainBottomChrome();
  assert.equal(isBottomChromeMounted(), true);
  releaseBottomChrome();
  assert.equal(isBottomChromeMounted(), false);
});

test("nested retains need matching releases", () => {
  while (isBottomChromeMounted()) releaseBottomChrome();
  retainBottomChrome();
  retainBottomChrome();
  releaseBottomChrome();
  assert.equal(isBottomChromeMounted(), true);
  releaseBottomChrome();
  assert.equal(isBottomChromeMounted(), false);
});
