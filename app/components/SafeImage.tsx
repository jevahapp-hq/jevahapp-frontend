import React, { useState } from 'react';
import { ActivityIndicator, Image, ImageProps, Text, View } from 'react-native';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  uri?: string;
  fallbackText?: string;
  fallbackStyle?: any;
  showFallback?: boolean;
  showLoadingIndicator?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  uri,
  fallbackText = 'No Image',
  fallbackStyle,
  showFallback = true,
  showLoadingIndicator = true,
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
        source={{ uri }}
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