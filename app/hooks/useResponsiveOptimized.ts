import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, PixelRatio } from 'react-native';
import { PerformanceOptimizer } from '../utils/performanceOptimization';

// Enhanced responsive hook with performance optimization
export const useResponsiveOptimized = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [pixelRatio, setPixelRatio] = useState(PixelRatio.get());

  // Device detection
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  
  // Screen size detection
  const isSmallScreen = dimensions.width < 375;
  const isMediumScreen = dimensions.width >= 375 && dimensions.width < 414;
  const isLargeScreen = dimensions.width >= 414;
  const isTablet = dimensions.width >= 768;
  const isLandscape = dimensions.width > dimensions.height;
  
  // Device capability detection
  const isLowEndDevice = dimensions.width < 375 || dimensions.height < 667;
  const isHighEndDevice = dimensions.width >= 414 && dimensions.height >= 896;
  const isOldDevice = Platform.Version < 26;
  const isHighDensity = pixelRatio >= 3;
  const isLowDensity = pixelRatio <= 1.5;

  // Performance settings based on device capabilities
  const getPerformanceSettings = useCallback(() => {
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
  }, [isIOS, isAndroid, isLowEndDevice, isHighEndDevice, isOldDevice, pixelRatio, isHighDensity]);

  // Responsive sizing functions
  const getResponsiveSize = useCallback((
    small: number,
    medium: number,
    large: number,
    tablet?: number
  ): number => {
    if (isTablet && tablet !== undefined) return tablet;
    if (isSmallScreen) return small;
    if (isMediumScreen) return medium;
    return large;
  }, [isSmallScreen, isMediumScreen, isTablet]);

  const getResponsiveFontSize = useCallback((
    small: number,
    medium: number,
    large: number,
    tablet?: number
  ): number => {
    const size = getResponsiveSize(small, medium, large, tablet);
    return isHighDensity ? size * 0.9 : size;
  }, [getResponsiveSize, isHighDensity]);

  const getResponsiveSpacing = useCallback((
    small: number,
    medium: number,
    large: number,
    tablet?: number
  ): number => {
    return getResponsiveSize(small, medium, large, tablet);
  }, [getResponsiveSize]);

  // Touch target optimization
  const getOptimizedTouchTarget = useCallback((baseSize: number = 44): number => {
    const platformOpts = PerformanceOptimizer.getPlatformOptimizations();
    const platform = isIOS ? 'ios' : isAndroid ? 'android' : 'web';
    const minSize = platformOpts[platform].touchTargetSize;
    
    return Math.max(baseSize, minSize);
  }, [isIOS, isAndroid]);

  // Optimized button handler
  const createOptimizedButtonHandler = useCallback((
    onPress: () => void | Promise<void>,
    options: {
      debounceMs?: number;
      key?: string;
      hapticFeedback?: boolean;
    } = {}
  ) => {
    const performanceSettings = getPerformanceSettings();
    const defaultDebounce = isLowEndDevice ? 200 : performanceSettings.debounceMs;
    
    return PerformanceOptimizer.handleButtonPress(onPress, {
      debounceMs: options.debounceMs || defaultDebounce,
      key: options.key || 'default',
      hapticFeedback: options.hapticFeedback ?? performanceSettings.hapticFeedback,
    });
  }, [getPerformanceSettings, isLowEndDevice]);

  // Responsive component sizes
  const getButtonSize = useCallback(() => {
    const height = getResponsiveSize(44, 48, 52, 56);
    const touchTarget = getOptimizedTouchTarget(height);
    
    return {
      height: touchTarget,
      paddingHorizontal: getResponsiveSize(16, 20, 24, 28),
      fontSize: getResponsiveFontSize(14, 16, 18, 20),
      minWidth: touchTarget,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };
  }, [getResponsiveSize, getResponsiveFontSize, getOptimizedTouchTarget]);

  const getInputSize = useCallback(() => ({
    height: getResponsiveSize(44, 48, 52, 56),
    fontSize: getResponsiveFontSize(14, 16, 18, 20),
    paddingHorizontal: getResponsiveSize(12, 16, 20, 24),
    minHeight: getOptimizedTouchTarget(44),
  }), [getResponsiveSize, getResponsiveFontSize, getOptimizedTouchTarget]);

  const getAvatarSize = useCallback((type: 'small' | 'medium' | 'large' | 'xlarge' = 'medium') => {
    const sizes = {
      small: getResponsiveSize(32, 36, 40, 44),
      medium: getResponsiveSize(40, 44, 48, 52),
      large: getResponsiveSize(48, 52, 56, 60),
      xlarge: getResponsiveSize(64, 72, 80, 88),
    };
    
    return sizes[type];
  }, [getResponsiveSize]);

  const getIconSize = useCallback((type: 'small' | 'medium' | 'large' = 'medium') => {
    const sizes = {
      small: getResponsiveSize(16, 18, 20, 22),
      medium: getResponsiveSize(20, 22, 24, 26),
      large: getResponsiveSize(24, 26, 28, 30),
    };
    
    return sizes[type];
  }, [getResponsiveSize]);

  // Responsive text styles
  const getResponsiveTextStyle = useCallback((type: 'title' | 'subtitle' | 'body' | 'caption' | 'button') => {
    const baseStyle = {
      fontFamily: 'Rubik_400Regular',
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
  }, [getResponsiveFontSize, getResponsiveSize]);

  // Responsive layout helpers
  const getResponsiveLayout = useCallback(() => ({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      overflow: 'hidden' as const,
    },
    content: {
      flex: 1,
      paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
      paddingVertical: getResponsiveSpacing(16, 20, 24, 32),
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
  }), [getResponsiveSpacing]);

  // Responsive shadow
  const getResponsiveShadow = useCallback(() => ({
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: getResponsiveSize(2, 3, 4, 5),
    },
    shadowOpacity: 0.1,
    shadowRadius: getResponsiveSize(4, 6, 8, 10),
    elevation: getResponsiveSize(4, 6, 8, 10),
  }), [getResponsiveSize]);

  // Responsive border radius
  const getResponsiveBorderRadius = useCallback((type: 'small' | 'medium' | 'large' | 'round' = 'medium') => {
    const sizes = {
      small: getResponsiveSize(4, 6, 8, 10),
      medium: getResponsiveSize(8, 12, 16, 20),
      large: getResponsiveSize(16, 20, 24, 28),
      round: getResponsiveSize(20, 24, 28, 32),
    };
    
    return sizes[type];
  }, [getResponsiveSize]);

  // Handle dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setPixelRatio(PixelRatio.get());
    });

    return () => subscription?.remove();
  }, []);

  return {
    // Device detection
    isIOS,
    isAndroid,
    isWeb,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isTablet,
    isLandscape,
    isLowEndDevice,
    isHighEndDevice,
    isOldDevice,
    isHighDensity,
    isLowDensity,
    
    // Dimensions
    dimensions,
    pixelRatio,
    
    // Performance
    getPerformanceSettings,
    createOptimizedButtonHandler,
    
    // Responsive sizing
    getResponsiveSize,
    getResponsiveFontSize,
    getResponsiveSpacing,
    getOptimizedTouchTarget,
    
    // Component sizes
    getButtonSize,
    getInputSize,
    getAvatarSize,
    getIconSize,
    
    // Styles
    getResponsiveTextStyle,
    getResponsiveLayout,
    getResponsiveShadow,
    getResponsiveBorderRadius,
  };
};




