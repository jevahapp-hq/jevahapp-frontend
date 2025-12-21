import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, ImageProps, StyleSheet, View } from 'react-native';
import { useViewportAware } from '../hooks/useViewportAware';
import { optimizeImageUrl } from '../utils/imageOptimizer';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  containerWidth?: number; // Width of container for optimization
  containerHeight?: number; // Height of container for optimization
  size?: 'small' | 'medium' | 'large'; // Size preset for optimization
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  lazy?: boolean; // Enable lazy loading
  cache?: 'memory' | 'disk' | 'both';
  quality?: 'low' | 'medium' | 'high' | number; // Quality preset or number (0-100)
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  showLoadingIndicator?: boolean; // Show loading spinner
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

/**
 * Optimized Image Component with lazy loading and automatic optimization
 * 
 * Features:
 * - Automatic image URL optimization based on container size
 * - Lazy loading (only loads when visible)
 * - Placeholder support
 * - Error handling with fallback
 * - Zero breaking changes - works as drop-in replacement for Image
 * 
 * @example
 * // Basic usage (backward compatible)
 * <OptimizedImage source={{ uri: imageUrl }} style={{ width: 150, height: 150 }} />
 * 
 * // With optimization
 * <OptimizedImage 
 *   source={{ uri: thumbnailUrl }} 
 *   containerWidth={150}
 *   containerHeight={150}
 *   size="small"
 *   lazy={true}
 * />
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  containerWidth,
  containerHeight,
  size = 'medium',
  placeholder,
  fallback,
  lazy = true,
  cache = 'both',
  quality = 'medium',
  resizeMode = 'cover',
  style,
  showLoadingIndicator = true,
  onLoad,
  onError,
  onLoadStart,
  onLoadEnd,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const viewRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Extract dimensions from style if not provided
  const extractedDimensions = useMemo(() => {
    if (containerWidth && containerHeight) {
      return { width: containerWidth, height: containerHeight };
    }

    // Try to extract from style
    const flattenedStyle = StyleSheet.flatten(style);
    const width = containerWidth || (flattenedStyle?.width as number) || 150;
    const height = containerHeight || (flattenedStyle?.height as number) || width;

    return { width, height };
  }, [style, containerWidth, containerHeight]);

  // Viewport-aware lazy loading
  const isVisible = useViewportAware(viewRef, {
    threshold: 0.1,
    rootMargin: 50,
    triggerOnce: true,
    enabled: lazy,
  });

  // Optimize image URL
  const optimizedSource = useMemo(() => {
    if (typeof source === 'number') return source;
    
    if (typeof source === 'object' && source.uri) {
      const uri = source.uri;
      
      // Convert quality preset to number
      let qualityNumber: number | undefined;
      if (typeof quality === 'number') {
        qualityNumber = quality;
      } else {
        qualityNumber = quality === 'low' ? 75 : quality === 'high' ? 90 : 85;
      }

      // Use container dimensions for optimization
      const optimizedUri = optimizeImageUrl(
        uri,
        extractedDimensions.width,
        extractedDimensions.height,
        {
          quality: qualityNumber,
          format: 'webp',
        }
      );

      return { uri: optimizedUri || uri };
    }
    
    return source;
  }, [source, extractedDimensions.width, extractedDimensions.height, quality]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setIsLoaded(false);
    setHasError(false);
    onLoadStart?.();
  }, [onLoadStart]);

  const handleLoad = useCallback((event: any) => {
    setIsLoaded(true);
    setIsLoading(false);
    setHasError(false);
    onLoad?.(event);
    onLoadEnd?.();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [onLoad, onLoadEnd, fadeAnim]);

  const handleError = useCallback((event: any) => {
    setIsLoading(false);
    setHasError(true);
    setIsLoaded(false);
    onError?.(event);
  }, [onError]);

  // Show placeholder while lazy loading
  if (lazy && !isVisible) {
    return (
      <View ref={viewRef} style={[styles.container, style]}>
        {placeholder || (
          <View style={[styles.placeholder, { 
            width: extractedDimensions.width, 
            height: extractedDimensions.height 
          }]}>
            {showLoadingIndicator && (
              <ActivityIndicator size="small" color="#999" />
            )}
          </View>
        )}
      </View>
    );
  }

  // Show fallback on error
  if (hasError) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        {fallback || (
          <View style={[styles.placeholder, { 
            width: extractedDimensions.width, 
            height: extractedDimensions.height 
          }]}>
            {showLoadingIndicator && (
              <ActivityIndicator size="small" color="#999" />
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View ref={viewRef} style={[styles.container, style]}>
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <Image
          {...props}
          source={optimizedSource}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
          // Performance optimizations
          fadeDuration={0} // Disable fade animation for better performance
          loadingIndicatorSource={undefined} // Use custom loading
        />
      </Animated.View>
      
      {isLoading && showLoadingIndicator && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 240, 240, 0.8)',
  },
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#e0e0e0',
  },
});

export default OptimizedImage;
