import { Dimensions, PixelRatio, Platform, StatusBar } from 'react-native';
import { PerformanceOptimizer } from './performanceOptimization';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enhanced screen size breakpoints with better device detection
export const isSmallScreen = screenWidth < 375;
export const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
export const isLargeScreen = screenWidth >= 414;
export const isTablet = screenWidth >= 768;
export const isLandscape = screenWidth > screenHeight;

// Device type detection with more granular control
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

// Enhanced device capability detection
export const isLowEndDevice = screenWidth < 375 || screenHeight < 667; // iPhone SE or smaller
export const isHighEndDevice = screenWidth >= 414 && screenHeight >= 896; // iPhone 11 Pro Max or larger
export const isOldDevice = Platform.Version < 26; // Android API level 26 or lower

// Status bar and safe area handling
export const statusBarHeight = StatusBar.currentHeight || 0;
export const safeAreaTop = isIOS ? 44 : statusBarHeight;
export const safeAreaBottom = isIOS ? 34 : 0;

// Pixel density optimization
export const pixelRatio = PixelRatio.get();
export const isHighDensity = pixelRatio >= 3;
export const isLowDensity = pixelRatio <= 1.5;

// Enhanced responsive sizing functions with performance optimization
export const getResponsiveSize = (
  small: number,
  medium: number,
  large: number,
  tablet?: number
): number => {
  // Get performance settings based on device capabilities
  const performanceSettings = PerformanceOptimizer.getResponsivePerformanceSettings();
  const settings = isLowEndDevice ? performanceSettings.lowEnd : 
                   isHighEndDevice ? performanceSettings.highEnd : 
                   performanceSettings.default;

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
  const size = getResponsiveSize(small, medium, large, tablet);
  // Optimize font size for high-density displays
  return isHighDensity ? size * 0.9 : size;
};

export const getResponsiveSpacing = (
  small: number,
  medium: number,
  large: number,
  tablet?: number
): number => {
  return getResponsiveSize(small, medium, large, tablet);
};

// Enhanced touch target optimization
export const getOptimizedTouchTarget = (baseSize: number = 44): number => {
  const platformOpts = PerformanceOptimizer.getPlatformOptimizations();
  const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';
  const minSize = platformOpts[platform].touchTargetSize;
  
  return Math.max(baseSize, minSize);
};

// Enhanced button sizing with touch optimization
export const getButtonSize = () => {
  const height = getResponsiveSize(44, 48, 52, 56);
  const touchTarget = getOptimizedTouchTarget(height);
  
  return {
    height: touchTarget,
    paddingHorizontal: getResponsiveSize(16, 20, 24, 28),
    fontSize: getResponsiveFontSize(14, 16, 18, 20),
    minWidth: touchTarget, // Ensure minimum touch target width
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };
};

// Enhanced input sizing
export const getInputSize = () => ({
  height: getResponsiveSize(44, 48, 52, 56),
  fontSize: getResponsiveFontSize(14, 16, 18, 20),
  paddingHorizontal: getResponsiveSize(12, 16, 20, 24),
  minHeight: getOptimizedTouchTarget(44),
});

// Enhanced grid configuration with performance optimization
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

// Enhanced media picker sizing
export const getMediaPickerSize = () => {
  const size = getResponsiveSize(140, 160, 180, 200);
  return {
    width: size,
    height: size,
    borderRadius: getResponsiveSize(8, 12, 16, 20),
  };
};

// Enhanced header sizing
export const getHeaderHeight = () => {
  return getResponsiveSize(56, 60, 64, 72) + safeAreaTop;
};

// Enhanced bottom navigation sizing
export const getBottomNavHeight = () => {
  return getResponsiveSize(80, 84, 88, 96) + safeAreaBottom;
};

// Enhanced card sizing with performance optimization
export const getCardSize = () => ({
  width: screenWidth - getResponsiveSpacing(32, 40, 48, 64),
  height: getResponsiveSize(200, 240, 280, 320),
  borderRadius: getResponsiveSize(12, 16, 20, 24),
  padding: getResponsiveSpacing(12, 16, 20, 24),
  // Add performance optimizations for rendering
  overflow: 'hidden' as const,
});

// Enhanced avatar sizing
export const getAvatarSize = (type: 'small' | 'medium' | 'large' | 'xlarge' = 'medium') => {
  const sizes = {
    small: getResponsiveSize(32, 36, 40, 44),
    medium: getResponsiveSize(40, 44, 48, 52),
    large: getResponsiveSize(48, 52, 56, 60),
    xlarge: getResponsiveSize(64, 72, 80, 88),
  };
  
  return sizes[type];
};

// Enhanced icon sizing
export const getIconSize = (type: 'small' | 'medium' | 'large' = 'medium') => {
  const sizes = {
    small: getResponsiveSize(16, 18, 20, 22),
    medium: getResponsiveSize(20, 22, 24, 26),
    large: getResponsiveSize(24, 26, 28, 30),
  };
  
  return sizes[type];
};

// Enhanced modal sizing with performance optimization
export const getModalSize = () => ({
  width: screenWidth - getResponsiveSpacing(32, 40, 48, 64),
  maxHeight: screenHeight * 0.8,
  borderRadius: getResponsiveSize(16, 20, 24, 28),
  padding: getResponsiveSpacing(16, 20, 24, 32),
  // Add performance optimizations
  backgroundColor: 'white',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
});

// Enhanced list item sizing
export const getListItemHeight = () => {
  return getResponsiveSize(56, 64, 72, 80);
};

// Enhanced search bar sizing
export const getSearchBarSize = () => ({
  height: getResponsiveSize(40, 44, 48, 52),
  fontSize: getResponsiveFontSize(14, 16, 18, 20),
  borderRadius: getResponsiveSize(20, 22, 24, 26),
  paddingHorizontal: getResponsiveSpacing(16, 20, 24, 28),
});

// Enhanced tab bar sizing
export const getTabBarSize = () => ({
  height: getResponsiveSize(48, 52, 56, 60),
  fontSize: getResponsiveFontSize(12, 14, 16, 18),
  paddingHorizontal: getResponsiveSpacing(8, 12, 16, 20),
});

// Enhanced floating action button sizing
export const getFabSize = () => ({
  size: getResponsiveSize(48, 52, 56, 60),
  iconSize: getResponsiveSize(20, 22, 24, 26),
  bottom: getResponsiveSize(80, 84, 88, 96),
});

// Enhanced responsive margins and padding
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

// Enhanced responsive shadow with performance optimization
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

// Enhanced responsive border radius
export const getResponsiveBorderRadius = (type: 'small' | 'medium' | 'large' | 'round' = 'medium') => {
  const sizes = {
    small: getResponsiveSize(4, 6, 8, 10),
    medium: getResponsiveSize(8, 12, 16, 20),
    large: getResponsiveSize(16, 20, 24, 28),
    round: getResponsiveSize(20, 24, 28, 32),
  };
  
  return sizes[type];
};

// Enhanced screen dimensions
export const getScreenDimensions = () => ({
  width: screenWidth,
  height: screenHeight,
  isLandscape,
  isTablet,
  safeAreaTop,
  safeAreaBottom,
  pixelRatio,
  isHighDensity,
  isLowDensity,
});

// Enhanced responsive text styles with performance optimization
export const getResponsiveTextStyle = (type: 'title' | 'subtitle' | 'body' | 'caption' | 'button') => {
  const baseStyle = {
    fontFamily: 'Rubik_400Regular',
    // Add performance optimizations
    includeFontPadding: false,
    textAlignVertical: 'center' as const,
  };

  const styles = {
    title: {
      ...baseStyle,
      fontSize: getResponsiveFontSize(24, 28, 32, 36),
      fontWeight: '700' as const,
      lineHeight: getResponsiveSize(32, 36, 40, 44),
    },
    subtitle: {
      ...baseStyle,
      fontSize: getResponsiveFontSize(18, 20, 22, 24),
      fontWeight: '600' as const,
      lineHeight: getResponsiveSize(24, 26, 28, 30),
    },
    body: {
      ...baseStyle,
      fontSize: getResponsiveFontSize(14, 16, 18, 20),
      fontWeight: '400' as const,
      lineHeight: getResponsiveSize(20, 22, 24, 26),
    },
    caption: {
      ...baseStyle,
      fontSize: getResponsiveFontSize(12, 14, 16, 18),
      fontWeight: '400' as const,
      lineHeight: getResponsiveSize(16, 18, 20, 22),
    },
    button: {
      ...baseStyle,
      fontSize: getResponsiveFontSize(14, 16, 18, 20),
      fontWeight: '600' as const,
      lineHeight: getResponsiveSize(20, 22, 24, 26),
    },
  };

  return styles[type];
};

// Enhanced orientation detection
export const getOrientation = (): 'portrait' | 'landscape' => {
  return isLandscape ? 'landscape' : 'portrait';
};

// Enhanced keyboard adjustment for different platforms
export const getKeyboardAdjustment = () => ({
  behavior: Platform.OS === 'ios' ? 'padding' as const : 'height' as const,
  keyboardVerticalOffset: Platform.OS === 'ios' ? 0 : 0,
});

// Enhanced thumbnail size for media pickers
export const getThumbnailSize = () => ({
  width: getResponsiveSize(80, 100, 120, 140),
  height: getResponsiveSize(80, 100, 120, 140),
});

// Enhanced safe source creation with performance optimization
export const createSafeImageSource = (uri?: string | null, fallback?: any) => {
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    return fallback || require('../../assets/images/image (5).png');
  }
  
  const trimmedUri = uri.trim();
  if (!trimmedUri) {
    return fallback || require('../../assets/images/image (5).png');
  }
  
  return { uri: trimmedUri };
};

export const createSafeVideoSource = (uri?: string | null, fallback = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4') => {
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    return { uri: fallback };
  }
  
  const trimmedUri = uri.trim();
  if (!trimmedUri) {
    return { uri: fallback };
  }
  
  return { uri: trimmedUri };
};

// Enhanced responsive layout helpers with performance optimization
export const getResponsiveLayout = () => ({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // Add performance optimizations
    overflow: 'hidden' as const,
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

// Device-specific performance settings
export const getDevicePerformanceSettings = () => {
  const platformOpts = PerformanceOptimizer.getPlatformOptimizations();
  const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';
  
  return {
    ...platformOpts[platform],
    isLowEndDevice,
    isHighEndDevice,
    isOldDevice,
    pixelRatio,
    isHighDensity,
  };
};

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
  isLowEndDevice,
  isHighEndDevice,
  isOldDevice,
  
  // Sizing functions
  getResponsiveSize,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getOptimizedTouchTarget,
  getButtonSize,
  getInputSize,
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
  
  // Performance settings
  getDevicePerformanceSettings,
};
