import { memo, useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { useLocalSearchParams } from "expo-router";
import {
    getResponsiveBorderRadius,
    getResponsiveShadow,
    getResponsiveSpacing,
    getResponsiveTextStyle
} from "../../utils/responsive";
import Header from "../components/Header";
import OptimizedTouchableOpacity from "../components/OptimizedTouchableOpacity";
import { useFastButton } from "../hooks/useFastButton";
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useMediaStore } from "../store/useUploadStore";
import AllContent from "./Allcontent";
import EbookComponent from "./EbookComponent";
import LiveComponent from "./LiveComponent";
import Music from "./music";
import SermonComponent from "./SermonComponent";
import VideoComponent from "./VideoComponent";

const categories = ["ALL", "LIVE", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];

// Memoized category button component for better performance
const CategoryButton = memo(({ 
  category, 
  isSelected, 
  onPress 
}: { 
  category: string; 
  isSelected: boolean; 
  onPress: () => void; 
}) => {
  const buttonHandler = useFastButton(onPress, {
    preventRapidClicks: true,
    rapidClickThreshold: 50, // Faster response
    hapticFeedback: true,
    hapticType: 'light',
  });

  return (
    <OptimizedTouchableOpacity
      onPress={buttonHandler.handlePress}
      activeOpacity={0.7}
      preventRapidClicks={true}
      rapidClickThreshold={50}
      hapticFeedback={true}
      hapticType="light"
      style={{
        paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
        paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
        marginHorizontal: getResponsiveSpacing(4, 6, 8, 10),
        borderRadius: getResponsiveBorderRadius('medium'),
        backgroundColor: isSelected ? 'black' : 'white',
        borderWidth: isSelected ? 0 : 1,
        borderColor: isSelected ? 'transparent' : '#6B6E7C',
        ...getResponsiveShadow(),
        minWidth: 48,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View style={{ position: 'relative' }}>
        <Text style={[
          getResponsiveTextStyle('button'),
          {
            color: isSelected ? 'white' : '#1D2939',
          }
        ]}>
          {category}
        </Text>
        {category === "LIVE" && (
          <View
            style={{
              position: "absolute",
              top: -getResponsiveSpacing(4, 6, 8, 10),
              right: getResponsiveSpacing(4, 6, 8, 10),
              width: getResponsiveSpacing(4, 5, 6, 7),
              height: getResponsiveSpacing(4, 5, 6, 7),
              borderRadius: getResponsiveSpacing(2, 3, 4, 5),
              backgroundColor: "red",
            }}
          />
        )}
      </View>
    </OptimizedTouchableOpacity>
  );
});

CategoryButton.displayName = 'CategoryButton';

// Memoized content components for lazy loading
const LazyAllContent = memo(() => <AllContent />);
const LazyLiveComponent = memo(() => <LiveComponent />);
const LazySermonComponent = memo(() => <SermonComponent />);
const LazyMusic = memo(() => <Music />);
const LazyEbookComponent = memo(() => <EbookComponent />);
const LazyVideoComponent = memo(() => <VideoComponent />);

LazyAllContent.displayName = 'LazyAllContent';
LazyLiveComponent.displayName = 'LazyLiveComponent';
LazySermonComponent.displayName = 'LazySermonComponent';
LazyMusic.displayName = 'LazyMusic';
LazyEbookComponent.displayName = 'LazyEbookComponent';
LazyVideoComponent.displayName = 'LazyVideoComponent';

export default function HomeTabContent() {
  const { defaultCategory } = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(
    (defaultCategory as string) || "ALL"
  );

  // Performance monitoring
  const performance = usePerformanceMonitor({
    componentName: 'HomeTabContent',
    trackRenders: true,
    trackButtonClicks: true,
    slowButtonThreshold: 50, // Expect faster response
  });

  // Optimized category press handler
  const handleCategoryPress = useCallback((category: string) => {
    // Provide immediate visual feedback
    setSelectedCategory(category);
    
    // Only stop media if actually switching to a different category
    if (category !== selectedCategory) {
      // Use InteractionManager for non-blocking media operations
      const { InteractionManager } = require('react-native');
      InteractionManager.runAfterInteractions(() => {
        try {
          useMediaStore.getState().stopAudioFn?.();
        } catch (e) {
          // no-op
        }
        try {
          useGlobalVideoStore.getState().pauseAllVideos();
        } catch (e) {
          // no-op
        }
      });
    }
  }, [selectedCategory]);

  // Create individual fast button handlers for each category
  const allButtonHandler = useFastButton(() => handleCategoryPress("ALL"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const liveButtonHandler = useFastButton(() => handleCategoryPress("LIVE"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const sermonButtonHandler = useFastButton(() => handleCategoryPress("SERMON"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const musicButtonHandler = useFastButton(() => handleCategoryPress("MUSIC"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const ebookButtonHandler = useFastButton(() => handleCategoryPress("E-BOOKS"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const videoButtonHandler = useFastButton(() => handleCategoryPress("VIDEO"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  // Memoized category button handlers mapping
  const categoryButtonHandlers = useMemo(() => ({
    "ALL": allButtonHandler.handlePress,
    "LIVE": liveButtonHandler.handlePress,
    "SERMON": sermonButtonHandler.handlePress,
    "MUSIC": musicButtonHandler.handlePress,
    "E-BOOKS": ebookButtonHandler.handlePress,
    "VIDEO": videoButtonHandler.handlePress,
  } as Record<string, () => void>), [allButtonHandler, liveButtonHandler, sermonButtonHandler, musicButtonHandler, ebookButtonHandler, videoButtonHandler]);

  // Memoized content renderer
  const renderContent = useMemo(() => {
    switch (selectedCategory) {
      case "ALL":
        return <LazyAllContent />;
      case "LIVE":
        return <LazyLiveComponent />;
      case "SERMON":
        return <LazySermonComponent />;
      case "MUSIC":
        return <LazyMusic />;
      case "E-BOOKS":
        return <LazyEbookComponent />;
      case "VIDEO":
        return <LazyVideoComponent />;
      default:
        return <LazyAllContent />;
    }
  }, [selectedCategory]);

  // Memoized category buttons
  const categoryButtons = useMemo(() => (
    categories.map((category) => (
      <CategoryButton
        key={category}
        category={category}
        isSelected={selectedCategory === category}
        onPress={categoryButtonHandlers[category]}
      />
    ))
  ), [selectedCategory, categoryButtonHandlers]);

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <Header />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#FCFCFD' }}
      >
        {/* Category Buttons with Padding */}
        <View style={{ paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32) }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
              paddingVertical: getResponsiveSpacing(12, 16, 20, 24),
              marginTop: getResponsiveSpacing(20, 24, 28, 32),
            }}
          >
            {categoryButtons}
          </ScrollView>
        </View>
        {/* Content without Padding */}
        <View style={{ flex: 1, width: '100%', paddingBottom: 100 }}>
          {renderContent}
        </View>
      </ScrollView>
    </View>
  );
}
