import assert from "node:assert/strict";
import test from "node:test";
import { pickAuthSession } from "./pickAuthSession";

test("pickAuthSession reads top-level token and user", () => {
  const { token, user } = pickAuthSession({
    token: "abc.def.ghi",
    user: { firstName: "Ada" },
  });
  assert.equal(token, "abc.def.ghi");
  assert.equal(user.firstName, "Ada");
});

test("pickAuthSession reads nested data.token", () => {
  const { token, user } = pickAuthSession({
    success: true,
    data: { token: "nested.jwt.val", user: { lastName: "Lovelace" } },
  });
  assert.equal(token, "nested.jwt.val");
  assert.equal(user.lastName, "Lovelace");
});

test("pickAuthSession returns nulls for empty payloads", () => {
  assert.deepEqual(pickAuthSession(null), { token: null, user: null });
  assert.deepEqual(pickAuthSession({}), { token: null, user: null });
});
