const IMAGE_FILE = /\.(jpg|jpeg|png|gif|webp|avif|heic|heif)(\?|#|$)/i;
const VIDEO_FILE = /\.(mp4|mov|m4v|m3u8|webm|avi|mkv)(\?|#|$)/i;

const imageAspectByUri = new Map<string, number>();

function httpUri(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed.startsWith("http")) return "";
  return trimmed;
}

/** Photo and GIF files play as pictures. Video files stay on the player. */
export function reelImageUri(media: {
  contentType?: string | null;
  mimeType?: string | null;
  fileMimeType?: string | null;
  fileUrl?: string | null;
  imageUrl?: string | null;
} | null | undefined): string | null {
  if (!media) return null;
  const contentType = String(media.contentType || "").toLowerCase();
  const mime = String(media.mimeType || media.fileMimeType || "").toLowerCase();
  const fileUrl = httpUri(media.fileUrl);
  const imageUrl = httpUri(media.imageUrl);
  const looksLikeImage =
    contentType === "image" ||
    mime.startsWith("image/") ||
    (!!fileUrl && IMAGE_FILE.test(fileUrl));
  if (!looksLikeImage) return null;
  if (fileUrl && !VIDEO_FILE.test(fileUrl)) return fileUrl;
  if (imageUrl && !VIDEO_FILE.test(imageUrl)) return imageUrl;
  return null;
}

export function peekReelImageAspect(uri: string | null | undefined): number | null {
  if (!uri) return null;
  return imageAspectByUri.get(uri) ?? null;
}

export function rememberReelImageAspect(uri: string, aspect: number): void {
  if (!uri || !(aspect > 0) || !Number.isFinite(aspect)) return;
  imageAspectByUri.set(uri, aspect);
}
