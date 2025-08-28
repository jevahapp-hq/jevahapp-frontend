import React from 'react';
import {
    ActivityIndicator,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle
} from 'react-native';

interface InstantResponseButtonProps {
  title: string;
  onPress: () => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
  disabledStyle?: ViewStyle;
  activeOpacity?: number;
  children?: React.ReactNode;
}

export const InstantResponseButton: React.FC<InstantResponseButtonProps> = ({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  loadingColor = "white",
  disabledStyle,
  activeOpacity = 0.8,
  children
}) => {
  const isButtonDisabled = disabled || isLoading;

  const handlePress = () => {
    if (!isButtonDisabled) {
      // Execute immediately without any delays
      try {
        const result = onPress();
        if (result instanceof Promise) {
          // Handle async operations without blocking UI
          result.catch(error => {
            console.error('Button press error:', error);
          });
        }
      } catch (error) {
        console.error('Button press error:', error);
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isButtonDisabled}
      style={[
        {
          backgroundColor: isButtonDisabled ? '#9CA3AF' : '#090E24',
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 25,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          minHeight: 45,
        },
        style,
        isButtonDisabled && disabledStyle
      ]}
      activeOpacity={isButtonDisabled ? 1 : activeOpacity}
    >
      {isLoading && (
        <ActivityIndicator 
          size="small" 
          color={loadingColor} 
          style={{ marginRight: 8 }}
        />
      )}
      {children || (
        <Text
          style={[
            {
              color: 'white',
              fontSize: 16,
              fontWeight: '600',
              textAlign: 'center',
            },
            textStyle
          ]}
        >
          {isLoading ? "Loading..." : title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
