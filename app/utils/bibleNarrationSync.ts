export type VerseTiming = {
  verseNumber: number;
  startMs: number;
  endMs: number;
};

/** Which verse the recording has reached. Times are milliseconds. */
export function verseNumberAtTime(
  timings: readonly VerseTiming[],
  positionMs: number
): number | null {
  if (timings.length === 0 || !Number.isFinite(positionMs)) return null;
  if (positionMs < timings[0].startMs) return timings[0].verseNumber;
  let current = timings[0];
  for (const row of timings) {
    if (positionMs >= row.startMs) current = row;
    else break;
  }
  return current.verseNumber;
}

export function verseStartMs(
  timings: readonly VerseTiming[],
  verseNumber: number
): number {
  const row = timings.find((timing) => timing.verseNumber === verseNumber);
  return row ? row.startMs : timings[0]?.startMs ?? 0;
}

/**
 * HelloAO timings are start times in seconds, one per verse:
 * `{ verses: [8.056, 11.288, ...] }`.
 * Older payloads used `[start, end]` pairs. Both become millisecond ranges.
 */
export function parseNarrationTimings(verses: unknown): VerseTiming[] {
  if (!Array.isArray(verses) || verses.length === 0) return [];
  if (Array.isArray(verses[0])) {
    const timings: VerseTiming[] = [];
    verses.forEach((pair, index) => {
      if (!Array.isArray(pair) || pair.length < 2) return;
      const start = Number(pair[0]);
      const end = Number(pair[1]);
      if (!Number.isFinite(start)) return;
      timings.push({
        verseNumber: index + 1,
        startMs: Math.round(start * 1000),
        endMs: Math.round((Number.isFinite(end) ? end : start) * 1000),
      });
    });
    return timings;
  }
  const starts = verses
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  return starts.map((start, index) => {
    const next = starts[index + 1];
    return {
      verseNumber: index + 1,
      startMs: Math.round(start * 1000),
      endMs: Math.round((next ?? start + 4) * 1000),
    };
  });
}

export type SpokenChapterVerse = {
  bookName?: string;
  chapterNumber?: number;
  verseNumber: number;
  text: string;
};

/** Verses the narrator should read for the chapter on screen. */
export function spokenChapterVerses(
  verses: readonly SpokenChapterVerse[],
  bookName: string,
  chapterNumber: number
): { verseNumber: number; text: string }[] {
  return verses
    .filter((verse) => {
      if (!verse.text?.trim()) return false;
      if (verse.bookName && verse.bookName !== bookName) return false;
      if (
        typeof verse.chapterNumber === "number" &&
        verse.chapterNumber !== chapterNumber
      ) {
        return false;
      }
      return true;
    })
    .map((verse) => ({
      verseNumber: verse.verseNumber,
      text: verse.text.trim(),
    }));
}
