/**
 * Shared Haptic Feedback Utilities
 * Centralized haptic feedback functions
 */

import { Platform } from "react-native";

/**
 * Trigger haptic feedback
 * Platform-specific implementation
 */
export const triggerHapticFeedback = (type: "light" | "medium" | "heavy" = "light"): void => {
  if (Platform.OS === "ios") {
    // iOS haptic feedback
    // Note: Requires expo-haptics package
    // import * as Haptics from 'expo-haptics';
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle[type]);
  } else if (Platform.OS === "android") {
    // Android haptic feedback
    // Note: Requires react-native-haptic-feedback package
    // HapticFeedback.trigger(type);
  }
  // Silent fallback for other platforms
};

/**
 * Trigger haptic feedback for button press
 */
export const triggerButtonHaptic = (): void => {
  triggerHapticFeedback("light");
};

/**
 * Trigger haptic feedback for success action
 */
export const triggerSuccessHaptic = (): void => {
  triggerHapticFeedback("medium");
};

/**
 * Trigger haptic feedback for error action
 */
export const triggerErrorHaptic = (): void => {
  triggerHapticFeedback("heavy");
};

