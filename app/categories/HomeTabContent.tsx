import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
  lazy,
  type ReactNode,
} from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { AllContentTikTok } from "../../src/features/media/AllContentTikTok";
import { FeedSkeletonStack } from "../../src/features/media/AllContentTikTok/components/FeedMediaCardSkeleton";
import {
  getResponsiveBorderRadius,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";
import Header from "../components/Header";
import { ContentErrorBoundary } from "../components/ContentErrorBoundary";
import { useAuth } from "../hooks/useAuth";
import {
  readHomeFeedCategory,
  rememberHomeFeedCategory,
} from "../../src/shared/media/homeFeedCategory";
import { useReelsStore } from "@/store/useReelsStore";
import { feedTabFromResumeKey } from "../../src/features/media/video-feed";

const Music = lazy(() => import("./music"));
const Hymns = lazy(() => import("./hymns"));
const LiveComponent = lazy(() => import("./LiveComponent"));

const categories = ["ALL", "LIVE", "HYMNS", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];
const FEED_CATEGORIES = ["ALL", "SERMON", "VIDEO", "E-BOOKS"] as const;

function CategorySuspense({ children }: { children: ReactNode }) {
  return (
    <ContentErrorBoundary>
      <Suspense fallback={<FeedSkeletonStack />}>{children}</Suspense>
    </ContentErrorBoundary>
  );
}

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
  switch (category.toUpperCase()) {
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
    default:
      return "ALL";
  }
};

const mapContentTypeToCategory = (contentType: string): string => {
  const t = contentType.toLowerCase();
  if (t === "videos" || t === "video") return "VIDEO";
  if (t === "music" || t === "audio") return "MUSIC";
  if (t === "sermon" || t === "teachings") return "SERMON";
  if (t === "hymns" || t === "hyms") return "HYMNS";
  if (t === "e-books" || t === "ebook" || t === "books") return "E-BOOKS";
  if (t === "live") return "LIVE";
  const upper = contentType.toUpperCase();
  return categories.includes(upper) ? upper : "ALL";
};

export default function HomeTabContent({
  isTabActive = true,
}: {
  isTabActive?: boolean;
}) {
  const { defaultCategory } = useLocalSearchParams();
  const { isAuthenticated } = useAuth();

  const defaultCategoryValue = Array.isArray(defaultCategory)
    ? defaultCategory[0]
    : defaultCategory;

  const initialCategory = (() => {
    const resumeTab = feedTabFromResumeKey(
      useReelsStore.getState().resumePlayback?.feedKey
    );
    if (resumeTab) return mapContentTypeToCategory(resumeTab);
    if (defaultCategoryValue && typeof defaultCategoryValue === "string") {
      return mapContentTypeToCategory(defaultCategoryValue);
    }
    return mapContentTypeToCategory(readHomeFeedCategory());
  })();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const selectedRef = useRef(selectedCategory);
  const seededCategoryRef = useRef(false);
  if (!seededCategoryRef.current) {
    seededCategoryRef.current = true;
    rememberHomeFeedCategory(mapCategoryToContentType(initialCategory));
  }
  const scrollViewRef = useRef<ScrollView>(null);
  const chipLayouts = useRef<Record<string, { x: number; width: number }>>(
    {}
  );
  const lastAppliedParamRef = useRef(defaultCategoryValue);
  const chipRadius = getResponsiveBorderRadius("medium");
  const railPad = getResponsiveSpacing(16, 20, 24, 32);

  const scrollChipIntoView = useCallback((category: string) => {
    const run = () => {
      const scrollView = scrollViewRef.current;
      if (!scrollView) return;
      const selectedIndex = categories.indexOf(category);
      if (selectedIndex < 0) return;
      const screenWidth = Dimensions.get("window").width;
      const scrollViewWidth = screenWidth - railPad * 2;
      const layout = chipLayouts.current[category];
      if (layout) {
        const buttonCenter = layout.x + layout.width / 2;
        scrollView.scrollTo({
          x: Math.max(0, buttonCenter - scrollViewWidth / 2),
          animated: true,
        });
        return;
      }
      const buttonWidth = 100;
      const buttonMargin = getResponsiveSpacing(4, 6, 8, 10) * 2;
      const accumulatedWidth = selectedIndex * (buttonWidth + buttonMargin);
      scrollView.scrollTo({
        x: Math.max(
          0,
          accumulatedWidth - scrollViewWidth / 2 + buttonWidth / 2
        ),
        animated: true,
      });
    };
    requestAnimationFrame(run);
    setTimeout(run, 180);
  }, [railPad]);

  const applyCategory = useCallback(
    (category: string) => {
      rememberHomeFeedCategory(mapCategoryToContentType(category));
      if (category !== selectedRef.current) {
        selectedRef.current = category;
        setSelectedCategory(category);
      }
      scrollChipIntoView(category);
    },
    [scrollChipIntoView]
  );

  const handleCategoryPress = useCallback(
    (category: string) => {
      if (category === selectedRef.current) {
        scrollChipIntoView(category);
        return;
      }
      applyCategory(category);
    },
    [applyCategory, scrollChipIntoView]
  );

  useEffect(() => {
    if (!defaultCategoryValue || typeof defaultCategoryValue !== "string") {
      return;
    }
    if (defaultCategoryValue === lastAppliedParamRef.current) return;
    lastAppliedParamRef.current = defaultCategoryValue;
    applyCategory(mapContentTypeToCategory(defaultCategoryValue));
  }, [applyCategory, defaultCategoryValue]);

  useFocusEffect(
    useCallback(() => {
      if (!isTabActive) return;
      const resume = useReelsStore.getState().resumePlayback;
      const fromReels =
        resume?.target === "feed" || resume?.target === "reels";
      const tab =
        (fromReels ? feedTabFromResumeKey(resume?.feedKey) : null) ||
        readHomeFeedCategory();
      // applyCategory only remounts the feed when the chip actually changes.
      applyCategory(mapContentTypeToCategory(tab));
    }, [applyCategory, isTabActive])
  );

  return (
    <View style={styles.root}>
      <View style={styles.chrome}>
        <Header />

        <View style={[styles.rail, { paddingHorizontal: railPad }]}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.railScroll}
            contentContainerStyle={styles.railContent}
          >
            {categories.map((category) => {
              const selected = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  activeOpacity={0.6}
                  delayPressIn={0}
                  delayPressOut={0}
                  onPress={() => handleCategoryPress(category)}
                  onLayout={(event) => {
                    chipLayouts.current[category] = {
                      x: event.nativeEvent.layout.x,
                      width: event.nativeEvent.layout.width,
                    };
                  }}
                  style={{
                    marginHorizontal: getResponsiveSpacing(4, 6, 8, 10),
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: chipRadius,
                    borderWidth: selected ? 0 : 1,
                    borderColor: selected ? "transparent" : "#6B6E7C",
                    backgroundColor: selected ? "#000000" : "#FFFFFF",
                    height: 44,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text
                      style={[
                        getResponsiveTextStyle("button"),
                        { color: selected ? "#FFFFFF" : "#1D2939" },
                      ]}
                    >
                      {category}
                    </Text>
                    {category === "LIVE" ? (
                      <View style={styles.liveDot} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.feed}>
        <View style={styles.feedHost}>
          {(FEED_CATEGORIES as readonly string[]).includes(selectedCategory) ? (
            <View key={selectedCategory} collapsable={false} style={styles.feedActive}>
              <AllContentTikTok
                contentType={mapCategoryToContentType(selectedCategory)}
                useAuthFeed={isAuthenticated}
                isFeedActive={isTabActive}
                keepVideoDecoders={false}
              />
            </View>
          ) : null}

          {selectedCategory === "MUSIC" ? (
            <View style={styles.feedActive} collapsable={false}>
              <CategorySuspense>
                <Music />
              </CategorySuspense>
            </View>
          ) : null}
          {selectedCategory === "HYMNS" ? (
            <View style={styles.feedActive} collapsable={false}>
              <CategorySuspense>
                <Hymns />
              </CategorySuspense>
            </View>
          ) : null}
          {selectedCategory === "LIVE" ? (
            <View style={styles.feedActive} collapsable={false}>
              <CategorySuspense>
                <LiveComponent />
              </CategorySuspense>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FCFCFD",
  },
  chrome: {
    zIndex: 20,
    backgroundColor: "#FCFCFD",
  },
  rail: {
    minHeight: 60,
    paddingVertical: 8,
    backgroundColor: "#FCFCFD",
    justifyContent: "center",
  },
  railScroll: {
    flexGrow: 0,
  },
  railContent: {
    alignItems: "center",
    paddingRight: 16,
  },
  liveDot: {
    position: "absolute",
    top: -6,
    right: -8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "red",
  },
  feed: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FCFCFD",
  },
  feedHost: {
    flex: 1,
    overflow: "hidden",
  },
  feedActive: {
    flex: 1,
  },
});
