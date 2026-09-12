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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useLocalSearchParams } from "expo-router";
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
import { prefetchHomeTabModulesPromise } from "../utils/prefetchHomeTabs";

const Music = lazy(() => import("./music"));
const Hymns = lazy(() => import("./hymns"));
const LiveComponent = lazy(() => import("./LiveComponent"));

const categories = ["ALL", "LIVE", "HYMNS", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];
const FEED_CATEGORIES = ["ALL", "SERMON", "VIDEO", "E-BOOKS"] as const;
const LAZY_CATEGORIES = ["MUSIC", "HYMNS", "LIVE"] as const;

/** Native VideoView ignores opacity and transform — park with layout `left`. */
const OFFSCREEN_X = 4000;

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

function paneStyle(active: boolean) {
  return [styles.feedPane, active ? styles.feedPaneOn : styles.feedPaneOff];
}

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
    if (defaultCategoryValue && typeof defaultCategoryValue === "string") {
      return mapContentTypeToCategory(defaultCategoryValue);
    }
    return "ALL";
  })();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const selectedRef = useRef(selectedCategory);
  const [visitedFeedCategories, setVisitedFeedCategories] = useState<
    Set<string>
  >(() => {
    const start = (FEED_CATEGORIES as readonly string[]).includes(
      initialCategory
    )
      ? initialCategory
      : "ALL";
    return new Set([start]);
  });
  const [visitedLazyCategories, setVisitedLazyCategories] = useState<
    Set<string>
  >(() =>
    (LAZY_CATEGORIES as readonly string[]).includes(initialCategory)
      ? new Set([initialCategory])
      : new Set()
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const chipRadius = getResponsiveBorderRadius("medium");
  const railPad = getResponsiveSpacing(16, 20, 24, 32);

  const handleCategoryPress = useCallback((category: string) => {
    if (category === selectedRef.current) return;
    selectedRef.current = category;
    setSelectedCategory(category);
    if ((FEED_CATEGORIES as readonly string[]).includes(category)) {
      setVisitedFeedCategories((prev) =>
        prev.has(category) ? prev : new Set(prev).add(category)
      );
    }
    if ((LAZY_CATEGORIES as readonly string[]).includes(category)) {
      setVisitedLazyCategories((prev) =>
        prev.has(category) ? prev : new Set(prev).add(category)
      );
    }
  }, []);

  useEffect(() => {
    void prefetchHomeTabModulesPromise();
  }, []);

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
          {FEED_CATEGORIES.filter((cat) => visitedFeedCategories.has(cat)).map(
            (cat) => {
              const active = selectedCategory === cat;
              return (
                <View key={cat} collapsable={false} style={paneStyle(active)}>
                  <AllContentTikTok
                    contentType={mapCategoryToContentType(cat)}
                    useAuthFeed={isAuthenticated}
                    isFeedActive={active && isTabActive}
                    keepVideoDecoders={false}
                  />
                </View>
              );
            }
          )}

          {visitedLazyCategories.has("MUSIC") ? (
            <View
              style={paneStyle(selectedCategory === "MUSIC")}
              collapsable={false}
            >
              <CategorySuspense>
                <Music />
              </CategorySuspense>
            </View>
          ) : null}
          {visitedLazyCategories.has("HYMNS") ? (
            <View
              style={paneStyle(selectedCategory === "HYMNS")}
              collapsable={false}
            >
              <CategorySuspense>
                <Hymns />
              </CategorySuspense>
            </View>
          ) : null}
          {visitedLazyCategories.has("LIVE") ? (
            <View
              style={paneStyle(selectedCategory === "LIVE")}
              collapsable={false}
            >
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
  feedPane: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "100%",
  },
  feedPaneOn: {
    left: 0,
    zIndex: 2,
    elevation: 2,
    opacity: 1,
  },
  feedPaneOff: {
    left: OFFSCREEN_X,
    zIndex: 0,
    elevation: 0,
    opacity: 0,
  },
});
