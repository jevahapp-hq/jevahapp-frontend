/**
 * Pure single / double-tap recognizer for media surfaces.
 * Keeps gesture timing out of React components (SOLID: single responsibility).
 */

export type MediaTapKind = "single" | "double";

export type MediaTapRecognizerOptions = {
  /** Max gap between taps to count as a double tap */
  doubleTapMs?: number;
  /** Delay before committing a single tap (must be < doubleTapMs) */
  singleTapDelayMs?: number;
};

export type MediaTapRecognizer = {
  onPress: () => void;
  reset: () => void;
  dispose: () => void;
};

export function createMediaTapRecognizer(
  handlers: {
    onSingleTap: () => void;
    onDoubleTap: () => void;
  },
  options: MediaTapRecognizerOptions = {}
): MediaTapRecognizer {
  const doubleTapMs = options.doubleTapMs ?? 280;
  const singleTapDelayMs = options.singleTapDelayMs ?? 200;

  let tapCount = 0;
  let lastTapAt = 0;
  let singleTimer: ReturnType<typeof setTimeout> | null = null;

  const clearSingleTimer = () => {
    if (singleTimer) {
      clearTimeout(singleTimer);
      singleTimer = null;
    }
  };

  const reset = () => {
    tapCount = 0;
    lastTapAt = 0;
    clearSingleTimer();
  };

  const onPress = () => {
    const now = Date.now();
    const gap = now - lastTapAt;

    if (gap > doubleTapMs) tapCount = 0;
    tapCount += 1;
    lastTapAt = now;
    clearSingleTimer();

    if (tapCount >= 2 && gap <= doubleTapMs) {
      tapCount = 0;
      handlers.onDoubleTap();
      return;
    }

    singleTimer = setTimeout(() => {
      if (tapCount === 1) handlers.onSingleTap();
      tapCount = 0;
      singleTimer = null;
    }, singleTapDelayMs);
  };

  return {
    onPress,
    reset,
    dispose: reset,
  };
}
