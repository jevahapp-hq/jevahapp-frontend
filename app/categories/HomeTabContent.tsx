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
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useLocalSearchParams, useRouter } from "expo-router";
import { AllContentTikTok } from "../../src/features/media/AllContentTikTok";
import { FeedSkeletonStack } from "../../src/features/media/AllContentTikTok/components/FeedMediaCardSkeleton";
import { isLiteProfileActive } from "../../src/shared/lite/liteProfile";
import {
  getResponsiveBorderRadius,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";
import Header from "../components/Header";
import { useCommentModal } from "../context/CommentModalContext";
import { useAuth } from "../hooks/useAuth";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { useMediaStore } from "@/store/useUploadStore";

const Music = lazy(() => import("./music"));
const Hymns = lazy(() => import("./hymns"));
const LiveComponent = lazy(() => import("./LiveComponent"));

const TAB_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const TAB_MS = 220;

function CategorySuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FeedSkeletonStack />}>{children}</Suspense>;
}

const categories = ["ALL", "LIVE", "HYMNS", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];
const FEED_CATEGORIES = ["ALL", "SERMON", "VIDEO", "E-BOOKS"] as const;

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

function AnimatedFeedPane({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: TAB_MS,
      easing: TAB_EASE,
    });
  }, [active, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: (1 - progress.value) * 18 }],
  }));

  return (
    <Animated.View
      pointerEvents={active ? "auto" : "none"}
      style={[
        {
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default function HomeTabContent() {
  const { defaultCategory } = useLocalSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isVisible: isCommentSheetOpen } = useCommentModal();

  const defaultCategoryValue = Array.isArray(defaultCategory)
    ? defaultCategory[0]
    : defaultCategory;

  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (defaultCategoryValue && typeof defaultCategoryValue === "string") {
      return mapContentTypeToCategory(defaultCategoryValue);
    }
    return "ALL";
  });
  const selectedRef = useRef(selectedCategory);
  const [mountedFeeds, setMountedFeeds] = useState<
    Partial<Record<string, boolean>>
  >(() => {
    const initial =
      defaultCategoryValue && typeof defaultCategoryValue === "string"
        ? mapContentTypeToCategory(defaultCategoryValue)
        : "ALL";
    return { ALL: true, [initial]: true };
  });

  const pillX = useSharedValue(0);
  const pillY = useSharedValue(0);
  const pillW = useSharedValue(64);
  const pillH = useSharedValue(40);
  const buttonLayouts = useRef<{
    [key: string]: { x: number; y: number; width: number; height: number };
  }>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const movePillTo = useCallback(
    (category: string, instant = false) => {
      const layout = buttonLayouts.current[category];
      if (!layout) return;
      const cfg = instant
        ? { duration: 0 }
        : { duration: TAB_MS, easing: TAB_EASE };
      pillX.value = withTiming(layout.x, cfg);
      pillY.value = withTiming(layout.y, cfg);
      pillW.value = withTiming(layout.width, cfg);
      pillH.value = withTiming(layout.height, cfg);
    },
    [pillH, pillW, pillX, pillY]
  );

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pillX.value },
      { translateY: pillY.value },
    ],
    width: pillW.value,
    height: pillH.value,
  }));

  useEffect(() => {
    if (__DEV__ || isLiteProfileActive()) return;
    const id = setTimeout(() => {
      void import("./music");
      void import("./hymns");
      void import("./LiveComponent");
    }, 2500);
    return () => clearTimeout(id);
  }, []);

  const handleCategoryPress = useCallback(
    (category: string) => {
      if (category === selectedRef.current) return;
      selectedRef.current = category;
      setSelectedCategory(category);
      setMountedFeeds((prev) =>
        prev[category] ? prev : { ...prev, [category]: true }
      );
      movePillTo(category);

      const layout = buttonLayouts.current[category];
      if (layout && scrollViewRef.current) {
        const screenWidth = Dimensions.get("window").width;
        const parentPadding = getResponsiveSpacing(16, 20, 24, 32);
        const viewport = screenWidth - parentPadding * 2;
        scrollViewRef.current.scrollTo({
          x: Math.max(0, layout.x + layout.width / 2 - viewport / 2),
          animated: true,
        });
      }

      setTimeout(() => {
        try {
          router.setParams({
            defaultCategory: mapCategoryToContentType(category),
          });
        } catch {
          // not required for UI
        }
        try {
          useMediaStore.getState().stopAudioFn?.();
        } catch {
          // no-op
        }
        try {
          useGlobalVideoStore.getState().pauseAllVideos();
        } catch {
          // no-op
        }
      }, 80);
    },
    [movePillTo, router]
  );

  const renderPane = (category: string) => {
    if (!mountedFeeds[category]) return null;
    const active = selectedCategory === category;
    const isFeed = (FEED_CATEGORIES as readonly string[]).includes(category);

    return (
      <AnimatedFeedPane key={category} active={active}>
        {isFeed ? (
          <AllContentTikTok
            contentType={mapCategoryToContentType(category)}
            useAuthFeed={isAuthenticated}
            isFeedActive={active}
          />
        ) : null}
        {category === "MUSIC" ? (
          <CategorySuspense>
            <Music />
          </CategorySuspense>
        ) : null}
        {category === "HYMNS" ? (
          <CategorySuspense>
            <Hymns />
          </CategorySuspense>
        ) : null}
        {category === "LIVE" ? (
          <CategorySuspense>
            <LiveComponent />
          </CategorySuspense>
        ) : null}
      </AnimatedFeedPane>
    );
  };

  const chipRadius = getResponsiveBorderRadius("medium");

  return (
    <View style={{ flex: 1, width: "100%", backgroundColor: "#000" }}>
      <View
        pointerEvents={isCommentSheetOpen ? "none" : "auto"}
        accessibilityElementsHidden={isCommentSheetOpen}
        importantForAccessibility={
          isCommentSheetOpen ? "no-hide-descendants" : "auto"
        }
        style={isCommentSheetOpen ? { opacity: 0 } : undefined}
      >
        <Header />
      </View>

      <View
        pointerEvents={isCommentSheetOpen ? "none" : "auto"}
        collapsable={false}
        style={{
          zIndex: 20,
          elevation: 0,
          paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
          backgroundColor: "#FCFCFD",
          opacity: isCommentSheetOpen ? 0 : 1,
        }}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          directionalLockEnabled
          nestedScrollEnabled
          style={{
            marginTop: getResponsiveSpacing(20, 24, 28, 32),
          }}
          contentContainerStyle={{
            paddingVertical: getResponsiveSpacing(12, 16, 20, 24),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  zIndex: 0,
                  backgroundColor: "#000",
                  borderRadius: chipRadius,
                },
                pillStyle,
              ]}
            />
            {categories.map((category) => {
              const selected = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  activeOpacity={0.85}
                  delayPressIn={0}
                  onPressIn={() => handleCategoryPress(category)}
                  onPress={() => handleCategoryPress(category)}
                  hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                  onLayout={(event) => {
                    const { x, y, width, height } = event.nativeEvent.layout;
                    const prev = buttonLayouts.current[category];
                    buttonLayouts.current[category] = { x, y, width, height };
                    if (category !== selectedRef.current) return;
                    if (!prev) {
                      movePillTo(category, true);
                    }
                  }}
                  style={{
                    zIndex: 1,
                    marginHorizontal: getResponsiveSpacing(4, 6, 8, 10),
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                    borderRadius: chipRadius,
                    borderWidth: 1,
                    borderColor: selected ? "transparent" : "#6B6E7C",
                    backgroundColor: selected ? "transparent" : "#FFFFFF",
                    minWidth: 48,
                    minHeight: 44,
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
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View
        style={{
          flex: 1,
          zIndex: 0,
          overflow: "hidden",
          width: "100%",
          backgroundColor: isCommentSheetOpen ? "#000" : "#FCFCFD",
        }}
      >
        {categories.map((category) => renderPane(category))}
      </View>
    </View>
  );
}
