// API Configuration
export const API_CONFIG = {
  BASE_URL: "https://jevahapp-backend-rped.onrender.com",
  ENDPOINTS: {
    ALL_CONTENT: "/api/media/public/all-content",
    ALL_CONTENT_AUTH: "/api/media/all-content",
    DEFAULT_CONTENT: "/api/media/default",
    CONTENT_STATS: "/api/media/stats",
    INTERACTIONS: "/api/media/interactions",
    COMMENTS: "/api/media/comments",
    UPLOAD: "/api/media/upload",
  },
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

// UI Configuration
export const UI_CONFIG = {
  COLORS: {
    PRIMARY: "#256E63",
    SECONDARY: "#FEA74E",
    ERROR: "#FF6B6B",
    SUCCESS: "#4CAF50",
    WARNING: "#FF9800",
    INFO: "#2196F3",
    TEXT_PRIMARY: "#344054",
    TEXT_SECONDARY: "#98A2B3",
    BACKGROUND: "#FFFFFF",
    SURFACE: "#F9FAFB",
    BORDER: "#E5E7EB",
    SHADOW: "rgba(0, 0, 0, 0.1)",
    // Skeleton colors
    SKELETON_BASE: "#E5E7EB", // light gray (gray-200)
    SKELETON_HIGHLIGHT: "#F3F4F6", // very light gray (gray-100)
    SKELETON_DARK_BASE: "#2C2C2C", // dark gray for dark backgrounds
    SKELETON_DARK_HIGHLIGHT: "#3A3A3A",
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
  TYPOGRAPHY: {
    FONT_SIZES: {
      XS: 10,
      SM: 12,
      MD: 14,
      LG: 16,
      XL: 18,
      XXL: 20,
      XXXL: 24,
    },
    FONT_WEIGHTS: {
      NORMAL: "400",
      MEDIUM: "500",
      SEMIBOLD: "600",
      BOLD: "700",
    },
    LINE_HEIGHTS: {
      TIGHT: 1.2,
      NORMAL: 1.4,
      RELAXED: 1.6,
    },
  },
  BORDER_RADIUS: {
    SM: 4,
    MD: 8,
    LG: 12,
    XL: 16,
    FULL: 999,
  },
  SHADOWS: {
    SM: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    MD: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    LG: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

// Media Configuration
export const MEDIA_CONFIG = {
  VIDEO: {
    HEIGHT: 400,
    ASPECT_RATIO: 16 / 9,
    AUTO_PLAY: false, // Disabled for better UX
    MUTE_DEFAULT: false,
    VOLUME_DEFAULT: 1.0,
  },
  AUDIO: {
    HEIGHT: 400,
    AUTO_PLAY: false,
    MUTE_DEFAULT: false,
    VOLUME_DEFAULT: 1.0,
  },
  EBOOK: {
    HEIGHT: 200,
    ASPECT_RATIO: 3 / 4,
  },
  THUMBNAIL: {
    QUALITY: 0.8,
    FORMAT: "jpg",
  },
};

// Content Type Mapping
export const CONTENT_TYPE_MAP: Record<string, string[]> = {
  ALL: [
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
  ],
  VIDEO: ["videos", "video"],
  MUSIC: ["music", "audio"],
  SERMON: ["sermon", "teachings"],
  "E-BOOKS": ["e-books", "ebook", "image", "books"],
  LIVE: ["live"],
};

// Pagination Configuration
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50,
  LOAD_MORE_THRESHOLD: 0.8,
};

// Socket Configuration
export const SOCKET_CONFIG = {
  SERVER_URL: "https://jevahapp-backend-rped.onrender.com",
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000,
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_DATA: "user_data",
  VIEWED_CONTENT: "viewed_content",
  DOWNLOADED_CONTENT: "downloaded_content",
  APP_SETTINGS: "app_settings",
  MEDIA_STATS: "media_stats",
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR:
    "Network connection error. Please check your internet connection.",
  AUTH_ERROR: "Authentication failed. Please log in again.",
  PERMISSION_ERROR: "Permission denied. Please check your account permissions.",
  UPLOAD_ERROR: "Upload failed. Please try again.",
  DOWNLOAD_ERROR: "Download failed. Please try again.",
  GENERIC_ERROR: "Something went wrong. Please try again.",
  CONTENT_NOT_FOUND: "Content not found.",
  INVALID_URL: "Invalid URL format.",
  FILE_TOO_LARGE: "File size is too large.",
  UNSUPPORTED_FORMAT: "Unsupported file format.",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: "Content uploaded successfully!",
  DOWNLOAD_SUCCESS: "Content downloaded successfully!",
  SAVE_SUCCESS: "Content saved successfully!",
  SHARE_SUCCESS: "Content shared successfully!",
  LIKE_SUCCESS: "Content liked!",
  COMMENT_SUCCESS: "Comment added successfully!",
};

// Validation Rules
export const VALIDATION_RULES = {
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MIN_LENGTH: 0,
    MAX_LENGTH: 500,
  },
  FILE_SIZE: {
    MAX_VIDEO: 100 * 1024 * 1024, // 100MB
    MAX_AUDIO: 50 * 1024 * 1024, // 50MB
    MAX_IMAGE: 10 * 1024 * 1024, // 10MB
  },
  SUPPORTED_FORMATS: {
    VIDEO: ["mp4", "mov", "avi", "mkv"],
    AUDIO: ["mp3", "wav", "aac", "m4a"],
    IMAGE: ["jpg", "jpeg", "png", "gif"],
    EBOOK: ["pdf", "epub", "mobi"],
  },
};

// Animation Configuration
export const ANIMATION_CONFIG = {
  DURATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
  },
  EASING: {
    EASE_IN: "ease-in",
    EASE_OUT: "ease-out",
    EASE_IN_OUT: "ease-in-out",
  },
};

// Feature Flags
export const FEATURE_FLAGS = {
  AUTO_PLAY_VIDEOS: false,
  AUTO_PLAY_AUDIO: false,
  REAL_TIME_UPDATES: true,
  OFFLINE_MODE: true,
  DARK_MODE: false,
  NOTIFICATIONS: true,
  ANALYTICS: true,
};

// Debug Configuration
export const DEBUG_CONFIG = {
  ENABLED: __DEV__,
  LOG_LEVEL: __DEV__ ? "debug" : "error",
  SHOW_DEBUG_INFO: __DEV__,
  ENABLE_PERFORMANCE_MONITORING: __DEV__,
};
