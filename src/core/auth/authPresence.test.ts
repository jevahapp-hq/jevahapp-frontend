import assert from "node:assert/strict";
import { test } from "node:test";
import { decideInteractionAuth } from "./authPresence";

const jwt = "aaa.bbb.ccc";

test("cached JWT is authenticated without waiting for disk", () => {
  assert.equal(
    decideInteractionAuth({ cachedToken: jwt, sessionHint: false }),
    "yes"
  );
});

test("MMKV session hint is enough for a logged-in tap", () => {
  assert.equal(
    decideInteractionAuth({ cachedToken: undefined, sessionHint: true }),
    "yes"
  );
});

test("hydrated empty token with no session is a guest", () => {
  assert.equal(
    decideInteractionAuth({ cachedToken: null, sessionHint: false }),
    "no"
  );
});

test("unhydrated token without a session hint stays unknown", () => {
  assert.equal(
    decideInteractionAuth({ cachedToken: undefined, sessionHint: false }),
    "unknown"
  );
});

test("invalid cached token does not count as signed in", () => {
  assert.equal(
    decideInteractionAuth({ cachedToken: "not-a-jwt", sessionHint: false }),
    "no"
  );
});
