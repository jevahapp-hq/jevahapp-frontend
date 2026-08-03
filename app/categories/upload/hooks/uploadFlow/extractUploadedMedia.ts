/**
 * Prefer BE `data` payload; keep legacy `media` for older servers.
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

export function extractUploadedMedia(
  result: unknown
): UploadedMediaPayload | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;

  const candidates = [r.data, r.media, r];
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const m = c as Record<string, unknown>;
    const id = m._id ?? m.id;
    const fileUrl = m.fileUrl ?? m.playbackUrl ?? m.url;
    if (id && fileUrl) {
      return {
        ...(m as UploadedMediaPayload),
        _id: String(id),
        title: String(m.title || "Untitled"),
        fileUrl: String(fileUrl),
        contentType: String(m.contentType || "videos"),
      };
    }
  }
  return null;
}
