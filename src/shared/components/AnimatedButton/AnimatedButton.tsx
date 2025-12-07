import React from "react";
import { TouchableOpacity, TouchableOpacityProps, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface AnimatedButtonProps extends Omit<TouchableOpacityProps, "style"> {
  /**
   * Custom style for the button
   */
  style?: ViewStyle | ViewStyle[];
  /**
   * Scale value when pressed (default: 0.85)
   */
  pressScale?: number;
  /**
   * Spring animation damping (default: 15)
   */
  damping?: number;
  /**
   * Spring animation stiffness (default: 300)
   */
  stiffness?: number;
  /**
   * Disable animation
   */
  disableAnimation?: boolean;
  /**
   * Children to render inside the button
   */
  children: React.ReactNode;
}

/**
 * AnimatedButton - A reusable button component with scale animation feedback
 * Provides instant visual feedback similar to TikTok-like interactions
 */
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  style,
  pressScale = 0.85,
  damping = 15,
  stiffness = 300,
  disableAnimation = false,
  onPress,
  children,
  activeOpacity = 1,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: disableAnimation ? [] : [{ scale: scale.value }],
  }));

  const handlePress = (event: any) => {
    if (!disableAnimation) {
      scale.value = withSpring(
        pressScale,
        { damping, stiffness },
        () => {
          scale.value = withSpring(1, { damping, stiffness });
        }
      );
    }
    onPress?.(event);
  };

  return (
    <AnimatedTouchableOpacity
      {...props}
      onPress={handlePress}
      style={[style, animatedStyle]}
      activeOpacity={activeOpacity}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
};

export default AnimatedButton;






