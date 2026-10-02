/**
 * Prefer BE `data` payload; keep legacy `media` for older servers.
 * A processing upload may have an id before fileUrl exists — still return it
 * so the uploader's video can be inserted into the feed.
 */
export type UploadedMediaPayload = {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  playbackUrl?: string;
  hlsUrl?: string;
  contentType: string;
  fileMimeType?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  duration?: number;
  genre?: string;
  processingStatus?: string;
  moderationStatus?: string;
  status?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickId(record: Record<string, unknown>): string {
  const id = record._id ?? record.id ?? record.mediaId;
  return id == null ? "" : String(id).trim();
}

function pickUrl(record: Record<string, unknown>): string {
  const url =
    record.fileUrl ??
    record.playbackUrl ??
    record.url ??
    record.videoUrl ??
    record.secure_url;
  return url == null ? "" : String(url).trim();
}

function scoreUploadRecord(record: Record<string, unknown>): number {
  const id = pickId(record);
  const url = pickUrl(record);
  let score = 0;
  if (url) score += 8;
  if (id && url.includes(id)) score += 4;
  if (record.fileMimeType || record.mimeType) score += 2;
  if (record.contentType) score += 1;
  if (record.title) score += 1;
  return score;
}

export function extractUploadedMedia(
  result: unknown
): UploadedMediaPayload | null {
  const root = asRecord(result);
  if (!root) return null;

  const queue: Record<string, unknown>[] = [root];
  const seen = new Set<Record<string, unknown>>();
  const candidates: Record<string, unknown>[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);

    if (pickId(current)) candidates.push(current);

    for (const key of ["data", "media", "item", "result", "content"]) {
      const child = asRecord(current[key]);
      if (child) queue.push(child);
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => scoreUploadRecord(b) - scoreUploadRecord(a));
  const best = candidates[0];
  const id = pickId(best);
  return {
    ...(best as UploadedMediaPayload),
    _id: id,
    title: String(best.title || "Untitled"),
    fileUrl: pickUrl(best),
    contentType: String(best.contentType || "videos"),
  };
}
