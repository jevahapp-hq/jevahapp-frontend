/**
 * Instant-On Video Feed - Entry Point
 * 
 * Provides all components and hooks needed for the 'Instant-On' video feed experience:
 * - No thumbnails
 * - No loading spinners
 * - No dark flashes
 * - Splash screen hides only when first video is ready
 */

// Context
export { InstantOnProvider, useInstantOn } from './context/InstantOnContext';

// Components
export { InstantVideoFeed } from './components/InstantVideoFeed';
export { InstantVideoPlayer } from './components/InstantVideoPlayer';

// Hooks
export {
    cacheVideos,
    clearVideoCache, getCachedVideosSync, useInstantOnStorage
} from './hooks/useInstantOnStorage';

// Navigation
export {
    INSTANT_ON_NAVIGATION_CONFIG,
    INSTANT_ON_TAB_SCREEN_OPTIONS, InstantOnNavigator
} from './navigation/InstantOnNavigator';

// App Entry Point
export { App } from './App';

// Re-export types
export type { MediaItem } from '../../shared/types';
