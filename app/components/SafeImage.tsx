import React from 'react';
import { Image, ImageProps, Text, View, ViewStyle } from 'react-native';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  fallbackText?: string;
  fallbackStyle?: ViewStyle;
  showFallback?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  uri,
  fallbackText = 'No Image',
  fallbackStyle,
  showFallback = true,
  style,
  ...props
}) => {
  // Check if URI is valid
  const isValidUri = uri && 
    typeof uri === 'string' && 
    uri.trim().length > 0 && 
    (uri.startsWith('http') || uri.startsWith('file://') || uri.startsWith('content://'));

  if (isValidUri) {
    return (
      <Image
        source={{ uri }}
        style={style}
        {...props}
      />
    );
  }

  // Show fallback if enabled
  if (showFallback) {
    return (
      <View
        style={[
          {
            backgroundColor: '#F3F4F6',
            justifyContent: 'center',
            alignItems: 'center',
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
};
