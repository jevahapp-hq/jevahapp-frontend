import { bibleBookCode } from "../utils/bibleBookCode";
import {
  parseNarrationTimings,
  type VerseTiming,
} from "../utils/bibleNarrationSync";

const AUDIO = "https://audio.bible.helloao.org";
const API = "https://bible.helloao.org";

export const BIBLE_NARRATORS = [
  { id: "david", name: "David" },
  { id: "hays", name: "Hays" },
  { id: "souer", name: "Souer" },
] as const;

export type BibleNarratorId = (typeof BIBLE_NARRATORS)[number]["id"];

export function narrationAudioUrl(
  bookName: string,
  chapterNumber: number,
  readerId: string
): string | null {
  const code = bibleBookCode(bookName);
  if (!code || !chapterNumber) return null;
  return `${AUDIO}/api/BSB/${code}/${chapterNumber}/audio/${readerId}.mp3`;
}

function timingsUrl(
  bookName: string,
  chapterNumber: number,
  readerId: string
): string | null {
  const code = bibleBookCode(bookName);
  if (!code || !chapterNumber) return null;
  return `${API}/api/BSB/${code}/${chapterNumber}.${readerId}.audioTimings.json`;
}

const timingCache = new Map<string, Promise<VerseTiming[]>>();

export function loadNarrationTimings(
  bookName: string,
  chapterNumber: number,
  readerId: string
): Promise<VerseTiming[]> {
  const url = timingsUrl(bookName, chapterNumber, readerId);
  if (!url) return Promise.resolve([]);
  const cached = timingCache.get(url);
  if (cached) return cached;
  const pending = fetch(url)
    .then(async (res) => {
      if (!res.ok) return [];
      const body = (await res.json()) as { verses?: unknown };
      return parseNarrationTimings(body.verses);
    })
    .catch((error) => {
      timingCache.delete(url);
      console.warn("Bible narration timings failed", error);
      return [];
    });
  timingCache.set(url, pending);
  return pending;
}
