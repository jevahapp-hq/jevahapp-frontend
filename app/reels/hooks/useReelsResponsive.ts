import { Platform, Dimensions } from "react-native";

export function useReelsResponsive() {
  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;
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
