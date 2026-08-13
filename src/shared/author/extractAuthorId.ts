import type { AuthorCarrier, AuthorId } from "./types";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_RE.test(value.trim());
}

function idFromUnknown(value: unknown): AuthorId | null {
  if (isObjectId(value)) return String(value).trim();
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const nested = obj._id ?? obj.id ?? obj.userId ?? obj.user_id;
    if (isObjectId(nested)) return String(nested).trim();
    if (nested && typeof nested === "object") {
      const inner = (nested as Record<string, unknown>)._id ?? (nested as Record<string, unknown>).id;
      if (isObjectId(inner)) return String(inner).trim();
    }
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
    idFromUnknown(item.user) ||
    idFromUnknown(item.createdBy) ||
    idFromUnknown(item.owner) ||
    idFromUnknown(item.userId) ||
    idFromUnknown(item.uploaderId) ||
    // Some payloads put the uploader ObjectId in `speaker` when name is missing
    idFromUnknown(item.speaker) ||
    null
  );
}
