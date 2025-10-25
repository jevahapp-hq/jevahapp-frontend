import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Image, ImageProps, View, ActivityIndicator } from 'react-native';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  lazy?: boolean;
  cache?: 'memory' | 'disk' | 'both';
  quality?: 'low' | 'medium' | 'high';
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  placeholder,
  fallback,
  lazy = true,
  cache = 'both',
  quality = 'medium',
  resizeMode = 'cover',
  style,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const imageRef = useRef<View>(null);

  // Intersection observer for lazy loading
  useIntersectionObserver(imageRef, {
    threshold: 0.1,
    rootMargin: '50px',
    onIntersect: useCallback(() => {
      setIsVisible(true);
    }, [])
  });

  const handleLoad = useCallback((event: any) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(event);
  }, [onLoad]);

  const handleError = useCallback((event: any) => {
    setHasError(true);
    setIsLoaded(false);
    onError?.(event);
  }, [onError]);

  // Optimize image source based on quality
  const optimizedSource = React.useMemo(() => {
    if (typeof source === 'number') return source;
    
    if (typeof source === 'object' && source.uri) {
      const uri = source.uri;
      
      // Add quality parameters for better performance
      if (uri.includes('cloudinary.com') || uri.includes('imagekit.io')) {
        const qualityParam = quality === 'low' ? 'q_auto:low' : 
                           quality === 'medium' ? 'q_auto:good' : 'q_auto:best';
        const separator = uri.includes('?') ? '&' : '?';
        return { uri: `${uri}${separator}${qualityParam},f_auto` };
      }
      
      return source;
    }
    
    return source;
  }, [source, quality]);

  // Show placeholder while loading
  if (!isVisible && lazy) {
    return (
      <View ref={imageRef} style={style}>
        {placeholder || (
          <View style={[style, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        )}
      </View>
    );
  }

  // Show fallback on error
  if (hasError) {
    return (
      <View style={style}>
        {fallback || (
          <View style={[style, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        )}
      </View>
    );
  }

  return (
    <Image
      ref={imageRef}
      source={optimizedSource}
      style={style}
      resizeMode={resizeMode}
      onLoad={handleLoad}
      onError={handleError}
      // Performance optimizations
      fadeDuration={0} // Disable fade animation for better performance
      loadingIndicatorSource={undefined} // Use custom loading
      {...props}
    />
  );
};

export default OptimizedImage;
