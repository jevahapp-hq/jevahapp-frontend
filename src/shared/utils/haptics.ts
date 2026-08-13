/**
 * Shared Haptic Feedback Utilities
 * Centralized haptic feedback functions
 */

import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Trigger haptic feedback
 * Platform-specific implementation
 */
export const triggerHapticFeedback = (
  type: "light" | "medium" | "heavy" = "light"
): void => {
  if (Platform.OS === "web") return;
  try {
    const style =
      type === "heavy"
        ? Haptics.ImpactFeedbackStyle.Heavy
        : type === "medium"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
    void Haptics.impactAsync(style);
  } catch {
    // Soft devices / simulators — ignore
  }
};

/**
 * Trigger haptic feedback for button press
 */
export const triggerButtonHaptic = (): void => {
  triggerHapticFeedback("light");
};

/**
 * Decisive play/pause double-tap feel (TikTok-adjacent).
 */
export const triggerMediaPlayHaptic = (): void => {
  triggerHapticFeedback("medium");
};

/**
 * Heart-like success (notification haptic when available).
 */
export const triggerLikeHaptic = (): void => {
  if (Platform.OS === "web") return;
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    triggerHapticFeedback("medium");
  }
};

export const triggerSuccessHaptic = (): void => {
  triggerLikeHaptic();
};

/**
 * Trigger haptic feedback for error action
 */
export const triggerErrorHaptic = (): void => {
  triggerHapticFeedback("heavy");
};

