import { ContentType, MediaItem } from "../types";

// URL validation utility
export const isValidUri = (uri: any): boolean => {
  return (
    typeof uri === "string" &&
    uri.trim().length > 0 &&
    /^https?:\/\//.test(uri.trim())
  );
};

// Content key generation
export const getContentKey = (item: MediaItem): string => {
  return `${item.contentType}-${
    item._id || Math.random().toString(36).substring(2)
  }`;
};

// Time ago utility
export const getTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const posted = new Date(createdAt);
  const diff = now.getTime() - posted.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}MIN AGO`;
  if (hours < 24) return `${hours}HRS AGO`;
  return `${days}DAYS AGO`;
};

// User display name from content
export const getUserDisplayNameFromContent = (item: MediaItem): string => {
  if (item.authorInfo?.firstName) {
    return `${item.authorInfo.firstName} ${
      item.authorInfo.lastName || ""
    }`.trim();
  }
  if (item.author?.firstName) {
    return `${item.author.firstName} ${item.author.lastName || ""}`.trim();
  }
  if (item.speaker) {
    return item.speaker;
  }
  return "Unknown";
};

// User avatar from content
export const getUserAvatarFromContent = (item: MediaItem): any => {
  const avatar =
    item.authorInfo?.avatar || item.author?.avatar || item.speakerAvatar;

  if (!avatar) {
    return { uri: "https://via.placeholder.com/40x40/cccccc/ffffff?text=U" };
  }

  if (typeof avatar === "string") {
    return { uri: avatar };
  }

  if (typeof avatar === "number") {
    return avatar; // Local asset
  }

  return avatar; // Already an object with uri
};

// Display name utility (fallback for compatibility)
export const getDisplayName = (
  speaker?: string,
  uploadedBy?: string
): string => {
  return speaker || uploadedBy || "Unknown";
};

// Content type filtering
export const filterContentByType = (
  items: MediaItem[],
  contentType: ContentType | "ALL"
): MediaItem[] => {
  if (contentType === "ALL") return items;

  const typeMap: Record<string, string[]> = {
    LIVE: ["live"],
    SERMON: ["sermon", "teachings"],
    MUSIC: ["music", "audio"],
    "E-BOOKS": ["e-books", "ebook", "image", "books"],
    VIDEO: ["videos", "video"],
  };

  const allowedTypes = typeMap[contentType] || [contentType.toLowerCase()];
  return items.filter((item) =>
    allowedTypes.some((allowedType) =>
      item.contentType?.toLowerCase().includes(allowedType.toLowerCase())
    )
  );
};

// Transform API response to MediaItem
export const transformApiResponseToMediaItem = (item: any): MediaItem => {
  const rawFileUrl = item.fileUrl;
  const rawThumbnailUrl = item.thumbnailUrl || item.thumbnail;

  // Validate and use URLs
  const videoUrl = isValidUri(rawFileUrl)
    ? String(rawFileUrl).trim()
    : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  const audioUrl = isValidUri(rawFileUrl) ? String(rawFileUrl).trim() : "";
  const contentTypeLower = (item.contentType || "").toLowerCase();
  let thumbnailUrl = isValidUri(rawThumbnailUrl)
    ? String(rawThumbnailUrl).trim()
    : "";

  // Only fallback to video frame for videos or sermons. For non-video (ebook/audio/etc), avoid using fileUrl as image.
  if (!thumbnailUrl) {
    if (
      contentTypeLower === "video" ||
      contentTypeLower === "videos" ||
      contentTypeLower === "sermon"
    ) {
      thumbnailUrl = generateVideoThumbnail(videoUrl);
    } else {
      thumbnailUrl = ""; // let UI components use their own image fallback
    }
  }

  return {
    _id: item._id,
    title: item.title,
    description: item.description,
    contentType: item.contentType,
    fileUrl: videoUrl,
    thumbnailUrl: thumbnailUrl,
    speaker:
      item.authorInfo?.firstName || item.author?.firstName
        ? `${item.authorInfo?.firstName || item.author?.firstName} ${
            item.authorInfo?.lastName || item.author?.lastName
          }`
        : "Unknown",
    uploadedBy: item.authorInfo?._id || item.author?._id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    views: item.viewCount || item.totalViews || 0,
    shares: item.shareCount || item.totalShares || 0,
    saves: 0, // Default value
    comments: item.commentCount || 0,
    likes: item.likeCount || item.totalLikes || 0,
    imageUrl: thumbnailUrl,
    speakerAvatar: item.authorInfo?.avatar || item.author?.avatar,
    // Additional fields for compatibility
    authorInfo: item.authorInfo,
    author: item.author,
    viewCount: item.viewCount,
    totalViews: item.totalViews,
    shareCount: item.shareCount,
    totalShares: item.totalShares,
    likeCount: item.likeCount,
    totalLikes: item.totalLikes,
    commentCount: item.commentCount,
  };
};

// Categorize content by type
export const categorizeContent = (items: MediaItem[]) => {
  const videos = items.filter(
    (item) => item.contentType === "video" || item.contentType === "videos"
  );
  const music = items.filter(
    (item) => item.contentType === "audio" || item.contentType === "music"
  );
  const ebooks = items.filter(
    (item) =>
      item.contentType === "image" ||
      item.contentType === "ebook" ||
      item.contentType === "books"
  );
  const sermons = items.filter((item) => item.contentType === "sermon");

  return { videos, music, ebooks, sermons };
};

// Get most recent item
export const getMostRecentItem = (items: MediaItem[]): MediaItem | null => {
  if (items.length === 0) return null;

  return (
    items.sort((a, b) => {
      const ad = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    })[0] || null
  );
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Format duration
export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, "0")}:${(
      seconds % 60
    )
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
};

// Format progress percentage
export const formatProgress = (progress: number): string => {
  return `${Math.round(progress * 100)}%`;
};

// Validate content type
export const isValidContentType = (type: string): boolean => {
  const validTypes = [
    "video",
    "videos",
    "audio",
    "music",
    "sermon",
    "image",
    "ebook",
    "books",
    "live",
    "teachings",
    "e-books",
  ];
  return validTypes.includes(type.toLowerCase());
};

// Generate thumbnail URL for video
export const generateVideoThumbnail = (videoUrl: string): string => {
  if (!isValidUri(videoUrl)) return videoUrl;

  // For Cloudinary URLs, add thumbnail transformation
  if (videoUrl.includes("cloudinary.com")) {
    return videoUrl.replace("/upload/", "/upload/so_1/") + ".jpg";
  }

  // For other URLs, return as is
  return videoUrl;
};

// Check if content is downloadable
export const isDownloadableContent = (item: MediaItem): boolean => {
  const downloadableTypes = [
    "video",
    "videos",
    "audio",
    "music",
    "image",
    "ebook",
    "books",
  ];
  return downloadableTypes.includes(item.contentType.toLowerCase());
};

// Generate share text
export const generateShareText = (item: MediaItem): string => {
  const speaker = getUserDisplayNameFromContent(item);
  return `Check this out: ${item.title} by ${speaker}\n${item.fileUrl}`;
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false as boolean;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      timer && clearTimeout(timer);
      timer = setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

// Deep clone utility
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as any;
  if (typeof obj === "object") {
    const cloned = {} as any;
    Object.keys(obj).forEach((key) => {
      cloned[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  return obj;
};

// Safe JSON parse
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};

// Safe JSON stringify
export const safeJsonStringify = (
  obj: any,
  fallback: string = "{}"
): string => {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
};

// Error handler utility
export const handleError = (
  error: any,
  context: string = "Unknown"
): string => {
  console.error(`Error in ${context}:`, error);

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  return "An unexpected error occurred";
};

// Retry utility
export const retry = async <T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (attempts > 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retry(fn, attempts - 1, delay);
    }
    throw error;
  }
};

// Platform detection
export const isIOS = (): boolean => {
  return require("react-native").Platform.OS === "ios";
};

export const isAndroid = (): boolean => {
  return require("react-native").Platform.OS === "android";
};

// Device info
export const getDeviceInfo = () => {
  const { Dimensions } = require("react-native");
  const { width, height } = Dimensions.get("window");

  return {
    width,
    height,
    isTablet: Math.min(width, height) >= 768,
    isSmallScreen: Math.min(width, height) < 375,
  };
};

// Color utilities
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
};

export const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = ((num >> 8) & 0x00ff) - amt;
  const B = (num & 0x0000ff) - amt;

  return (
    "#" +
    (
      0x1000000 +
      (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)
    )
      .toString(16)
      .slice(1)
  );
};
