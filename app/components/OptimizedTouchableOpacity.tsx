import * as Haptics from 'expo-haptics';
import React, { memo, useCallback, useRef } from 'react';
import {
    ActivityIndicator,
    Platform,
    Text,
    TextStyle,
    TouchableOpacity,
    TouchableOpacityProps,
    ViewStyle,
} from 'react-native';

interface OptimizedTouchableOpacityProps extends Omit<TouchableOpacityProps, 'onPress'> {
  onPress: () => void | Promise<void>;
  title?: string;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  preventRapidClicks?: boolean;
  rapidClickThreshold?: number;
  hapticFeedback?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  children?: React.ReactNode;
}

const OptimizedTouchableOpacity = memo<OptimizedTouchableOpacityProps>(({
  onPress,
  title,
  loading = false,
  loadingText = 'Loading...',
  icon,
  iconPosition = 'left',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
  preventRapidClicks = true,
  rapidClickThreshold = 100,
  hapticFeedback = true,
  hapticType = 'light',
  children,
  activeOpacity = 0.7,
  ...props
}) => {
  const lastClickTime = useRef<number>(0);
  const isProcessing = useRef<boolean>(false);

  // Memoized styles for better performance
  const buttonStyle = useCallback((): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      minHeight: 44, // Minimum touch target size
      minWidth: 44,
    };

    // Size variations
    const sizeStyles: Record<string, ViewStyle> = {
      small: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        minHeight: 36,
        minWidth: 36,
      },
      medium: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 44,
        minWidth: 44,
      },
      large: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        minHeight: 52,
        minWidth: 52,
      },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: '#256E63',
      },
      secondary: {
        backgroundColor: '#6B7280',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#256E63',
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(disabled && { opacity: 0.5 }),
    };
  }, [variant, size, disabled]);

  const textStyleMemo = useCallback((): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontSize: size === 'small' ? 14 : size === 'medium' ? 16 : 18,
      fontWeight: '600',
      textAlign: 'center',
    };

    const variantTextStyles: Record<string, TextStyle> = {
      primary: { color: 'white' },
      secondary: { color: 'white' },
      outline: { color: '#256E63' },
      ghost: { color: '#256E63' },
    };

    return {
      ...baseTextStyle,
      ...variantTextStyles[variant],
      ...textStyle,
    };
  }, [variant, size, textStyle]);

  const handlePress = useCallback(async () => {
    const now = Date.now();

    // Prevent rapid successive clicks
    if (preventRapidClicks && now - lastClickTime.current < rapidClickThreshold) {
      return;
    }

    // Prevent multiple simultaneous executions
    if (isProcessing.current || disabled || loading) {
      return;
    }

    lastClickTime.current = now;
    isProcessing.current = true;

    try {
      // Provide haptic feedback immediately
      if (hapticFeedback && Platform.OS !== 'web') {
        try {
          switch (hapticType) {
            case 'light':
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              break;
            case 'medium':
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              break;
            case 'heavy':
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              break;
            case 'success':
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              break;
            case 'warning':
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              break;
            case 'error':
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              break;
          }
        } catch (error) {
          // Haptic feedback failed, continue with action
        }
      }

      // Execute the onPress function
      const result = onPress();
      
      if (result instanceof Promise) {
        // Handle async operations
        await result;
      }
    } catch (error) {
      console.error('Button press error:', error);
    } finally {
      isProcessing.current = false;
    }
  }, [
    onPress,
    preventRapidClicks,
    rapidClickThreshold,
    hapticFeedback,
    hapticType,
    disabled,
    loading,
  ]);

  const renderContent = () => {
    if (children) {
      return children;
    }

    if (loading) {
      return (
        <>
          <ActivityIndicator 
            size="small" 
            color={variant === 'outline' || variant === 'ghost' ? '#256E63' : 'white'} 
            style={{ marginRight: 8 }}
          />
          <Text style={textStyleMemo()}>{loadingText}</Text>
        </>
      );
    }

    const content = [];
    
    if (icon && iconPosition === 'left') {
      content.push(React.cloneElement(icon as React.ReactElement, { 
        key: 'icon-left',
        style: { marginRight: 8 } 
      }));
    }
    
    if (title) {
      content.push(
        <Text key="title" style={textStyleMemo()}>
          {title}
        </Text>
      );
    }
    
    if (icon && iconPosition === 'right') {
      content.push(React.cloneElement(icon as React.ReactElement, { 
        key: 'icon-right',
        style: { marginLeft: 8 } 
      }));
    }

    return content;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      style={[buttonStyle(), style]}
      activeOpacity={activeOpacity}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // Increase touch area
      {...props}
    >
      {renderContent()}
    </TouchableOpacity>
  );
});

OptimizedTouchableOpacity.displayName = 'OptimizedTouchableOpacity';

export default OptimizedTouchableOpacity; 