import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { discoverCards } from "../constants/discoverCards";
import {
  DiscoverCardItem,
  DISCOVER_CARD_HEIGHT,
} from "./DiscoverCardItem";

const AUTO_MS = 3200;
const HIDE_AFTER_MS = 20000;
const COLLAPSE_MS = 420;
const CARD_GAP = 10;
const SIDE_PAD = 16;

type MusicDiscoverShelfProps = {
  screenWidth?: number;
};

/** Compact auto-swiper for Discover Weekly + Featured Playlists. Collapses after a while. */
export function MusicDiscoverShelf({
  screenWidth = Dimensions.get("window").width,
}: MusicDiscoverShelfProps) {
  const cardWidth = Math.round(screenWidth * 0.68);
  const pageSize = cardWidth + CARD_GAP;
  const expandedHeight = DISCOVER_CARD_HEIGHT + 28;
  const lastIndex = discoverCards.length - 1;

  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const draggingRef = useRef(false);
  const hiddenRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [gone, setGone] = useState(false);

  const height = useSharedValue(expandedHeight);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  const setIndex = useCallback((next: number) => {
    indexRef.current = next;
    setActiveIndex(next);
  }, []);

  const goTo = useCallback(
    (next: number, animated = true) => {
      setIndex(next);
      scrollRef.current?.scrollTo({
        x: next * pageSize,
        animated,
      });
    },
    [pageSize, setIndex]
  );

  const collapse = useCallback(() => {
    if (hiddenRef.current) return;
    hiddenRef.current = true;
    height.value = withTiming(0, {
      duration: COLLAPSE_MS,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    opacity.value = withTiming(0, { duration: 280 });
    translateY.value = withTiming(-12, {
      duration: COLLAPSE_MS,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    setTimeout(() => setGone(true), COLLAPSE_MS + 40);
  }, [height, opacity, translateY]);

  useEffect(() => {
    const auto = setInterval(() => {
      if (draggingRef.current || hiddenRef.current) return;
      const next = indexRef.current >= lastIndex ? 0 : indexRef.current + 1;
      goTo(next, true);
    }, AUTO_MS);

    const hideTimer = setTimeout(() => {
      collapse();
    }, HIDE_AFTER_MS);

    return () => {
      clearInterval(auto);
      clearTimeout(hideTimer);
    };
  }, [collapse, goTo, lastIndex]);

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x;
      const next = Math.min(
        lastIndex,
        Math.max(0, Math.round(x / pageSize))
      );
      setIndex(next);
      draggingRef.current = false;
    },
    [lastIndex, pageSize, setIndex]
  );

  const shelfStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    overflow: "hidden" as const,
    marginBottom: height.value > 1 ? 8 : 0,
  }));

  if (gone) return null;

  return (
    <Animated.View style={shelfStyle} pointerEvents="box-none">
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={pageSize}
        snapToAlignment="start"
        disableIntervalMomentum
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => {
          draggingRef.current = true;
        }}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        contentContainerStyle={{
          paddingLeft: SIDE_PAD,
          paddingRight: SIDE_PAD,
          paddingVertical: 8,
        }}
      >
        {discoverCards.map((card, i) => (
          <View
            key={card.id}
            style={{
              marginRight: i === lastIndex ? 0 : CARD_GAP,
            }}
          >
            <DiscoverCardItem item={card} width={cardWidth} />
          </View>
        ))}
      </ScrollView>
      <View
        pointerEvents="none"
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          marginBottom: 4,
        }}
      >
        {discoverCards.map((card, i) => (
          <View
            key={card.id}
            style={{
              width: i === activeIndex ? 14 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === activeIndex ? "#0A332D" : "#D1D5DB",
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}
