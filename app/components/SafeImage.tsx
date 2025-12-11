import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ImageProps, StyleSheet, Text, View } from 'react-native';
import { optimizeImageUrl } from '../../src/shared/utils/imageOptimizer';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  uri?: string;
  fallbackText?: string;
  fallbackStyle?: any;
  showFallback?: boolean;
  showLoadingIndicator?: boolean;
  // Optional optimization props (backward compatible)
  optimize?: boolean; // Enable image optimization
  containerWidth?: number; // Width for optimization
  containerHeight?: number; // Height for optimization
  size?: 'small' | 'medium' | 'large'; // Size preset
}

export const SafeImage: React.FC<SafeImageProps> = ({
  uri,
  fallbackText = 'No Image',
  fallbackStyle,
  showFallback = true,
  showLoadingIndicator = true,
  optimize = false, // Default to false for backward compatibility
  containerWidth,
  containerHeight,
  size = 'medium',
  style,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Check if URI is valid
  const isValidUri = uri && 
    typeof uri === 'string' && 
    uri.trim().length > 0 && 
    (uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://'));

  // Extract dimensions from style if not provided
  const extractedDimensions = useMemo(() => {
    if (containerWidth && containerHeight) {
      return { width: containerWidth, height: containerHeight };
    }

    // Try to extract from style
    const flattenedStyle = StyleSheet.flatten(style);
    const width = containerWidth || (flattenedStyle?.width as number) || 200;
    const height = containerHeight || (flattenedStyle?.height as number) || width;

    return { width, height };
  }, [style, containerWidth, containerHeight]);

  // Optimize image URL if enabled
  const optimizedUri = useMemo(() => {
    if (!optimize || !isValidUri || !uri) return uri;
    
    return optimizeImageUrl(
      uri,
      extractedDimensions.width,
      extractedDimensions.height,
      {
        quality: size === 'small' ? 75 : size === 'large' ? 90 : 85,
        format: 'webp',
      }
    ) || uri;
  }, [optimize, uri, isValidUri, extractedDimensions.width, extractedDimensions.height, size]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    console.warn('❌ SafeImage: Failed to load image:', uri);
  };

  if (!isValidUri || hasError) {
    // Show fallback if enabled
    if (showFallback) {
      return (
        <View
          style={[
            {
              backgroundColor: '#F3F4F6',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 200,
            },
            style,
            fallbackStyle,
          ]}
        >
          <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '500' }}>
            {fallbackText}
          </Text>
        </View>
      );
    }
    // Return null if no fallback
    return null;
  }

  return (
    <View style={[{ position: 'relative' }, style]}>
      <Image
        source={{ uri: optimizedUri }}
        style={[{ width: '100%', height: '100%' }, style]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...props}
      />
      
      {/* Loading indicator */}
      {isLoading && showLoadingIndicator && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          }}
        >
          <ActivityIndicator size="small" color="#FEA74E" />
        </View>
      )}
    </View>
  );
};