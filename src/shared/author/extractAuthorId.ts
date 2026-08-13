import type { AuthorCarrier, AuthorId } from "./types";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_RE.test(value.trim());
}

function idFromUnknown(value: unknown): AuthorId | null {
  if (isObjectId(value)) return String(value).trim();
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const id = obj._id ?? obj.id;
    if (isObjectId(id)) return String(id).trim();
  }
  return null;
}

/** Single id extractor for any media / content shape. */
export function extractAuthorId(item: AuthorCarrier | null | undefined): AuthorId | null {
  if (!item) return null;
  return (
    idFromUnknown(item.uploadedBy) ||
    idFromUnknown(item.authorInfo) ||
    idFromUnknown(item.author) ||
    null
  );
}
