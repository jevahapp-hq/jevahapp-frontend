import { Image, ImageProps } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { optimizeImageUrl } from '../../src/shared/utils/imageOptimizer';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  uri?: string;
  fallbackText?: string;
  fallbackStyle?: any;
  showFallback?: boolean;
  showLoadingIndicator?: boolean;
  /** Enable URL optimization (size/quality). Default true for remote (http) URIs. */
  optimize?: boolean;
  containerWidth?: number;
  containerHeight?: number;
  size?: 'small' | 'medium' | 'large';
}

const isRemoteUri = (u: string) =>
  u.startsWith('http://') || u.startsWith('https://');

export const SafeImage: React.FC<SafeImageProps> = ({
  uri,
  fallbackText = 'No Image',
  fallbackStyle,
  showFallback = true,
  showLoadingIndicator = true,
  optimize: optimizeProp,
  containerWidth,
  containerHeight,
  size = 'medium',
  style,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isValidUri =
    uri &&
    typeof uri === 'string' &&
    uri.trim().length > 0 &&
    (uri.startsWith('http') || uri.startsWith('//') || uri.startsWith('file://') || uri.startsWith('content://'));

  const extractedDimensions = useMemo(() => {
    if (containerWidth && containerHeight) {
      return { width: containerWidth, height: containerHeight };
    }
    const flattenedStyle = StyleSheet.flatten(style as any);
    const width = containerWidth || (flattenedStyle?.width as number) || 200;
    const height = containerHeight || (flattenedStyle?.height as number) || width;
    return { width, height };
  }, [style, containerWidth, containerHeight]);

  // Default optimize=true for remote URIs (best practice); allow override via prop
  const optimize =
    optimizeProp !== undefined ? optimizeProp : (isValidUri && uri ? isRemoteUri(uri) : false);

  const optimizedUri = useMemo(() => {
    if (!optimize || !isValidUri || !uri) return uri;
    return (
      optimizeImageUrl(uri, extractedDimensions.width, extractedDimensions.height, {
        quality: size === 'small' ? 75 : size === 'large' ? 90 : 85,
        format: 'webp',
      }) || uri
    );
  }, [optimize, uri, isValidUri, extractedDimensions.width, extractedDimensions.height, size]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => setIsLoading(false);

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    if (__DEV__) console.warn('SafeImage: Failed to load', uri);
  };

  if (!isValidUri || hasError) {
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
    return null;
  }

  return (
    <View style={[{ position: 'relative' }, style]}>
      <Image
        source={{ uri: optimizedUri }}
        style={[{ width: '100%', height: '100%' }, style]}
        contentFit="cover"
        cachePolicy="disk"
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...props}
      />
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