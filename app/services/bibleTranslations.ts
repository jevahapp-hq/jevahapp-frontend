/**
 * Bible translation catalog + selected id.
 * Matches docs/BACKEND_BIBLE_OFFLINE_TRANSLATIONS.md
 */
import {
  mmkvGetJson,
  mmkvSetJson,
} from "../../src/shared/cache/mmkvStorage";
import { isLiteProfileActive } from "../../src/shared/lite/liteProfile";

export const DEFAULT_TRANSLATION_ID = "web";
const SELECTED_KEY = "bible_translation_id_v1";
const CATALOG_KEY = "bible_translation_catalog_v1";
const CATALOG_AVAILABLE_KEY = "bible_catalog_available_v1";
const INSTALLED_PACKS_KEY = "bible_installed_packs_v1";
const LITE_MAX_PACK_BYTES = 12 * 1024 * 1024;

export type BibleLicense = "public-domain" | "permissive" | "licensed";

export type BibleTranslation = {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  languageName?: string;
  license: BibleLicense;
  offline: boolean;
  packBytes?: number | null;
  verseCount?: number;
  isDefault?: boolean;
};

export type BibleTranslationCatalog = {
  defaultId: string;
  translations: BibleTranslation[];
};

export type BiblePackManifest = {
  translationId: string;
  packVersion: number;
  contentHash: string;
  bytes: number;
  encoding: "gzip-json";
  schema: "jevah-bible-pack-v1";
  packUrl: string;
  license: BibleLicense;
  updatedAt?: string;
};

export type InstalledBiblePack = {
  translationId: string;
  packVersion: number;
  contentHash: string;
  bytes: number;
};

/** Only send `?translation=` after the catalog endpoint exists. */
export function isTranslationQueryEnabled(): boolean {
  return mmkvGetJson<boolean>(CATALOG_AVAILABLE_KEY) === true;
}

export function setCatalogAvailable(available: boolean): void {
  mmkvSetJson(CATALOG_AVAILABLE_KEY, available);
}

/** Catalog 404/500 → hide picker and stop sending `?translation=`. */
export function clearCatalogAvailability(): void {
  mmkvSetJson(CATALOG_AVAILABLE_KEY, false);
  mmkvSetJson(CATALOG_KEY, null);
}

/**
 * Parse BE Phase 1 catalog: `{ defaultId, translations[] }` with `id` slugs.
 * Rejects the old `{ code, name }` array. Unwraps `{ success, data }` if present.
 */
export function parseTranslationCatalog(
  raw: unknown
): BibleTranslationCatalog | null {
  let cur: unknown = raw;
  for (let i = 0; i < 4; i++) {
    if (!cur || typeof cur !== "object") return null;
    const obj = cur as Record<string, unknown>;
    if (Array.isArray(obj.translations)) {
      return normalizeCatalog(obj);
    }
    if ("data" in obj && obj.data != null) {
      cur = obj.data;
      continue;
    }
    return null;
  }
  return null;
}

function normalizeCatalog(
  obj: Record<string, unknown>
): BibleTranslationCatalog | null {
  const rows = obj.translations;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const translations: BibleTranslation[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const t = row as Record<string, unknown>;
    const id = String(t.id || "")
      .trim()
      .toLowerCase();
    if (!id) continue;
    translations.push({
      id,
      abbreviation: String(t.abbreviation || id).toUpperCase(),
      name: String(t.name || t.abbreviation || id),
      language: String(t.language || "en"),
      languageName:
        typeof t.languageName === "string" ? t.languageName : undefined,
      license: normalizeLicense(t.license),
      offline: t.offline === true,
      packBytes:
        typeof t.packBytes === "number" && t.packBytes > 0
          ? t.packBytes
          : null,
      verseCount:
        typeof t.verseCount === "number" ? t.verseCount : undefined,
      isDefault: t.isDefault === true,
    });
  }
  if (!translations.length) return null;

  const defaultId = String(
    obj.defaultId ||
      translations.find((t) => t.isDefault)?.id ||
      translations[0].id
  )
    .trim()
    .toLowerCase();

  return { defaultId, translations };
}

function normalizeLicense(value: unknown): BibleLicense {
  if (value === "licensed" || value === "permissive") return value;
  return "public-domain";
}

export function parsePackManifest(raw: unknown): BiblePackManifest | null {
  let cur: unknown = raw;
  for (let i = 0; i < 4; i++) {
    if (!cur || typeof cur !== "object") return null;
    const obj = cur as Record<string, unknown>;
    if (typeof obj.packUrl === "string" && obj.schema === "jevah-bible-pack-v1") {
      const translationId = String(obj.translationId || "")
        .trim()
        .toLowerCase();
      if (!translationId) return null;
      return {
        translationId,
        packVersion: Number(obj.packVersion) || 0,
        contentHash: String(obj.contentHash || ""),
        bytes: Number(obj.bytes) || 0,
        encoding: "gzip-json",
        schema: "jevah-bible-pack-v1",
        packUrl: String(obj.packUrl),
        license: normalizeLicense(obj.license),
        updatedAt:
          typeof obj.updatedAt === "string" ? obj.updatedAt : undefined,
      };
    }
    if ("data" in obj && obj.data != null) {
      cur = obj.data;
      continue;
    }
    return null;
  }
  return null;
}

export function getCachedCatalog(): BibleTranslationCatalog | null {
  const catalog = mmkvGetJson<BibleTranslationCatalog>(CATALOG_KEY);
  if (!catalog?.translations?.length) return null;
  return catalog;
}

export function setCachedCatalog(catalog: BibleTranslationCatalog): void {
  mmkvSetJson(CATALOG_KEY, catalog);
  setCatalogAvailable(true);
}

export function getSelectedTranslationId(): string {
  const id = mmkvGetJson<string>(SELECTED_KEY);
  if (typeof id === "string" && id.trim()) return id.trim().toLowerCase();
  const catalog = getCachedCatalog();
  if (catalog?.defaultId) return catalog.defaultId.toLowerCase();
  return DEFAULT_TRANSLATION_ID;
}

export function setSelectedTranslationId(id: string): void {
  const next = String(id || DEFAULT_TRANSLATION_ID).trim().toLowerCase();
  mmkvSetJson(SELECTED_KEY, next);
}

export function resolveTranslationId(
  catalog?: BibleTranslationCatalog | null
): string {
  const stored = getSelectedTranslationId();
  if (!catalog?.translations?.length) return stored;
  if (catalog.translations.some((t) => t.id === stored)) return stored;
  const fallback = (
    catalog.defaultId ||
    catalog.translations.find((t) => t.isDefault)?.id ||
    catalog.translations[0].id
  ).toLowerCase();
  setSelectedTranslationId(fallback);
  return fallback;
}

export function getInstalledPacks(): InstalledBiblePack[] {
  const packs = mmkvGetJson<InstalledBiblePack[]>(INSTALLED_PACKS_KEY);
  return Array.isArray(packs) ? packs : [];
}

export function recordInstalledPack(pack: InstalledBiblePack): void {
  const rest = getInstalledPacks().filter(
    (p) => p.translationId !== pack.translationId
  );
  mmkvSetJson(INSTALLED_PACKS_KEY, [...rest, pack]);
}

export function removeInstalledPack(translationId: string): void {
  mmkvSetJson(
    INSTALLED_PACKS_KEY,
    getInstalledPacks().filter((p) => p.translationId !== translationId)
  );
}

export function getInstalledPack(
  translationId: string
): InstalledBiblePack | null {
  const id = translationId.trim().toLowerCase();
  return (
    getInstalledPacks().find((p) => p.translationId === id) || null
  );
}

/** Lite keeps one pack: downloading a new one must delete these ids. */
export function packsToEvictForLite(newTranslationId: string): string[] {
  if (!isLiteProfileActive()) return [];
  return getInstalledPacks()
    .filter((p) => p.translationId !== newTranslationId)
    .map((p) => p.translationId);
}

export function canDownloadPack(t: BibleTranslation): boolean {
  if (!t.offline) return false;
  if (t.license === "licensed") return false;
  const bytes = t.packBytes || 0;
  if (bytes <= 0) return false;
  if (isLiteProfileActive() && bytes > LITE_MAX_PACK_BYTES) return false;
  return true;
}

export function formatPackSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `~${mb.toFixed(1)} MB`;
}
