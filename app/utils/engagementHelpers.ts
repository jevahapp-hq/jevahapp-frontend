/**
 * Map feed item types to backend content API path segments.
 * Live API currently accepts media | ebook | podcast | merch | artist —
 * sermon/devotional content lives in the Media collection and must use `media`.
 */
export function mapContentTypeForBackend(contentType: string): string {
  const normalized = (contentType || "").toLowerCase();

  if (normalized === "artist") return "artist";
  if (normalized === "merch") return "merch";
  if (
    normalized === "ebook" ||
    normalized === "e-books" ||
    normalized === "ebooks" ||
    normalized === "books"
  ) {
    return "ebook";
  }
  if (normalized === "podcast" || normalized === "podcasts") return "podcast";

  // video, audio, music, live, sermon, sermons, devotional, teachings, etc. → media
  return "media";
}

export type BatchMetadataItem = {
  contentId: string;
  contentType: string;
};

export function toBatchMetadataItem(
  contentId: string,
  contentType?: string
): BatchMetadataItem {
  return {
    contentId,
    contentType: mapContentTypeForBackend(contentType || "media"),
  };
}
