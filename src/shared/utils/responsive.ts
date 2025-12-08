/**
 * Shared Responsive Utilities
 * Centralized responsive sizing functions used across components
 */

import { Dimensions, Platform } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

export const isSmallScreen = screenWidth < 360;
export const isMediumScreen = screenWidth < 768;
export const isLargeScreen = screenWidth >= 768;

/**
 * Get responsive size based on screen size
 */
export const getResponsiveSize = (
  small: number,
  medium: number,
  large: number
): number => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

/**
 * Get responsive spacing (alias for getResponsiveSize)
 */
export const getResponsiveSpacing = (
  small: number,
  medium: number,
  large: number
): number => getResponsiveSize(small, medium, large);

/**
 * Get responsive font size
 */
export const getResponsiveFontSize = (
  small: number,
  medium: number,
  large: number
): number => getResponsiveSize(small, medium, large);

/**
 * Get touch target size based on platform
 */
export const getTouchTargetSize = (): number =>
  Platform.OS === "ios" ? 44 : 48;

/**
 * Get responsive border radius
 */
export const getResponsiveBorderRadius = (
  size: "small" | "medium" | "large"
): number => {
  const sizes = {
    small: getResponsiveSize(4, 6, 8),
    medium: getResponsiveSize(8, 10, 12),
    large: getResponsiveSize(12, 16, 20),
  };
  return sizes[size];
};
