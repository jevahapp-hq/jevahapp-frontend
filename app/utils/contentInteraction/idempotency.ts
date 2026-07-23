import * as Crypto from "expo-crypto";

/**
 * One UUID per user gesture. Reuse only when retrying the same tap
 * (timeout / offline flush) — never across distinct taps.
 */
export function createGestureIdempotencyKey(): string {
  return Crypto.randomUUID();
}
