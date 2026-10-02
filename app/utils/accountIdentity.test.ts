import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAccountIdentity,
  identityFromClerkUser,
  IncompleteAccountIdentityError,
  isPlaceholderName,
} from "./accountIdentity.ts";

test("rejects empty, Anonymous, and Unknown User identities", () => {
  assert.equal(isPlaceholderName("Anonymous"), true);
  assert.equal(isPlaceholderName("Unknown"), true);
  assert.equal(isPlaceholderName(""), true);
  assert.throws(
    () =>
      assertAccountIdentity({
        firstName: "Anonymous",
        lastName: "User",
        email: "ada@example.com",
      }),
    IncompleteAccountIdentityError
  );
  assert.throws(
    () =>
      assertAccountIdentity({
        firstName: "Unknown",
        lastName: "User",
        email: "ada@example.com",
      }),
    IncompleteAccountIdentityError
  );
  assert.throws(
    () =>
      assertAccountIdentity({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "",
      }),
    IncompleteAccountIdentityError
  );
});

test("accepts a real name and email", () => {
  assert.deepEqual(
    assertAccountIdentity({
      firstName: " Ada ",
      lastName: "Lovelace",
      email: "Ada@Example.com",
    }),
    {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    }
  );
});

test("reads Google fullName and Apple external account email", () => {
  const identity = identityFromClerkUser({
    fullName: "Grace Hopper",
    primaryEmailAddress: null,
    emailAddresses: [],
    externalAccounts: [
      {
        firstName: "Grace",
        lastName: "Hopper",
        emailAddress: "grace@example.com",
      },
    ],
  });
  assert.deepEqual(identity, {
    firstName: "Grace",
    lastName: "Hopper",
    email: "grace@example.com",
  });
});

test("does not invent identity when Apple hides the name", () => {
  assert.equal(
    identityFromClerkUser({
      firstName: null,
      lastName: null,
      primaryEmailAddress: { emailAddress: "relay@privaterelay.appleid.com" },
    }),
    null
  );
});
