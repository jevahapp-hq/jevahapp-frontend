/**
 * Which reel is allowed to make sound. Every player subscribes so a clip
 * that has been scrolled away pauses in the same turn, not on the next render.
 */
import { Platform } from "react-native";

let locked = false;
let audibleKey: string | null = null;
let scrolling = false;
const listeners = new Set<() => void>();

function emitAudible(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeAudibleReel(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAudibleReel(): string | null {
  return audibleKey;
}

/** True while a finger or fling is moving the Android reel list. */
export function androidReelsScrolling(): boolean {
  return Platform.OS === "android" && scrolling;
}

export function setAndroidReelsScrolling(next: boolean): void {
  if (Platform.OS !== "android") return;
  scrolling = next;
}

let reelTouchMoved = false;
let resetScrollGuard: (() => void) | null = null;

/** Lets the list clear its one-shot scroll marker when a new finger lands. */
export function registerReelScrollGuard(reset: () => void): () => void {
  resetScrollGuard = reset;
  return () => {
    if (resetScrollGuard === reset) resetScrollGuard = null;
  };
}

/** A new finger-down. A later scroll must not count as a tap. */
export function beginReelTouch(): void {
  reelTouchMoved = false;
  resetScrollGuard?.();
}

/** The list actually moved, so this gesture is a scroll. */
export function markReelTouchMoved(): void {
  reelTouchMoved = true;
}

export function reelTouchMovedDuringGesture(): boolean {
  return reelTouchMoved;
}

export function lockAndroidReels(): void {
  if (locked && audibleKey == null) return;
  locked = true;
  audibleKey = null;
  emitAudible();
}

export function setAndroidAudibleReel(key: string | null): void {
  const nextLocked = key == null;
  if (audibleKey === key && locked === nextLocked) return;
  locked = nextLocked;
  audibleKey = key;
  emitAudible();
}

/**
 * Only the reel on screen may unmute. Until one is chosen, the active reel
 * may play. After a handoff, every other clip stays silent.
 */
export function androidReelMayHear(videoKey: string): boolean {
  if (!locked && audibleKey == null) return true;
  return audibleKey === videoKey;
}
