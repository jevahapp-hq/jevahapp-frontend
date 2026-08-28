/**
 * On-device Bible cache, scoped by translationId.
 * @see docs/BACKEND_BIBLE_OFFLINE_TRANSLATIONS.md
 */
import {
  mmkvGetJson,
  mmkvSetJson,
} from "../../src/shared/cache/mmkvStorage";
import type { BibleBook, BibleChapter, BibleVerse } from "./bibleApiService";
import { DEFAULT_TRANSLATION_ID } from "./bibleTranslations";

/**
 * Scripture text for a given translation is immutable, so a cache hit is
 * revalidated rarely rather than on every read.
 */
export const BIBLE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function stampKey(key: string) {
  return `bible_fetched_at:${key}`;
}

function markFetched(key: string): void {
  mmkvSetJson(stampKey(key), Date.now());
}

function isFresh(key: string): boolean {
  const at = mmkvGetJson<number>(stampKey(key));
  return typeof at === "number" && Date.now() - at < BIBLE_CACHE_TTL_MS;
}

export function areBooksFresh(translationId?: string): boolean {
  return isFresh(booksKey(translationId));
}

export function areChaptersFresh(
  bookName: string,
  translationId?: string
): boolean {
  return isFresh(chaptersKey(bookName, translationId));
}

export function areVersesFresh(
  bookName: string,
  chapterNumber: number,
  translationId?: string
): boolean {
  return isFresh(versesKey(bookName, chapterNumber, translationId));
}

function lastReadKey(translationId?: string) {
  return `bible_last_read_v2:${tid(translationId)}`;
}

export type BibleLastRead = {
  bookName: string;
  chapterNumber: number;
  testament?: "old" | "new";
  chapterCount?: number;
  translationId?: string;
};

function tid(translationId?: string) {
  return (translationId || DEFAULT_TRANSLATION_ID).toLowerCase();
}

function booksKey(translationId?: string) {
  return `bible_books_v2:${tid(translationId)}`;
}

function chaptersKey(bookName: string, translationId?: string) {
  return `bible_chapters_v2:${tid(translationId)}:${bookName}`;
}

function versesKey(
  bookName: string,
  chapterNumber: number,
  translationId?: string
) {
  return `bible_verses_v2:${tid(translationId)}:${bookName}:${chapterNumber}`;
}

export function getCachedBooks(translationId?: string): BibleBook[] | null {
  const books = mmkvGetJson<BibleBook[]>(booksKey(translationId));
  return Array.isArray(books) && books.length > 0 ? books : null;
}

export function setCachedBooks(
  books: BibleBook[],
  translationId?: string
): void {
  if (books?.length) {
    mmkvSetJson(booksKey(translationId), books);
    markFetched(booksKey(translationId));
  }
}

export function getCachedChapters(
  bookName: string,
  translationId?: string
): BibleChapter[] | null {
  const chapters = mmkvGetJson<BibleChapter[]>(
    chaptersKey(bookName, translationId)
  );
  return Array.isArray(chapters) && chapters.length > 0 ? chapters : null;
}

export function setCachedChapters(
  bookName: string,
  chapters: BibleChapter[],
  translationId?: string
): void {
  if (chapters?.length) {
    mmkvSetJson(chaptersKey(bookName, translationId), chapters);
    markFetched(chaptersKey(bookName, translationId));
  }
}

export function getCachedVerses(
  bookName: string,
  chapterNumber: number,
  translationId?: string
): BibleVerse[] | null {
  const verses = mmkvGetJson<BibleVerse[]>(
    versesKey(bookName, chapterNumber, translationId)
  );
  return Array.isArray(verses) && verses.length > 0 ? verses : null;
}

export function setCachedVerses(
  bookName: string,
  chapterNumber: number,
  verses: BibleVerse[],
  translationId?: string
): void {
  if (verses?.length) {
    mmkvSetJson(versesKey(bookName, chapterNumber, translationId), verses);
    markFetched(versesKey(bookName, chapterNumber, translationId));
  }
}

export function getLastRead(translationId?: string): BibleLastRead | null {
  const last = mmkvGetJson<BibleLastRead>(lastReadKey(translationId));
  if (last?.bookName && last?.chapterNumber) return last;
  const legacy = mmkvGetJson<BibleLastRead>("bible_last_read_v1");
  if (legacy?.bookName && legacy?.chapterNumber) {
    const migrated = {
      ...legacy,
      translationId: tid(translationId),
    };
    setLastRead(migrated);
    return migrated;
  }
  return null;
}

export function setLastRead(last: BibleLastRead): void {
  const translationId = last.translationId || DEFAULT_TRANSLATION_ID;
  mmkvSetJson(lastReadKey(translationId), {
    ...last,
    translationId,
  });
}
