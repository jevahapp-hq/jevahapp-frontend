import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  isVideoFullscreenActive,
  resolveRootHardwareBack,
  runFullscreenBackExit,
  setFullscreenBackExit,
} from "./fullscreenBackSession";

afterEach(() => {
  setFullscreenBackExit(null);
});

test("inactive session does not consume back and allows leaving the app", () => {
  assert.equal(isVideoFullscreenActive(), false);
  assert.equal(runFullscreenBackExit(), false);
  assert.equal(resolveRootHardwareBack(), "app-exit");
});

test("active fullscreen consumes back, exits once, and keeps the app open", () => {
  let exits = 0;
  setFullscreenBackExit(() => {
    exits += 1;
  });

  assert.equal(isVideoFullscreenActive(), true);
  assert.equal(resolveRootHardwareBack(), "exit-fullscreen");
  assert.equal(exits, 1);
  assert.equal(isVideoFullscreenActive(), true);
});

test("cleared session restores leaving the app on back", () => {
  let exits = 0;
  setFullscreenBackExit(() => {
    exits += 1;
  });
  setFullscreenBackExit(null);

  assert.equal(isVideoFullscreenActive(), false);
  assert.equal(resolveRootHardwareBack(), "app-exit");
  assert.equal(exits, 0);
});

test("replacing the exit handler uses the latest fullscreen close", () => {
  const calls: string[] = [];
  setFullscreenBackExit(() => {
    calls.push("stale");
  });
  setFullscreenBackExit(() => {
    calls.push("latest");
  });

  assert.equal(runFullscreenBackExit(), true);
  assert.deepEqual(calls, ["latest"]);
});

test("failure: exit throw still reports fullscreen as active until cleared", () => {
  setFullscreenBackExit(() => {
    throw new Error("navigation failed");
  });

  assert.throws(() => runFullscreenBackExit(), /navigation failed/);
  assert.equal(isVideoFullscreenActive(), true);

  setFullscreenBackExit(null);
  assert.equal(resolveRootHardwareBack(), "app-exit");
});
