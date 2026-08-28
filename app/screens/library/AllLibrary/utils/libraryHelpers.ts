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

/**
 * Thumbnail source with comprehensive fallbacks
 */
function isLikelyVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    /\.(mp4|mov|avi|mkv|m3u8|webm)(\?|$)/i.test(lower) ||
    lower.includes("video/") ||
    lower.includes("/video/upload/")
  );
}

function isLikelyImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(lower) ||
    lower.includes("/image/upload/")
  );
}

/** Cloudinary frame grab — same pattern as feed save handlers. */
export function deriveVideoPosterUrl(videoUrl?: string | null): string | null {
  if (!videoUrl || typeof videoUrl !== "string") return null;
  const trimmed = videoUrl.trim();
  if (!trimmed.startsWith("http")) return null;
  if (!trimmed.includes("/upload/")) return null;
  if (isLikelyImageUrl(trimmed)) return trimmed;
  return trimmed.replace("/upload/", "/upload/so_1/") + ".jpg";
}

function uriFromField(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    return t.startsWith("http") ? t : null;
  }
  if (value && typeof value === "object" && "uri" in value) {
    const u = String((value as { uri?: string }).uri || "").trim();
    return u.startsWith("http") ? u : null;
  }
  return null;
}

export const getThumbnailSource = (item: any): { uri: string } | number => {
  const thumb = uriFromField(item.thumbnailUrl);
  if (thumb && !isLikelyVideoUrl(thumb)) return { uri: thumb };

  const image = uriFromField(item.imageUrl);
  if (image && !isLikelyVideoUrl(image)) return { uri: image };

  const cover = uriFromField(item.coverImage);
  if (cover && !isLikelyVideoUrl(cover)) return { uri: cover };

  const posterFromVideo =
    deriveVideoPosterUrl(item.fileUrl) ||
    deriveVideoPosterUrl(item.mediaUrl) ||
    deriveVideoPosterUrl(item.playbackUrl);
  if (posterFromVideo) return { uri: posterFromVideo };

  const type = item.contentType?.toLowerCase();
  switch (type) {
    case "videos":
    case "video":
    case "reel":
      return require("../../../../../assets/images/image (10).png");
    case "music":
    case "audio":
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
 * Detect video content by URL, mime, or contentType
 */
export const isVideoContent = (item: any): boolean => {
  const url = (item.mediaUrl || item.fileUrl || "").toLowerCase();
  const mime = String(item.mimeType || "").toLowerCase();
  const type = String(item.contentType || "").toLowerCase();
  const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".m3u8", ".webm"];
  return (
    videoExts.some((ext) => url.includes(ext)) ||
    mime.startsWith("video/") ||
    type.includes("video") ||
    type.includes("reel")
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

