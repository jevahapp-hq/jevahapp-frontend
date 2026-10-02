import assert from "node:assert/strict";
import test from "node:test";
import {
  churchesNearUser,
  churchProfileUpdate,
  isChurchPlaceName,
  manualChurchChoice,
  NEARBY_CHURCH_RADIUS_METERS,
} from "./churchProfile.ts";

test("a listed church keeps its id", () => {
  const body = churchProfileUpdate({
    name: "Grace Chapel",
    id: "church-1",
    type: "church",
    source: "internal",
  });
  assert.deepEqual(body, {
    location: "Grace Chapel",
    entityType: "church",
    entitySource: "internal",
    entityId: "church-1",
  });
});

test("a church that is not listed is saved from the typed name", () => {
  const body = churchProfileUpdate(manualChurchChoice("  House of Prayer  "));
  assert.equal(body?.location, "House of Prayer");
  assert.equal(body?.entitySource, "manual");
  assert.equal(body?.entityId, undefined);
});

test("a city or street from the map is not treated as a church", () => {
  assert.equal(isChurchPlaceName("Lagos, Nigeria"), false);
  assert.equal(
    isChurchPlaceName("Redeemed Christian Church of God, Lagos"),
    true
  );
});

test("nearby search keeps the closest church and drops one far away", () => {
  const origin = { lat: 6.5244, lng: 3.3792 };
  const near = churchesNearUser(
    [
      {
        name: "Far Chapel",
        location: { lat: 51.5074, lng: -0.1278 },
      },
      {
        name: "Neighborhood Church",
        location: { lat: 6.53, lng: 3.39 },
      },
    ],
    origin
  );
  assert.equal(near.length, 1);
  assert.equal(near[0].name, "Neighborhood Church");
  assert.ok(near[0].distanceMeters < NEARBY_CHURCH_RADIUS_METERS);
  assert.deepEqual(churchesNearUser(near, null), []);
});

test("a blank church name is not saved", () => {
  assert.equal(churchProfileUpdate(manualChurchChoice(" ")), null);
  assert.equal(churchProfileUpdate(manualChurchChoice("A")), null);
});
