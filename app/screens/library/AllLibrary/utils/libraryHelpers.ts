/**
 * Library Helper Functions
 * Extracted from AllLibrary.tsx for better modularity
 */

/**
 * Map LibraryScreen category to API contentType format
 */
export const mapContentTypeToAPI = (category?: string): string | undefined => {
  if (!category || category === "ALL") return undefined;

  const mapping: Record<string, string> = {
    SERMON: "sermon",
    MUSIC: "music",
    "E-BOOKS": "ebook",
    VIDEO: "video",
    LIVE: "live",
  };

  return mapping[category] || category.toLowerCase().replace("-", "");
};

/**
 * Detect if content is an e-book based on file URL and MIME type
 */
export const isEbookContent = (item: any): boolean => {
  const mediaUrl = item.mediaUrl || item.fileUrl || "";
  const mimeType = item.mimeType || "";

  // Check MIME type first (most reliable)
  if (
    mimeType.includes("application/pdf") ||
    mimeType.includes("application/epub") ||
    mimeType.includes("application/x-mobipocket") ||
    mimeType.includes("application/vnd.amazon.ebook") ||
    mimeType.includes("application/x-azw") ||
    mimeType.includes("application/x-azw3")
  ) {
    return true;
  }

  // Fallback to file extension detection
  const fileExtension = mediaUrl.split(".").pop()?.toLowerCase();
  const ebookExtensions = [
    "pdf",
    "epub",
    "mobi",
    "azw",
    "azw3",
    "fb2",
    "lit",
    "lrf",
  ];
  const isEbookExtension =
    fileExtension && ebookExtensions.includes(fileExtension);

  // URL path analysis
  const isBookPath =
    mediaUrl.toLowerCase().includes("media-books") ||
    mediaUrl.toLowerCase().includes("books") ||
    mediaUrl.toLowerCase().includes("ebooks") ||
    mediaUrl.toLowerCase().includes("e-books");

  const isEbook = isEbookExtension || isBookPath;

  // Debug logging for ebooks with wrong contentType
  if (
    isEbook &&
    item.contentType !== "e-books" &&
    item.contentType !== "ebook" &&
    item.contentType !== "books"
  ) {
    console.log(`📚 Library E-book detected with wrong contentType:`, {
      title: item.title,
      contentType: item.contentType,
      mimeType: mimeType,
      fileExtension: fileExtension,
      mediaUrl: mediaUrl.substring(0, 100) + "...",
    });
  }

  return isEbook;
};

/**
 * Get effective content type (considering e-book detection)
 */
export const getEffectiveContentType = (item: any): string => {
  const originalType = item.contentType?.toLowerCase() || "";

  // If it's already correctly identified as ebook, return it
  if (
    originalType === "ebook" ||
    originalType === "e-books" ||
    originalType === "books"
  ) {
    return originalType;
  }

  // If it's detected as ebook but has wrong contentType, return ebook
  if (isEbookContent(item)) {
    return "ebook";
  }

  // Otherwise return original type
  return originalType;
};

/**
 * Get content type icon name (Ionicons)
 */
export const getContentTypeIcon = (contentType: string): string => {
  const type = contentType?.toLowerCase() || "";
  switch (type) {
    case "videos":
    case "video":
      return "videocam";
    case "music":
    case "audio":
      return "musical-notes";
    case "sermon":
      return "mic";
    case "e-books":
    case "ebook":
    case "books":
    case "pdf":
      return "book";
    case "live":
      return "radio";
    case "teachings":
      return "school";
    case "podcast":
      return "headset";
    default:
      return "document";
  }
};

/**
 * Get content type color for badges
 */
export const getContentTypeColor = (contentType: string): string => {
  switch (contentType.toLowerCase()) {
    case "videos":
    case "video":
      return "#FF6B6B";
    case "music":
    case "audio":
      return "#4ECDC4";
    case "sermon":
      return "#45B7D1";
    case "e-books":
    case "ebook":
      return "#96CEB4";
    case "live":
      return "#FFEAA7";
    case "teachings":
      return "#DDA0DD";
    case "podcast":
      return "#98D8C8";
    default:
      return "#95A5A6";
  }
};

const isImageUri = (uri?: string | null): uri is string => {
  if (typeof uri !== "string" || !uri.trim()) return false;
  // Never pass media file URLs to Image — they break expo-image / RN Image.
  return !/\.(mp4|m3u8|mov|webm|avi|mkv|mp3|m4a|aac|wav|flac|ogg|pdf|epub)(\?|$)/i.test(
    uri
  );
};

const pickImageCandidate = (...candidates: any[]): string | null => {
  for (const candidate of candidates) {
    const uri =
      typeof candidate === "string"
        ? candidate
        : candidate && typeof candidate === "object"
          ? candidate.uri
          : null;
    if (isImageUri(uri)) return uri.trim();
  }
  return null;
};

/**
 * Cloudinary video → still-frame JPEG (same pattern used by VideoComponent).
 * e.g. .../upload/v123/foo.mp4 → .../upload/so_1/v123/foo.mp4.jpg
 */
export const deriveCloudinaryPosterUrl = (
  mediaUrl?: string | null
): string | null => {
  if (typeof mediaUrl !== "string" || !mediaUrl.includes("/upload/")) {
    return null;
  }
  if (!/\.(mp4|mov|webm|m3u8)(\?|$)/i.test(mediaUrl) && !mediaUrl.includes("/video/")) {
    return null;
  }
  const withFrame = mediaUrl.replace("/upload/", "/upload/so_1/");
  if (/\.jpe?g(\?|$)/i.test(withFrame)) return withFrame;
  const [base, query] = withFrame.split("?");
  return query ? `${base}.jpg?${query}` : `${base}.jpg`;
};

const typeFallbackThumb = (contentType?: string): number => {
  const type = contentType?.toLowerCase() || "";
  switch (type) {
    case "videos":
    case "video":
      return require("../../../../../assets/images/image (10).png");
    case "music":
    case "audio":
    case "sermon":
      return require("../../../../../assets/images/image (12).png");
    case "e-books":
    case "ebook":
    case "books":
    case "pdf":
      return require("../../../../../assets/images/image (13).png");
    case "live":
      return require("../../../../../assets/images/image (14).png");
    default:
      return require("../../../../../assets/images/image (13).png");
  }
};

/**
 * Thumbnail source with image-only fallbacks.
 * Bookmark payloads often omit thumbnailUrl and only have the video file URL —
 * derive a Cloudinary poster so library cards are not blank grey.
 */
export const getThumbnailSource = (item: any): { uri: string } | number => {
  const media = item?.media && typeof item.media === "object" ? item.media : null;

  const direct = pickImageCandidate(
    item?.thumbnailUrl,
    item?.thumbnail,
    item?.imageUrl,
    item?.coverImage,
    item?.cover,
    item?.poster,
    item?.posterUrl,
    media?.thumbnailUrl,
    media?.thumbnail,
    media?.imageUrl,
    media?.coverImage
  );
  if (direct) return { uri: direct };

  const mediaUrl =
    item?.mediaUrl ||
    item?.fileUrl ||
    item?.playbackUrl ||
    item?.hlsUrl ||
    item?.url ||
    media?.mediaUrl ||
    media?.fileUrl ||
    media?.playbackUrl ||
    null;
  const poster = deriveCloudinaryPosterUrl(mediaUrl);
  if (poster) return { uri: poster };

  return typeFallbackThumb(item?.contentType || media?.contentType);
};

/**
 * Detect video content by URL, mime, or contentType
 */
export const isVideoContent = (item: any): boolean => {
  const url = (
    item.mediaUrl ||
    item.fileUrl ||
    item.playbackUrl ||
    item.hlsUrl ||
    ""
  ).toLowerCase();
  const mime = String(item.mimeType || "").toLowerCase();
  const type = String(item.contentType || "").toLowerCase();
  const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".m3u8", ".webm"];
  return (
    videoExts.some((ext) => url.includes(ext)) ||
    mime.startsWith("video/") ||
    type.includes("video")
  );
};

/**
 * Filter items by content type (e.g. VIDEO, MUSIC, E-BOOKS)
 */
export const filterItemsByType = (items: any[], type?: string): any[] => {
  if (!type || type === "ALL") return items;

  const typeMap: Record<string, string[]> = {
    LIVE: ["live"],
    SERMON: ["sermon", "teachings"],
    MUSIC: ["music", "audio"],
    "E-BOOKS": ["e-books", "ebook", "books", "pdf"],
    VIDEO: ["videos", "video"],
  };

  const allowedTypes = typeMap[type] || [type.toLowerCase()];
  return items.filter((item) => {
    const effectiveType = getEffectiveContentType(item);
    return allowedTypes.some((allowedType) =>
      effectiveType.includes(allowedType.toLowerCase())
    );
  });
};

/**
 * Detect audio content by URL, mime, or contentType
 */
export const isAudioContent = (item: any): boolean => {
  const url = (item.mediaUrl || item.fileUrl || "").toLowerCase();
  const mime = String(item.mimeType || "").toLowerCase();
  const type = String(item.contentType || "").toLowerCase();
  const audioExts = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"];
  return (
    audioExts.some((ext) => url.includes(ext)) ||
    mime.startsWith("audio/") ||
    type.includes("audio") ||
    type.includes("music") ||
    type.includes("sermon")
  );
};

