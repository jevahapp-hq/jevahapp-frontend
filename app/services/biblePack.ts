/**
 * Bible translation pack I/O (Phase 2).
 * Download CDN gzip → inflate → sha256 → read chapters["Book:n"].
 * @see docs/BACKEND_BIBLE_OFFLINE_TRANSLATIONS.md
 */
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import { gunzipSync } from "fflate";
import { Platform } from "react-native";
import {
  getCachedBooks,
  getCachedChapters,
  getCachedVerses,
  setCachedBooks,
  setCachedChapters,
  setCachedVerses,
} from "./bibleCache";
import type { BibleBook, BibleChapter, BibleVerse } from "./bibleApiService";
import {
  getInstalledPack,
  packsToEvictForLite,
  recordInstalledPack,
  removeInstalledPack,
  type BiblePackManifest,
} from "./bibleTranslations";

export const BIBLE_PACK_SCHEMA = "jevah-bible-pack-v1";

export type PackInstallResult =
  | { ok: true; translationId: string; packVersion: number }
  | {
      ok: false;
      reason:
        | "unavailable"
        | "licensed"
        | "too-large"
        | "hash"
        | "schema"
        | "error";
      message?: string;
    };

type PackVerseRow = { v: number; t: string };

type LoadedPack = {
  translationId: string;
  packVersion: number;
  books: BibleBook[];
  chapters: Record<string, PackVerseRow[]>;
};

const nativeFs = Platform.OS === "ios" || Platform.OS === "android";
const packDir = () =>
  `${FileSystem.documentDirectory || ""}bible-packs/`;

const memory = new Map<string, LoadedPack>();

function gzipPath(translationId: string) {
  return `${packDir()}${translationId}.json.gz`;
}

function chapterKey(bookName: string, chapterNumber: number) {
  return `${bookName}:${chapterNumber}`;
}

function normalizeHash(value: string): string {
  return String(value || "")
    .trim()
    .replace(/^sha256-/i, "")
    .toLowerCase();
}

function hashesMatch(actualHex: string, expected: string): boolean {
  const a = normalizeHash(actualHex);
  const e = normalizeHash(expected);
  return a.length === 64 && a === e;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = globalThis.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function mapBooks(raw: unknown, translationId: string): BibleBook[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const b = row as Record<string, unknown>;
      const name = String(b.name || "").trim();
      if (!name) return null;
      const testament = b.testament === "new" ? "new" : "old";
      return {
        _id: String(b.id || `${translationId}:${name}:${index}`),
        name,
        testament: testament as "old" | "new",
        chapterCount: Number(b.chapterCount) || 0,
        verseCount: Number(b.verseCount) || 0,
      } satisfies BibleBook;
    })
    .filter((b): b is BibleBook => b != null);
}

function mapVerses(
  rows: PackVerseRow[],
  bookName: string,
  chapterNumber: number,
  translationId: string
): BibleVerse[] {
  return rows
    .filter((r) => r && typeof r.v === "number" && typeof r.t === "string")
    .map((r) => ({
      _id: `${translationId}:${bookName}:${chapterNumber}:${r.v}`,
      bookName,
      chapterNumber,
      verseNumber: r.v,
      text: r.t,
      translation: translationId,
    }));
}

async function ensureDir(): Promise<boolean> {
  if (!nativeFs || !FileSystem.documentDirectory) return false;
  const dir = packDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return true;
}

export function isPackInstalled(translationId: string): boolean {
  return Boolean(getInstalledPack(translationId));
}

export async function removeBiblePack(translationId: string): Promise<void> {
  const id = translationId.trim().toLowerCase();
  memory.delete(id);
  removeInstalledPack(id);
  if (!nativeFs || !FileSystem.documentDirectory) return;
  try {
    await FileSystem.deleteAsync(gzipPath(id), { idempotent: true });
  } catch {
    // ignore
  }
}

async function loadPackFromDisk(translationId: string): Promise<LoadedPack | null> {
  const id = translationId.trim().toLowerCase();
  const hit = memory.get(id);
  if (hit) return hit;
  const meta = getInstalledPack(id);
  if (!meta) return null;
  if (!nativeFs || !FileSystem.documentDirectory) return null;
  try {
    const path = gzipPath(id);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      removeInstalledPack(id);
      return null;
    }
    const b64 = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const inflated = gunzipSync(base64ToBytes(b64));
    const jsonText = new TextDecoder().decode(inflated);
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    if (parsed.schema !== BIBLE_PACK_SCHEMA) {
      await removeBiblePack(id);
      return null;
    }
    const chapters =
      parsed.chapters && typeof parsed.chapters === "object"
        ? (parsed.chapters as Record<string, PackVerseRow[]>)
        : {};
    const loaded: LoadedPack = {
      translationId: id,
      packVersion: Number(parsed.packVersion) || meta.packVersion,
      books: mapBooks(parsed.books, id),
      chapters,
    };
    memory.set(id, loaded);
    return loaded;
  } catch {
    await removeBiblePack(id);
    return null;
  }
}

export async function getPackChapterVerses(
  translationId: string,
  bookName: string,
  chapterNumber: number
): Promise<BibleVerse[] | null> {
  const cached = getCachedVerses(bookName, chapterNumber, translationId);
  if (cached) return cached;
  const pack = await loadPackFromDisk(translationId);
  if (!pack) return null;
  const rows = pack.chapters[chapterKey(bookName, chapterNumber)];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const verses = mapVerses(rows, bookName, chapterNumber, translationId);
  setCachedVerses(bookName, chapterNumber, verses, translationId);
  return verses;
}

export async function getPackBooks(
  translationId: string
): Promise<BibleBook[] | null> {
  const cached = getCachedBooks(translationId);
  if (cached) return cached;
  const pack = await loadPackFromDisk(translationId);
  if (!pack?.books.length) return null;
  setCachedBooks(pack.books, translationId);
  return pack.books;
}

export async function getPackBookChapters(
  translationId: string,
  bookName: string
): Promise<BibleChapter[] | null> {
  const cached = getCachedChapters(bookName, translationId);
  if (cached) return cached;
  const pack = await loadPackFromDisk(translationId);
  if (!pack) return null;
  const book = pack.books.find((b) => b.name === bookName);
  const count =
    book?.chapterCount ||
    Object.keys(pack.chapters).filter((k) => k.startsWith(`${bookName}:`))
      .length;
  if (count <= 0) return null;
  const chapters: BibleChapter[] = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const rows = pack.chapters[chapterKey(bookName, n)];
    return {
      _id: `${bookName}-${n}`,
      bookName,
      chapterNumber: n,
      verseCount: Array.isArray(rows) ? rows.length : 0,
    };
  });
  setCachedChapters(bookName, chapters, translationId);
  return chapters;
}

function hydrateBooksCache(pack: LoadedPack): void {
  if (pack.books.length) setCachedBooks(pack.books, pack.translationId);
}

export async function installPackFromManifest(
  manifest: BiblePackManifest
): Promise<PackInstallResult> {
  const translationId = String(manifest.translationId || "")
    .trim()
    .toLowerCase();
  if (!translationId) {
    return { ok: false, reason: "error", message: "Missing translationId" };
  }
  if (manifest.license === "licensed") {
    return { ok: false, reason: "licensed" };
  }
  if (manifest.schema !== BIBLE_PACK_SCHEMA) {
    return { ok: false, reason: "schema" };
  }
  if (manifest.encoding !== "gzip-json" || !manifest.packUrl) {
    return { ok: false, reason: "unavailable" };
  }

  const existing = getInstalledPack(translationId);
  if (
    existing &&
    existing.packVersion === manifest.packVersion &&
    normalizeHash(existing.contentHash) === normalizeHash(manifest.contentHash)
  ) {
    const loaded = await loadPackFromDisk(translationId);
    if (loaded) return { ok: true, translationId, packVersion: existing.packVersion };
  }

  if (!(await ensureDir())) {
    return { ok: false, reason: "error", message: "Storage unavailable" };
  }

  for (const evictId of packsToEvictForLite(translationId)) {
    await removeBiblePack(evictId);
  }

  const dest = gzipPath(translationId);
  try {
    const dl = await FileSystem.downloadAsync(manifest.packUrl, dest);
    if (dl.status < 200 || dl.status >= 300) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
      return { ok: false, reason: "unavailable" };
    }

    const b64 = await FileSystem.readAsStringAsync(dest, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const inflated = gunzipSync(base64ToBytes(b64));
    const jsonText = new TextDecoder().decode(inflated);
    const actualHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      jsonText
    );
    if (!hashesMatch(actualHash, manifest.contentHash)) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
      memory.delete(translationId);
      removeInstalledPack(translationId);
      return { ok: false, reason: "hash" };
    }

    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    if (parsed.schema !== BIBLE_PACK_SCHEMA) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
      return { ok: false, reason: "schema" };
    }

    const chapters =
      parsed.chapters && typeof parsed.chapters === "object"
        ? (parsed.chapters as Record<string, PackVerseRow[]>)
        : {};
    const loaded: LoadedPack = {
      translationId,
      packVersion: Number(parsed.packVersion) || manifest.packVersion,
      books: mapBooks(parsed.books, translationId),
      chapters,
    };
    memory.set(translationId, loaded);
    hydrateBooksCache(loaded);
    recordInstalledPack({
      translationId,
      packVersion: loaded.packVersion,
      contentHash: manifest.contentHash,
      bytes: manifest.bytes || 0,
    });
    return { ok: true, translationId, packVersion: loaded.packVersion };
  } catch (e) {
    try {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    } catch {
      // ignore
    }
    memory.delete(translationId);
    removeInstalledPack(translationId);
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : "Download failed",
    };
  }
}

export function needsPackUpdate(
  translationId: string,
  manifest: BiblePackManifest
): boolean {
  const installed = getInstalledPack(translationId);
  if (!installed) return true;
  if (manifest.packVersion > installed.packVersion) return true;
  return (
    normalizeHash(manifest.contentHash) !== normalizeHash(installed.contentHash)
  );
}
