// Performance configuration constants
import { Platform } from 'react-native';

// Platform-specific performance settings
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

export const PERFORMANCE_CONFIG = {
  // Image optimization
  IMAGE: {
    LAZY_LOADING_THRESHOLD: 0.1, // Load when 10% visible
    PRELOAD_DISTANCE: isIOS ? 30 : 50, // iOS: less aggressive preloading
    QUALITY: {
      LOW: 'q_auto:low',
      MEDIUM: 'q_auto:good', 
      HIGH: 'q_auto:best'
    },
    CACHE_SIZE: isIOS ? 150 : 100, // iOS: larger cache for better performance
    CACHE_DURATION: isIOS ? 600000 : 300000, // iOS: 10 minutes, Android: 5 minutes
  },

  // Video optimization
  VIDEO: {
    MAX_CONCURRENT: isIOS ? 2 : 3, // iOS: fewer concurrent videos
    PRELOAD_DISTANCE: isIOS ? 1 : 2, // iOS: less aggressive preloading
    MEMORY_THRESHOLD: isIOS ? 0.7 : 0.8, // iOS: more conservative memory usage
    CACHE_DURATION: 600000, // 10 minutes
    QUALITY: {
      LOW: 'q_auto:low',
      MEDIUM: 'q_auto:good',
      HIGH: 'q_auto:best'
    }
  },

  // Scroll optimization - iOS optimized
  SCROLL: {
    THROTTLE_MS: isIOS ? 16 : 8, // iOS: 60fps, Android: can be faster
    VIRTUAL_SCROLL_THRESHOLD: 100, // Enable virtual scroll for 100+ items
    BATCH_SIZE: isIOS ? 5 : 10, // iOS: smaller batches for smoother scrolling
    WINDOW_SIZE: isIOS ? 5 : 10, // iOS: smaller window for better memory
    UPDATE_INTERVAL: isIOS ? 50 : 100, // iOS: more frequent updates
    REMOVE_CLIPPED_SUBVIEWS: isIOS, // iOS: enable for better performance
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
