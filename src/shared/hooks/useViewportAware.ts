import { RefObject, useEffect, useRef, useState } from 'react';
import { findNodeHandle, Platform, UIManager, View } from 'react-native';

interface UseViewportAwareOptions {
  threshold?: number; // 0-1, percentage of element that must be visible
  rootMargin?: number; // pixels before element enters viewport
  triggerOnce?: boolean; // Only trigger once when entering viewport
  enabled?: boolean; // Enable/disable the hook
}

/**
 * React Native-compatible viewport detection hook
 * Uses onLayout and measureInWindow for viewport detection
 * Falls back to timer-based lazy loading if measurement fails
 */
export const useViewportAware = (
  ref: RefObject<View>,
  options: UseViewportAwareOptions = {}
): boolean => {
  const {
    threshold = 0.1,
    rootMargin = 50,
    triggerOnce = true,
    enabled = true,
  } = options;

  const [isVisible, setIsVisible] = useState(!enabled);
  const hasTriggeredRef = useRef(false);
  const measurementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || isVisible) return;

    // For web platform, use Intersection Observer if available
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      const element = ref.current as any;
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              if (triggerOnce) {
                observer.disconnect();
              }
            }
          });
        },
        {
          threshold,
          rootMargin: `${rootMargin}px`,
        }
      );

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }

    // For React Native, use onLayout and measureInWindow
    const checkVisibility = () => {
      if (!ref.current) return;

      try {
        const nodeHandle = findNodeHandle(ref.current);
        if (!nodeHandle) {
          // Fallback: Load after a short delay
          measurementTimeoutRef.current = setTimeout(() => {
            setIsVisible(true);
          }, 100);
          return;
        }

        UIManager.measureInWindow(nodeHandle, (x, y, width, height) => {
          if (width === 0 || height === 0) {
            // Element not laid out yet, try again
            measurementTimeoutRef.current = setTimeout(checkVisibility, 50);
            return;
          }

          // Get screen dimensions
          const { Dimensions } = require('react-native');
          const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

          // Check if element is in viewport (with rootMargin)
          const isInViewport =
            y + height >= -rootMargin &&
            y <= screenHeight + rootMargin &&
            x + width >= -rootMargin &&
            x <= screenWidth + rootMargin;

          if (isInViewport) {
            setIsVisible(true);
            hasTriggeredRef.current = true;
          } else if (!triggerOnce && hasTriggeredRef.current) {
            // If not triggerOnce and was visible before, hide it
            setIsVisible(false);
          }
        });
      } catch (error) {
        // Fallback: Load after a short delay if measurement fails
        if (__DEV__) {
          console.warn('Viewport measurement failed, using fallback:', error);
        }
        measurementTimeoutRef.current = setTimeout(() => {
          setIsVisible(true);
        }, 100);
      }
    };

    // Initial check
    checkVisibility();

    // Periodic check for scrollable content
    const intervalId = setInterval(checkVisibility, 200);

    return () => {
      if (measurementTimeoutRef.current) {
        clearTimeout(measurementTimeoutRef.current);
      }
      clearInterval(intervalId);
    };
  }, [enabled, isVisible, threshold, rootMargin, triggerOnce]);

  return isVisible;
};
