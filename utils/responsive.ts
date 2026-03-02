import { Dimensions, Platform, StatusBar } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Screen size breakpoints
export const isSmallScreen = screenWidth < 375;
export const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
export const isLargeScreen = screenWidth >= 414;
export const isTablet = screenWidth >= 768;
export const isLandscape = screenWidth > screenHeight;

// Device type detection
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

// Status bar height
export const statusBarHeight = StatusBar.currentHeight || 0;
export const safeAreaTop = isIOS ? 44 : statusBarHeight;
export const safeAreaBottom = isIOS ? 34 : 0;

// Responsive sizing functions
export const getResponsiveSize = (
  small: number,
  medium: number,
  large: number,
  tablet?: number
): number => {
  if (isTablet && tablet !== undefined) return tablet;
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

export const getResponsiveFontSize = (
  small: number,
  medium: number,
  large: number,
  tablet?: number
): number => {
  return getResponsiveSize(small, medium, large, tablet);
};

export const getResponsiveSpacing = (
  small: number,
  medium: number,
  large: number,
  tablet?: number
): number => {
  return getResponsiveSize(small, medium, large, tablet);
};

// Component-specific responsive utilities
export const getButtonSize = () => ({
  height: getResponsiveSize(44, 48, 52, 56),
  paddingHorizontal: getResponsiveSize(16, 20, 24, 28),
  fontSize: getResponsiveFontSize(14, 16, 18, 20),
});

export const getInputSize = () => ({
  height: getResponsiveSize(44, 48, 52, 56),
  fontSize: getResponsiveFontSize(14, 16, 18, 20),
  paddingHorizontal: getResponsiveSize(12, 16, 20, 24),
});

export const getTouchTargetSize = (): number => {
  return getResponsiveSize(44, 48, 52, 56);
};

export const getGridConfig = (columns: {
  small: number;
  medium: number;
  large: number;
  tablet?: number;
}) => {
  const columnCount = getResponsiveSize(
    columns.small,
    columns.medium,
    columns.large,
    columns.tablet
  );
  
  const spacing = getResponsiveSpacing(8, 12, 16, 20);
  const itemSize = (screenWidth - (spacing * (columnCount + 1))) / columnCount;
  
  return {
    columns: columnCount,
    spacing,
    itemSize,
    containerPadding: getResponsiveSpacing(16, 20, 24, 32),
  };
};

// Media picker responsive sizing
export const getMediaPickerSize = () => {
  const size = getResponsiveSize(140, 160, 180, 200);
  return {
    width: size,
    height: size,
  };
};

// Header responsive sizing
export const getHeaderHeight = () => {
  return getResponsiveSize(56, 60, 64, 72) + safeAreaTop;
};

// Bottom navigation responsive sizing
export const getBottomNavHeight = () => {
  return getResponsiveSize(80, 84, 88, 96) + safeAreaBottom;
};

// Card responsive sizing
export const getCardSize = () => ({
  width: screenWidth - getResponsiveSpacing(32, 40, 48, 64),
  height: getResponsiveSize(200, 240, 280, 320),
  borderRadius: getResponsiveSize(12, 16, 20, 24),
  padding: getResponsiveSpacing(12, 16, 20, 24),
});

// Avatar responsive sizing
export const getAvatarSize = (type: 'small' | 'medium' | 'large' | 'xlarge' = 'medium') => {
  switch (type) {
    case 'small':
      return getResponsiveSize(32, 36, 40, 44);
    case 'medium':
      return getResponsiveSize(40, 44, 48, 52);
    case 'large':
      return getResponsiveSize(48, 52, 56, 60);
    case 'xlarge':
      return getResponsiveSize(64, 72, 80, 88);
    default:
      return getResponsiveSize(40, 44, 48, 52);
  }
};

// Icon responsive sizing
export const getIconSize = (type: 'small' | 'medium' | 'large' = 'medium') => {
  switch (type) {
    case 'small':
      return getResponsiveSize(16, 18, 20, 22);
    case 'medium':
      return getResponsiveSize(20, 22, 24, 26);
    case 'large':
      return getResponsiveSize(24, 26, 28, 30);
    default:
      return getResponsiveSize(20, 22, 24, 26);
  }
};

// Modal responsive sizing
export const getModalSize = () => ({
  width: screenWidth - getResponsiveSpacing(32, 40, 48, 64),
  maxHeight: screenHeight * 0.8,
  borderRadius: getResponsiveSize(16, 20, 24, 28),
  padding: getResponsiveSpacing(16, 20, 24, 32),
});

// List item responsive sizing
export const getListItemHeight = () => {
  return getResponsiveSize(56, 64, 72, 80);
};

// Search bar responsive sizing
export const getSearchBarSize = () => ({
  height: getResponsiveSize(40, 44, 48, 52),
  fontSize: getResponsiveFontSize(14, 16, 18, 20),
  borderRadius: getResponsiveSize(20, 22, 24, 26),
  paddingHorizontal: getResponsiveSpacing(16, 20, 24, 28),
});

// Tab bar responsive sizing
export const getTabBarSize = () => ({
  height: getResponsiveSize(48, 52, 56, 60),
  fontSize: getResponsiveFontSize(12, 14, 16, 18),
  paddingHorizontal: getResponsiveSpacing(8, 12, 16, 20),
});

// Floating action button responsive sizing
export const getFabSize = () => ({
  size: getResponsiveSize(48, 52, 56, 60),
  iconSize: getResponsiveSize(20, 22, 24, 26),
  bottom: getResponsiveSize(80, 84, 88, 96),
});

// Responsive margins and padding
export const getResponsiveMargin = (direction: 'horizontal' | 'vertical' | 'all' = 'all') => {
  const margin = getResponsiveSpacing(16, 20, 24, 32);
  
  switch (direction) {
    case 'horizontal':
      return { marginHorizontal: margin };
    case 'vertical':
      return { marginVertical: margin };
    default:
      return { margin };
  }
};

export const getResponsivePadding = (direction: 'horizontal' | 'vertical' | 'all' = 'all') => {
  const padding = getResponsiveSpacing(16, 20, 24, 32);
  
  switch (direction) {
    case 'horizontal':
      return { paddingHorizontal: padding };
    case 'vertical':
      return { paddingVertical: padding };
    default:
      return { padding };
  }
};

// Responsive shadow
export const getResponsiveShadow = () => ({
      shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: getResponsiveSize(2, 3, 4, 5),
  },
      shadowOpacity: 0.1,
  shadowRadius: getResponsiveSize(4, 6, 8, 10),
  elevation: getResponsiveSize(4, 6, 8, 10),
});

// Responsive border radius
export const getResponsiveBorderRadius = (type: 'small' | 'medium' | 'large' | 'round' = 'medium') => {
  switch (type) {
    case 'small':
      return getResponsiveSize(4, 6, 8, 10);
    case 'medium':
      return getResponsiveSize(8, 12, 16, 20);
    case 'large':
      return getResponsiveSize(16, 20, 24, 28);
    case 'round':
      return getResponsiveSize(20, 24, 28, 32);
    default:
      return getResponsiveSize(8, 12, 16, 20);
  }
};

// Screen dimensions
export const getScreenDimensions = () => ({
  width: screenWidth,
  height: screenHeight,
  isLandscape,
  isTablet,
  safeAreaTop,
  safeAreaBottom,
});

// Responsive text styles
export const getResponsiveTextStyle = (type: 'title' | 'subtitle' | 'body' | 'caption' | 'button') => {
  const baseStyle = {
    fontFamily: 'Rubik_400Regular',
  };

  switch (type) {
    case 'title':
    return {
        ...baseStyle,
        fontSize: getResponsiveFontSize(24, 28, 32, 36),
        fontWeight: '700' as const,
        lineHeight: getResponsiveSize(32, 36, 40, 44),
      };
    case 'subtitle':
    return {
        ...baseStyle,
        fontSize: getResponsiveFontSize(18, 20, 22, 24),
        fontWeight: '600' as const,
        lineHeight: getResponsiveSize(24, 26, 28, 30),
      };
    case 'body':
      return {
        ...baseStyle,
        fontSize: getResponsiveFontSize(14, 16, 18, 20),
        fontWeight: '400' as const,
        lineHeight: getResponsiveSize(20, 22, 24, 26),
      };
    case 'caption':
    return {
        ...baseStyle,
        fontSize: getResponsiveFontSize(12, 14, 16, 18),
        fontWeight: '400' as const,
        lineHeight: getResponsiveSize(16, 18, 20, 22),
      };
    case 'button':
    return {
        ...baseStyle,
        fontSize: getResponsiveFontSize(14, 16, 18, 20),
        fontWeight: '600' as const,
        lineHeight: getResponsiveSize(20, 22, 24, 26),
      };
    default:
      return baseStyle;
  }
};

// Get orientation
export const getOrientation = (): 'portrait' | 'landscape' => {
  return isLandscape ? 'landscape' : 'portrait';
};

// Keyboard adjustment for different platforms
export const getKeyboardAdjustment = () => ({
  behavior: Platform.OS === 'ios' ? 'padding' as const : 'height' as const,
});

// Thumbnail size for media pickers
export const getThumbnailSize = () => ({
  width: getResponsiveSize(80, 100, 120, 140),
  height: getResponsiveSize(80, 100, 120, 140),
});

/**
 * Safely creates an image source object, preventing empty URI warnings
 */
export const createSafeImageSource = (uri?: string | null, fallback?: any) => {
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    return fallback || require('../assets/images/image (5).png');
  }
  
  const trimmedUri = uri.trim();
  if (!trimmedUri) {
    return fallback || require('../assets/images/image (5).png');
  }
  
  return { uri: trimmedUri };
};

/**
 * Safely creates a video source object, preventing empty URI warnings
 */
export const createSafeVideoSource = (uri?: string | null, fallback = 'https://example.com/placeholder.mp4') => {
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    return { uri: fallback };
  }
  
  const trimmedUri = uri.trim();
  if (!trimmedUri) {
    return { uri: fallback };
  }
  
  return { uri: trimmedUri };
};

// Responsive layout helpers
export const getResponsiveLayout = () => ({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    ...getResponsivePadding(),
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  center: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  spaceBetween: {
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
});

// Export all utilities
export default {
  // Screen detection
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  isTablet,
  isLandscape,
  isIOS,
  isAndroid,
  isWeb,
  
  // Sizing functions
  getResponsiveSize,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getButtonSize,
  getInputSize,
  getTouchTargetSize,
  getGridConfig,
  getMediaPickerSize,
  getHeaderHeight,
  getBottomNavHeight,
  getCardSize,
  getAvatarSize,
  getIconSize,
  getModalSize,
  getListItemHeight,
  getSearchBarSize,
  getTabBarSize,
  getFabSize,
  getThumbnailSize,
  
  // Layout helpers
  getResponsiveMargin,
  getResponsivePadding,
  getResponsiveShadow,
  getResponsiveBorderRadius,
  getScreenDimensions,
  getResponsiveTextStyle,
  getResponsiveLayout,
  getOrientation,
  getKeyboardAdjustment,
  
  // Safe source creation
  createSafeImageSource,
  createSafeVideoSource,
};

