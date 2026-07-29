// Performance configuration constants
export const PERFORMANCE_CONFIG = {
  // Image optimization
  IMAGE: {
    LAZY_LOADING_THRESHOLD: 0.1, // Load when 10% visible
    PRELOAD_DISTANCE: 50, // Preload 50px before visible
    QUALITY: {
      LOW: 'q_auto:low',
      MEDIUM: 'q_auto:good', 
      HIGH: 'q_auto:best'
    },
    CACHE_SIZE: 100, // Max cached images
    CACHE_DURATION: 300000, // 5 minutes
  },

  // Video optimization
  VIDEO: {
    MAX_CONCURRENT: 4, // Warm more players ahead for instant first frame
    PRELOAD_DISTANCE: 4, // Prefetch 4 videos ahead / behind
    MEMORY_THRESHOLD: 0.85,
    CACHE_DURATION: 2 * 60 * 60 * 1000, // 2 hours — heavy client cache
    QUALITY: {
      LOW: 'q_auto:low',
      MEDIUM: 'q_auto:good',
      HIGH: 'q_auto:best'
    }
  },

  // Scroll optimization
  SCROLL: {
    THROTTLE_MS: 16, // 60fps
    VIRTUAL_SCROLL_THRESHOLD: 100, // Enable virtual scroll for 100+ items
    BATCH_SIZE: 10, // Render 10 items per batch
    WINDOW_SIZE: 10, // Viewport size multiplier
    UPDATE_INTERVAL: 50, // Update every 50ms
  },

  // Memory management
  MEMORY: {
    MAX_CACHE_SIZE: 120,
    CLEANUP_INTERVAL: 60000,
    MEMORY_THRESHOLD: 0.85,
    CACHE_EXPIRY: 2 * 60 * 60 * 1000, // 2 hours
  },

  // Network optimization
  NETWORK: {
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    CONCURRENT_REQUESTS: 5,
  },

  // Animation optimization
  ANIMATION: {
    DURATION: 300, // Default animation duration
    USE_NATIVE_DRIVER: true,
    EASING: 'ease-in-out',
  }
};

// Performance monitoring
export const PERFORMANCE_METRICS = {
  RENDER_TIME_THRESHOLD: 16, // 60fps
  MEMORY_WARNING_THRESHOLD: 0.9,
  NETWORK_SLOW_THRESHOLD: 3000, // 3 seconds
  IMAGE_LOAD_THRESHOLD: 2000, // 2 seconds
};

// Feature flags for performance optimizations
export const PERFORMANCE_FEATURES = {
  ENABLE_LAZY_LOADING: true,
  ENABLE_IMAGE_OPTIMIZATION: true,
  ENABLE_VIDEO_OPTIMIZATION: true,
  ENABLE_VIRTUAL_SCROLLING: true,
  ENABLE_MEMORY_MANAGEMENT: true,
  ENABLE_DEBOUNCING: true,
  ENABLE_THROTTLING: true,
  ENABLE_MEMOIZATION: true,
  /** CDN Range warmup for upcoming videos (feed + Reels). Kill switch. */
  ENABLE_VIDEO_PREFETCH:
    process.env.EXPO_PUBLIC_ENABLE_VIDEO_PREFETCH !== "0",
  /** Pre-create next Audio.Sound for music cards. Kill switch. */
  ENABLE_AUDIO_PREFETCH:
    process.env.EXPO_PUBLIC_ENABLE_AUDIO_PREFETCH !== "0",
  /** Disk-warm upcoming ebook PDFs. Kill switch. */
  ENABLE_PDF_PREFETCH: process.env.EXPO_PUBLIC_ENABLE_PDF_PREFETCH !== "0",
};
