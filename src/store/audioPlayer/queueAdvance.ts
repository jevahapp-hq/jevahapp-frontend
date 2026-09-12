export type RepeatMode = "none" | "all" | "one";

/** Repeat button: off ↔ loop this song. */
export function cycleRepeatOne(mode: RepeatMode | undefined): RepeatMode {
  return mode === "one" ? "none" : "one";
}

/**
 * Index to play after the current track.
 * `-1` means stop (end of queue, no wrap).
 * The current index means restart this song (repeat one, natural end).
 */
export function pickNextPlayableIndex(options: {
  length: number;
  currentIndex: number;
  repeatMode: RepeatMode | undefined;
  fromUser?: boolean;
  isFailed?: (index: number) => boolean;
}): number {
  const {
    length,
    currentIndex,
    repeatMode,
    fromUser = false,
    isFailed,
  } = options;
  if (length <= 0) return -1;

  const failed = (index: number) => {
    if (index < 0 || index >= length) return true;
    return isFailed ? isFailed(index) : false;
  };

  if (repeatMode === "one" && !fromUser && !failed(currentIndex)) {
    return currentIndex;
  }

  const pick = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      if (!failed(i)) return i;
    }
    return -1;
  };

  let nextIndex = pick(currentIndex + 1, length);
  if (nextIndex < 0 && repeatMode === "all") {
    nextIndex = pick(0, length);
  }
  return nextIndex;
}
