import { useEffect, useRef, useState } from 'react';
import { useInteractionStore } from '../store/useInteractionStore';

interface UseContentViewOptions {
  contentId: string;
  contentType: 'video' | 'audio' | 'ebook' | 'sermon' | 'live';
  threshold?: number; // Minimum view duration in seconds
  trackViewOnMount?: boolean;
  trackViewOnVisibility?: boolean;
}

export function useContentView({
  contentId,
  contentType,
  threshold = 3,
  trackViewOnMount = false,
  trackViewOnVisibility = true,
}: UseContentViewOptions) {
  const { recordView } = useInteractionStore();
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [viewDuration, setViewDuration] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start tracking view duration
  const startViewTracking = () => {
    if (startTimeRef.current !== null) return; // Already tracking
    
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setViewDuration(duration);
        
        // Track view once threshold is reached
        if (duration >= threshold && !hasTrackedView) {
          trackView(duration);
        }
      }
    }, 1000);
  };

  // Stop tracking view duration
  const stopViewTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (startTimeRef.current) {
      const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setViewDuration(finalDuration);
      startTimeRef.current = null;
      
      // Track view if we haven't already and met threshold
      if (finalDuration >= threshold && !hasTrackedView) {
        trackView(finalDuration);
      }
    }
  };

  // Track view with the backend
  const trackView = async (duration: number) => {
    if (hasTrackedView) return;
    
    try {
      await recordView(contentId, contentType, duration);
      setHasTrackedView(true);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  // Manual track view function
  const manualTrackView = () => {
    const currentDuration = startTimeRef.current 
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : viewDuration;
    
    trackView(currentDuration);
  };

  // Track view on mount if enabled
  useEffect(() => {
    if (trackViewOnMount) {
      startViewTracking();
    }
    
    return () => {
      stopViewTracking();
    };
  }, [trackViewOnMount, contentId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopViewTracking();
    };
  }, []);

  return {
    viewDuration,
    hasTrackedView,
    startViewTracking,
    stopViewTracking,
    manualTrackView,
  };
}

// Hook for tracking visibility-based views (when content enters/exits viewport)
export function useVisibilityView({
  contentId,
  contentType,
  threshold = 3,
}: Omit<UseContentViewOptions, 'trackViewOnMount' | 'trackViewOnVisibility'>) {
  const contentView = useContentView({
    contentId,
    contentType,
    threshold,
    trackViewOnMount: false,
    trackViewOnVisibility: false,
  });

  const handleVisibilityChange = (isVisible: boolean) => {
    if (isVisible) {
      contentView.startViewTracking();
    } else {
      contentView.stopViewTracking();
    }
  };

  return {
    ...contentView,
    handleVisibilityChange,
  };
}

// Hook for tracking video/audio playback views
export function usePlaybackView({
  contentId,
  contentType,
  isPlaying,
  threshold = 5,
}: Omit<UseContentViewOptions, 'trackViewOnMount' | 'trackViewOnVisibility'> & {
  isPlaying: boolean;
}) {
  const contentView = useContentView({
    contentId,
    contentType,
    threshold,
    trackViewOnMount: false,
    trackViewOnVisibility: false,
  });

  useEffect(() => {
    if (isPlaying) {
      contentView.startViewTracking();
    } else {
      contentView.stopViewTracking();
    }
  }, [isPlaying]);

  return contentView;
}

// Default export for route compatibility
export default function UseContentView() {
  return null;
}