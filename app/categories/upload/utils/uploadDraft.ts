/**
 * Local upload draft — metadata + file URIs only.
 * Never copies video bytes (Lite / 2GB cannot afford a second copy).
 */
import { appMmkv, hydrateFallbackKvFromAsyncStorage, mmkvGetJson, mmkvSetJson } from "../../../../src/shared/cache/mmkvStorage";
import { detectFileType } from "./fileTypeDetection";
import type { DetectedFileType, MediaFile } from "../types";

const DRAFT_KEY = "jevah_upload_draft_v1";

export type UploadDraft = {
  title: string;
  description: string;
  selectedCategory: string;
  selectedType: string;
  isSermonContent: boolean;
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  savedAt: number;
};

export function isUploadFormDirty(input: {
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  title: string;
  description: string;
  selectedCategory: string;
  selectedType: string;
}): boolean {
  return Boolean(
    input.file ||
      input.thumbnail ||
      input.title.trim() ||
      input.description.trim() ||
      input.selectedCategory ||
      input.selectedType
  );
}

export function loadUploadDraft(): UploadDraft | null {
  const draft = mmkvGetJson<UploadDraft>(DRAFT_KEY);
  if (!draft || typeof draft !== "object") return null;
  if (!isUploadFormDirty(draft)) return null;
  return draft;
}

export async function hydrateUploadDraft(): Promise<UploadDraft | null> {
  const existing = loadUploadDraft();
  if (existing) return existing;
  await hydrateFallbackKvFromAsyncStorage([DRAFT_KEY]);
  return loadUploadDraft();
}

export function saveUploadDraft(input: {
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  title: string;
  description: string;
  selectedCategory: string;
  selectedType: string;
  isSermonContent: boolean;
}): void {
  mmkvSetJson(DRAFT_KEY, {
    title: input.title,
    description: input.description,
    selectedCategory: input.selectedCategory,
    selectedType: input.selectedType,
    isSermonContent: input.isSermonContent,
    file: input.file,
    thumbnail: input.thumbnail,
    savedAt: Date.now(),
  } satisfies UploadDraft);
}

export function clearUploadDraft(): void {
  try {
    appMmkv.remove(DRAFT_KEY);
  } catch {
    mmkvSetJson(DRAFT_KEY, null);
  }
}

export function detectedTypeFromDraft(
  file: MediaFile | null
): DetectedFileType {
  return file ? detectFileType(file) : "unknown";
}
