import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getResponsiveBorderRadius,
  getResponsiveShadow,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";
import Header from "../components/Header";
import { useCurrentPlayingAudioStore } from "../store/useCurrentPlayingAudioStore";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useMediaStore } from "../store/useUploadStore";
import GlobalAudioInstanceManager from "../utils/globalAudioInstanceManager";
import AllContentTikTok from "./AllContentTikTok";
import Music from "./music";
import Hymns from "./hymns";
import LiveComponent from "./LiveComponent";

// NOTE: "HYMNS" requested as its own category, positioned between LIVE and SERMON.
const categories = ["ALL", "LIVE", "HYMNS", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];

// Map uppercase category names to ContentType format expected by AllContentTikTok
const mapCategoryToContentType = (
  category: string
):
  | "ALL"
  | "video"
  | "videos"
  | "audio"
  | "music"
  | "sermon"
  | "image"
  | "ebook"
  | "books"
  | "live"
  | "teachings"
  | "e-books"
  | "hymns" => {
  const categoryUpper = category.toUpperCase();
  switch (categoryUpper) {
    case "VIDEO":
      return "videos";
    case "MUSIC":
      return "music";
    case "HYMNS":
      return "hymns";
    case "SERMON":
      return "sermon";
    case "E-BOOKS":
      return "e-books";
    case "LIVE":
      return "live";
    case "ALL":
    default:
      return "ALL";
  }
};

// Map ContentType values back to uppercase category names for UI
const mapContentTypeToCategory = (contentType: string): string => {
  const contentTypeLower = contentType.toLowerCase();
  // Map ContentType values to uppercase category names
  if (contentTypeLower === "videos" || contentTypeLower === "video") {
    return "VIDEO";
  }
  if (contentTypeLower === "music" || contentTypeLower === "audio") {
    return "MUSIC";
  }
  if (contentTypeLower === "sermon" || contentTypeLower === "teachings") {
    return "SERMON";
  }
  if (contentTypeLower === "hymns" || contentTypeLower === "hyms") {
    return "HYMNS";
  }
  if (contentTypeLower === "e-books" || contentTypeLower === "ebook" || contentTypeLower === "books") {
    return "E-BOOKS";
  }
  if (contentTypeLower === "live") {
    return "LIVE";
  }
  // If it's already uppercase and matches a category, return it
  const contentTypeUpper = contentType.toUpperCase();
  if (categories.includes(contentTypeUpper)) {
    return contentTypeUpper;
  }
  return "ALL";
};

export default function HomeTabContent() {
  const { defaultCategory } = useLocalSearchParams();
  const router = useRouter();
  
  // Handle defaultCategory as string or array (expo-router can return arrays)
  const defaultCategoryValue = Array.isArray(defaultCategory)
    ? defaultCategory[0]
    : defaultCategory;
  
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (defaultCategoryValue && typeof defaultCategoryValue === "string") {
      const mapped = mapContentTypeToCategory(defaultCategoryValue);
      // console.log(`🏠 HomeTabContent: Initial category from param "${defaultCategoryValue}" mapped to "${mapped}"`);
      return mapped;
    }
    return "ALL";
  });

  // Update selected category when defaultCategory param changes
  // This ensures that when navigating back from reels with a specific category,
  // the category is properly restored instead of defaulting to "ALL"
  useEffect(() => {
    if (defaultCategoryValue && typeof defaultCategoryValue === "string") {
      const mappedCategory = mapContentTypeToCategory(defaultCategoryValue);
      // console.log(`🏠 HomeTabContent: Category param changed "${defaultCategoryValue}" -> "${mappedCategory}"`);
      if (categories.includes(mappedCategory)) {
        setSelectedCategory(mappedCategory);
        // console.log(`🏠 HomeTabContent: Updated selectedCategory to "${mappedCategory}"`);
      } else {
        // console.warn(`🏠 HomeTabContent: Mapped category "${mappedCategory}" not in categories list`);
      }
    } else {
      // console.log(`🏠 HomeTabContent: No valid defaultCategory param, keeping current category`);
    }
  }, [defaultCategoryValue]);

  const scrollViewRef = useRef<ScrollView>(null);
  const buttonLayouts = useRef<{ [key: string]: { x: number; width: number } }>({});

  // Scroll to selected category button when category changes
  useEffect(() => {
    if (selectedCategory && scrollViewRef.current) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        const selectedIndex = categories.indexOf(selectedCategory);
        if (selectedIndex !== -1 && scrollViewRef.current) {
          const scrollView = scrollViewRef.current;
          const screenWidth = Dimensions.get('window').width;
          const parentPadding = getResponsiveSpacing(16, 20, 24, 32);
          const scrollViewWidth = screenWidth - parentPadding * 2;
          
          // Try to use stored position if available
          if (buttonLayouts.current[selectedCategory]) {
            const buttonLayout = buttonLayouts.current[selectedCategory];
            // Calculate scroll position to center the button in the viewport
            // buttonLayout.x is the position relative to ScrollView content
            // We want to center it: scroll to (buttonX - viewportCenter) + (buttonWidth / 2)
            const buttonCenter = buttonLayout.x + (buttonLayout.width / 2);
            const viewportCenter = scrollViewWidth / 2;
            const scrollPosition = buttonCenter - viewportCenter;
            
            scrollView.scrollTo({
              x: Math.max(0, scrollPosition),
              animated: true,
            });
          } else {
            // Fallback: scroll based on approximate position
            const buttonWidth = 100; // Approximate button width including padding
            const buttonMargin = getResponsiveSpacing(4, 6, 8, 10) * 2; // Left + right margin
            
            // Calculate approximate button position
            let accumulatedWidth = 0;
            for (let i = 0; i < selectedIndex; i++) {
              accumulatedWidth += buttonWidth + buttonMargin;
            }
            
            // Center the button
            const scrollPosition = accumulatedWidth - (scrollViewWidth / 2) + (buttonWidth / 2) - parentPadding;
            
            scrollView.scrollTo({
              x: Math.max(0, scrollPosition),
              animated: true,
            });
          }
        }
      }, 200);
    }
  }, [selectedCategory]);

  const handleCategoryPress = useCallback(
    (category: string) => {
      // CRITICAL: Immediate state update for instant visual feedback
      // Don't wait for anything - update state first
      setSelectedCategory(category);

      // Update route params asynchronously (non-blocking)
      // Use setTimeout with 0 delay to defer without blocking UI
      setTimeout(() => {
        try {
          const contentTypeParam = mapCategoryToContentType(category);
          router.setParams({ defaultCategory: contentTypeParam });
        } catch (error) {
          // Silently fail - route param update is not critical for UI
        }
      }, 0);

      // Only stop media if actually switching to a different category
      // Defer to next tick to avoid blocking the state update
      if (category !== selectedCategory) {
        // Use setTimeout instead of requestAnimationFrame for better responsiveness
        setTimeout(() => {
          try {
            useMediaStore.getState().stopAudioFn?.();
          } catch (e) {
            // no-op
          }
          // HYMNS: ensure global audio mini-players are cleared so they don't show on hymns browsing.
          if (category === "HYMNS") {
            try {
              // Stop any legacy audio instances
              GlobalAudioInstanceManager.getInstance().stopAllAudio?.();
            } catch (e) {
              // no-op
            }
            try {
              // Clear the legacy mini player store
              useCurrentPlayingAudioStore.getState().clearCurrentAudio?.();
            } catch (e) {
              // no-op
            }
            try {
              // Clear the global floating player store
              useGlobalAudioPlayerStore.getState().clear?.();
            } catch (e) {
              // no-op
            }
          }
          try {
            useGlobalVideoStore.getState().pauseAllVideos();
          } catch (e) {
            // no-op
          }
        }, 0);
      }
    },
    [selectedCategory, router]
  );

  const renderContent = () => {
    // Music category should show copyright-free catalog (not user uploads)
    if (selectedCategory === "MUSIC") {
      return <Music />;
    }

    // Hymns category should show hymns component
    if (selectedCategory === "HYMNS") {
      return <Hymns />;
    }

    // Live category should show LiveComponent
    if (selectedCategory === "LIVE") {
      return <LiveComponent />;
    }

    return (
      <AllContentTikTok contentType={mapCategoryToContentType(selectedCategory)} />
    );

   
  };

  

  return (
    <View style={{ flex: 1, width: "100%" }}>
      <Header />

      {/* Category Buttons with Padding */}
      <View
        style={{
          paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
          backgroundColor: "#FCFCFD",
        }}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={true}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={undefined}
          disableIntervalMomentum={true}
          keyboardShouldPersistTaps="handled"
          style={{
            paddingVertical: getResponsiveSpacing(12, 16, 20, 24),
            marginTop: getResponsiveSpacing(20, 24, 28, 32),
          }}
          contentContainerStyle={{
            paddingHorizontal: 0,
          }}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => {
                // Immediate execution without fastPress wrapper to avoid debounce delays
                handleCategoryPress(category);
              }}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                buttonLayouts.current[category] = { x, width };
              }}
              activeOpacity={0.6}
              delayPressIn={0}
              delayPressOut={0}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
              style={{
                paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                marginHorizontal: getResponsiveSpacing(4, 6, 8, 10),
                borderRadius: getResponsiveBorderRadius("medium"),
                backgroundColor:
                  selectedCategory === category ? "black" : "white",
                borderWidth: selectedCategory === category ? 0 : 1,
                borderColor:
                  selectedCategory === category ? "transparent" : "#6B6E7C",
                ...getResponsiveShadow(),
                minWidth: 48,
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
                elevation: 3,
              }}
            >
              <View style={{ position: "relative" }}>
                <Text
                  style={[
                    getResponsiveTextStyle("button"),
                    {
                      color:
                        selectedCategory === category ? "white" : "#1D2939",
                    },
                  ]}
                >
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
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content without Padding - Let FlatList handle scrolling */}
      <View style={{ flex: 1, width: "100%", backgroundColor: "#FCFCFD" }}>{renderContent()}</View>
    </View>
  );
}
