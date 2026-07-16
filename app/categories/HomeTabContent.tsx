import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { AllContentTikTok } from "../../src/features/media/AllContentTikTok";
import {
  getResponsiveBorderRadius,
  getResponsiveShadow,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";
import Header from "../components/Header";
import { useAuth } from "../hooks/useAuth";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useMediaStore } from "../store/useUploadStore";
import GlobalAudioInstanceManager from "../utils/globalAudioInstanceManager";
import Hymns from "./hymns";
import LiveComponent from "./LiveComponent";
import Music from "./music";

// NOTE: "HYMNS" requested as its own category, positioned between LIVE and SERMON.
const categories = ["ALL", "LIVE", "HYMNS", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];

/** Categories that share AllContentTikTok — keep them mounted to avoid remount refresh. */
const PERSISTENT_FEED_CATEGORIES = ["ALL", "VIDEO", "SERMON", "E-BOOKS"] as const;

/** Categories that mount expo-video feed players. */
const VIDEO_PLAYER_CATEGORIES = new Set(["ALL", "VIDEO", "SERMON"]);

/**
 * Keep ALL / VIDEO / SERMON players warm whenever those feeds have been
 * visited so category switches show the same place + video (no remount).
 */
function shouldKeepVideoDecoders(
  feedCat: (typeof PERSISTENT_FEED_CATEGORIES)[number]
): boolean {
  return VIDEO_PLAYER_CATEGORIES.has(feedCat);
}

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
  if (
    contentTypeLower === "e-books" ||
    contentTypeLower === "ebook" ||
    contentTypeLower === "books"
  ) {
    return "E-BOOKS";
  }
  if (contentTypeLower === "live") {
    return "LIVE";
  }
  const contentTypeUpper = contentType.toUpperCase();
  if (categories.includes(contentTypeUpper)) {
    return contentTypeUpper;
  }
  return "ALL";
};

export default function HomeTabContent() {
  const { defaultCategory } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const defaultCategoryValue = Array.isArray(defaultCategory)
    ? defaultCategory[0]
    : defaultCategory;

  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (defaultCategoryValue && typeof defaultCategoryValue === "string") {
      return mapContentTypeToCategory(defaultCategoryValue);
    }
    return "ALL";
  });

  // Pre-mount every persistent feed so ALL ↔ SERMON ↔ VIDEO ↔ E-BOOKS is
  // instant (data + FlashList already warm — opacity swap only).
  const [visitedFeedCategories, setVisitedFeedCategories] = useState<Set<string>>(
    () => new Set(PERSISTENT_FEED_CATEGORIES)
  );

  useEffect(() => {
    if (defaultCategoryValue && typeof defaultCategoryValue === "string") {
      const mappedCategory = mapContentTypeToCategory(defaultCategoryValue);
      if (categories.includes(mappedCategory)) {
        setSelectedCategory(mappedCategory);
        if (
          (PERSISTENT_FEED_CATEGORIES as readonly string[]).includes(
            mappedCategory
          )
        ) {
          setVisitedFeedCategories((prev) =>
            prev.has(mappedCategory) ? prev : new Set(prev).add(mappedCategory)
          );
        }
      }
    }
  }, [defaultCategoryValue]);

  const scrollViewRef = useRef<ScrollView>(null);
  const buttonLayouts = useRef<{ [key: string]: { x: number; width: number } }>(
    {}
  );

  useEffect(() => {
    if (selectedCategory && scrollViewRef.current) {
      setTimeout(() => {
        const selectedIndex = categories.indexOf(selectedCategory);
        if (selectedIndex !== -1 && scrollViewRef.current) {
          const scrollView = scrollViewRef.current;
          const screenWidth = Dimensions.get("window").width;
          const parentPadding = getResponsiveSpacing(16, 20, 24, 32);
          const scrollViewWidth = screenWidth - parentPadding * 2;

          if (buttonLayouts.current[selectedCategory]) {
            const buttonLayout = buttonLayouts.current[selectedCategory];
            const buttonCenter = buttonLayout.x + buttonLayout.width / 2;
            const viewportCenter = scrollViewWidth / 2;
            const scrollPosition = buttonCenter - viewportCenter;

            scrollView.scrollTo({
              x: Math.max(0, scrollPosition),
              animated: true,
            });
          } else {
            const buttonWidth = 100;
            const buttonMargin = getResponsiveSpacing(4, 6, 8, 10) * 2;
            let accumulatedWidth = 0;
            for (let i = 0; i < selectedIndex; i++) {
              accumulatedWidth += buttonWidth + buttonMargin;
            }
            const scrollPosition =
              accumulatedWidth -
              scrollViewWidth / 2 +
              buttonWidth / 2 -
              parentPadding;

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
      const previousCategory = selectedCategory;
      if (category === previousCategory) return;

      setSelectedCategory(category);

      if (
        (PERSISTENT_FEED_CATEGORIES as readonly string[]).includes(category)
      ) {
        setVisitedFeedCategories((prev) =>
          prev.has(category) ? prev : new Set(prev).add(category)
        );
      }

      setTimeout(() => {
        try {
          const contentTypeParam = mapCategoryToContentType(category);
          router.setParams({ defaultCategory: contentTypeParam });
        } catch {
          // Silently fail - route param update is not critical for UI
        }
      }, 0);

      // Pause media bleed only — do not remount feeds. Persistent panes stay
      // alive under opacity; the newly active feed resumes via isFeedActive.
      requestAnimationFrame(() => {
        try {
          useMediaStore.getState().stopAudioFn?.();
        } catch {
          // no-op
        }
        if (category === "HYMNS") {
          try {
            GlobalAudioInstanceManager.getInstance().stopAllAudio?.();
          } catch {
            // no-op
          }
          try {
            useGlobalAudioPlayerStore.getState().clear?.();
          } catch {
            // no-op
          }
        }
        try {
          useGlobalVideoStore.getState().pauseAllVideos();
        } catch {
          // no-op
        }
      });
    },
    [selectedCategory, router]
  );

  const isPersistentFeedCategory = (
    PERSISTENT_FEED_CATEGORIES as readonly string[]
  ).includes(selectedCategory);

  return (
    <View style={{ flex: 1, width: "100%" }}>
      <Header />

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
          removeClippedSubviews={false}
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

      {/* All persistent feeds stay mounted with the same layout box.
          Switching categories only toggles opacity — never flex↔absolute
          (that remounts FlashList and looks like a refresh). */}
      <View style={{ flex: 1, width: "100%", backgroundColor: "#FCFCFD" }}>
        <View style={styles.feedHost}>
          {PERSISTENT_FEED_CATEGORIES.filter((cat) =>
            visitedFeedCategories.has(cat)
          ).map((cat) => {
            const active = selectedCategory === cat;
            return (
              <View
                key={cat}
                collapsable={false}
                style={[
                  styles.feedPane,
                  {
                    opacity: active ? 1 : 0,
                    pointerEvents: active ? "auto" : "none",
                    zIndex: active ? 2 : 0,
                    elevation: active ? 2 : 0,
                    // Park inactive panes off-screen (VideoView ignores opacity).
                    // Always pass a real transform array — `undefined`/`null`
                    // crashes RN validateTransforms on tab switch.
                    transform: [{ translateX: active ? 0 : 4000 }],
                  },
                ]}
              >
                <AllContentTikTok
                  contentType={mapCategoryToContentType(cat)}
                  useAuthFeed={!!user}
                  isFeedActive={active}
                  // Only the active feed may keep decoders warm.
                  // Keeping ALL+VIDEO+SERMON warm at once hung the device.
                  keepVideoDecoders={active && shouldKeepVideoDecoders(cat)}
                />
              </View>
            );
          })}

          {!isPersistentFeedCategory && selectedCategory === "MUSIC" && (
            <View style={styles.feedPane}>
              <Music />
            </View>
          )}
          {!isPersistentFeedCategory && selectedCategory === "HYMNS" && (
            <View style={styles.feedPane}>
              <Hymns />
            </View>
          )}
          {!isPersistentFeedCategory && selectedCategory === "LIVE" && (
            <View style={styles.feedPane}>
              <LiveComponent />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feedHost: {
    flex: 1,
  },
  feedPane: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
