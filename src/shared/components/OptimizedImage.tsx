import { Image, ImageProps } from 'expo-image';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { useViewportAware } from '../hooks/useViewportAware';
import { optimizeImageUrl } from '../utils/imageOptimizer';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  containerWidth?: number; // Width of container for optimization
  containerHeight?: number; // Height of container for optimization
  size?: 'small' | 'medium' | 'large'; // Size preset for optimization
  placeholder?: any; // expo-image uses blurhash or uri for placeholder
  fallback?: any;
  lazy?: boolean; // Enable lazy loading
  cache?: 'memory' | 'disk' | 'both';
  quality?: 'low' | 'medium' | 'high' | number; // Quality preset or number (0-100)
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  showLoadingIndicator?: boolean; // Show loading spinner
}

/**
 * Optimized Image Component with lazy loading and automatic optimization
 * Now powered by expo-image for superior performance and memory management.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  containerWidth,
  containerHeight,
  size = 'medium',
  placeholder,
  fallback,
  lazy = true,
  quality = 'medium',
  contentFit = 'cover',
  style,
  showLoadingIndicator = true,
  onLoad,
  onError,
  onLoadStart,
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
    const flattenedStyle = StyleSheet.flatten(style as any);
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

    if (typeof source === 'object' && source?.uri) {
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

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [onLoad, fadeAnim]);

  const handleError = useCallback((event: any) => {
    setIsLoading(false);
    setHasError(true);
    setIsLoaded(false);
    onError?.(event);
  }, [onError]);

  // Show placeholder while lazy loading
  if (lazy && !isVisible) {
    return (
      <View ref={viewRef} style={[styles.container, style as any]}>
        <View style={[styles.placeholder, {
          width: extractedDimensions.width,
          height: extractedDimensions.height
        }]}>
          {showLoadingIndicator && (
            <ActivityIndicator size="small" color="#999" />
          )}
        </View>
      </View>
    );
  }

  // Show fallback on error
  if (hasError && fallback) {
    return (
      <View style={[styles.container, styles.errorContainer, style as any]}>
        {fallback}
      </View>
    );
  }

  return (
    <View ref={viewRef} style={[styles.container, style as any]}>
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <Image
          {...props}
          source={optimizedSource as any}
          style={[styles.image, style as any]}
          contentFit={contentFit}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
          cachePolicy="disk"
          transition={300}
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
