import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPendingSignup,
  fillVerificationBoxes,
  normalizeAuthEmail,
  normalizeVerificationCode,
  resolveSignupCredentials,
  setPendingSignup,
  shouldLoginAfterVerifyFailure,
} from "./pendingSignup";

test("normalizeAuthEmail trims and lowercases", () => {
  assert.equal(normalizeAuthEmail("  Test.User@Email.COM "), "test.user@email.com");
});

test("normalizeVerificationCode trims without changing case or stripping digits", () => {
  assert.equal(normalizeVerificationCode("  aB12cD  "), "aB12cD");
});

test("fillVerificationBoxes puts a full autofill code in boxes 0-5 even from a later index", () => {
  assert.deepEqual(
    fillVerificationBoxes(["", "", "", "", "", ""], "aB12cD", 3),
    ["a", "B", "1", "2", "c", "D"]
  );
});

test("fillVerificationBoxes writes a single typed character at the focused index", () => {
  assert.deepEqual(
    fillVerificationBoxes(["a", "", "", "", "", ""], "B", 1),
    ["a", "B", "", "", "", ""]
  );
});

test("shouldLoginAfterVerifyFailure is true for 429 and already-verified messages", () => {
  assert.equal(shouldLoginAfterVerifyFailure(429, "Too many attempts"), true);
  assert.equal(shouldLoginAfterVerifyFailure(400, "Email already verified"), true);
  assert.equal(shouldLoginAfterVerifyFailure(400, "Invalid code"), false);
});

test("resolveSignupCredentials prefers stored signup over route params", () => {
  clearPendingSignup();
  setPendingSignup({
    email: "Jane@Example.com",
    password: "Secret1",
    firstName: "Jane",
    lastName: "Doe",
  });

  const resolved = resolveSignupCredentials({
    emailAddress: "other@example.com",
    password: "Wrong1",
    firstName: "Other",
    lastName: "Person",
  });

  assert.equal(resolved.email, "jane@example.com");
  assert.equal(resolved.password, "Secret1");
  assert.equal(resolved.firstName, "Jane");
  assert.equal(resolved.lastName, "Doe");
  clearPendingSignup();
});

test("resolveSignupCredentials falls back to route params including arrays", () => {
  clearPendingSignup();
  const resolved = resolveSignupCredentials({
    emailAddress: ["User+tag@Example.com"],
    password: ["Pass123"],
    firstName: ["Ada"],
    lastName: ["Lovelace"],
  });

  assert.equal(resolved.email, "user+tag@example.com");
  assert.equal(resolved.password, "Pass123");
  assert.equal(resolved.firstName, "Ada");
  assert.equal(resolved.lastName, "Lovelace");
});
