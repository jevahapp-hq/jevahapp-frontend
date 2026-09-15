import { Platform, Dimensions } from "react-native";

/** Cover-fill the reel cell. Crop overflow so there is no gap at the top. */
export const REELS_CONTENT_FIT = "cover" as const;

/**
 * Fill the visible reel cell edge-to-edge. Cover crops extra width/height
 * instead of leaving a letterbox above the picture.
 */
export function getReelsMediaFrame(width: number, height: number) {
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}

export function useReelsResponsive() {
  const windowSize = Dimensions.get("window");
  const screenHeight = windowSize.height;
  const screenWidth = windowSize.width;
  const isSmallScreen = screenHeight < 700;
  const isMediumScreen = screenHeight >= 700 && screenHeight < 800;
  const isLargeScreen = screenHeight >= 800;
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  const getResponsiveSize = (small: number, medium: number, large: number) => {
    let baseSize = isSmallScreen ? small : isMediumScreen ? medium : large;
    if (isIOS) baseSize *= 1.1;
    if (isAndroid) baseSize *= 1.05;
    return Math.round(baseSize);
  };

  const getResponsiveSpacing = (small: number, medium: number, large: number) => {
    let baseSpacing = isSmallScreen ? small : isMediumScreen ? medium : large;
    if (isIOS) baseSpacing *= 1.15;
    return Math.round(baseSpacing);
  };

  const getResponsiveFontSize = (small: number, medium: number, large: number) => {
    let baseFontSize = isSmallScreen ? small : isMediumScreen ? medium : large;
    if (isIOS) baseFontSize *= 0.95;
    if (isAndroid) baseFontSize *= 1.05;
    return Math.round(baseFontSize);
  };

  const getTouchTargetSize = () => (isIOS ? 44 : 48);

  return {
    screenHeight,
    screenWidth,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isIOS,
    isAndroid,
    getResponsiveSize,
    getResponsiveSpacing,
    getResponsiveFontSize,
    getTouchTargetSize,
  };
}
