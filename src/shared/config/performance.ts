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
    MAX_CONCURRENT: 3, // Max videos playing simultaneously
    PRELOAD_DISTANCE: 2, // Preload 2 videos ahead
    MEMORY_THRESHOLD: 0.8, // Cleanup at 80% memory usage
    CACHE_DURATION: 600000, // 10 minutes
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
    MAX_CACHE_SIZE: 50,
    CLEANUP_INTERVAL: 30000, // 30 seconds
    MEMORY_THRESHOLD: 0.8,
    CACHE_EXPIRY: 300000, // 5 minutes
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
};
