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
 * Get content type icon name
 */
export const getContentTypeIcon = (contentType: string): string => {
  const type = contentType?.toLowerCase() || "";
  switch (type) {
    case "video":
    case "videos":
      return "play-circle";
    case "music":
    case "audio":
      return "musical-notes";
    case "ebook":
    case "e-books":
    case "books":
      return "book";
    case "sermon":
      return "mic";
    default:
      return "document";
  }
};

// Note: getThumbnailSource is kept in AllLibrary.tsx as it has complex content-type-specific logic
// and is used as a useCallback with dependencies. It may be extracted in a future refactor.

