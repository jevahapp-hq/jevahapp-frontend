import React from 'react';
import { ActivityIndicator, Text, View, ViewStyle } from 'react-native';

interface FastLoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
}

export const FastLoadingIndicator: React.FC<FastLoadingIndicatorProps> = ({
  message = "Loading...",
  size = 'small',
  color = '#256E63',
  style
}) => {
  return (
    <View style={[
      {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      },
      style
    ]}>
      <ActivityIndicator size={size} color={color} />
      <Text style={{
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        textAlign: 'center'
      }}>
        {message}
      </Text>
    </View>
  );
};
