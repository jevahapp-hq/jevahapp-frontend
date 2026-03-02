import React from 'react';
import { ActivityIndicator, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';

interface FastLoadingButtonProps {
  title: string;
  loadingTitle?: string;
  onPress: () => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loadingColor?: string;
  disabledStyle?: ViewStyle;
}

export const FastLoadingButton: React.FC<FastLoadingButtonProps> = ({
  title,
  loadingTitle = "Loading...",
  onPress,
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  loadingColor = "white",
  disabledStyle
}) => {
  const isButtonDisabled = disabled || isLoading;

  const handlePress = () => {
    if (!isButtonDisabled) {
      onPress();
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
      activeOpacity={isButtonDisabled ? 1 : 0.8}
    >
      {isLoading && (
        <ActivityIndicator 
          size="small" 
          color={loadingColor} 
          style={{ marginRight: 8 }}
        />
      )}
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
        {isLoading ? loadingTitle : title}
      </Text>
    </TouchableOpacity>
  );
};
