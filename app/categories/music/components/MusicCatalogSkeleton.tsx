/**
 * Loading stand-in that matches MusicScreen: discover cards + list rows
 * (circular art, title, artist line, overflow menu).
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { DISCOVER_CARD_HEIGHT } from "./DiscoverCardItem";

const BONE = "#E8EAED";
const PAGE = "#FFFFFF";

function Bone({
  width,
  height,
  borderRadius,
  pulse,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius: number;
  pulse: Animated.Value;
  style?: object;
}) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: BONE,
          opacity: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.7, 1],
          }),
        },
        style,
      ]}
    />
  );
}

function usePulse() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
}

function DiscoverShelfSkeleton({
  pulse,
  screenWidth,
}: {
  pulse: Animated.Value;
  screenWidth: number;
}) {
  const cardWidth = Math.round(screenWidth * 0.68);
  return (
    <View
      style={{
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 16,
        gap: 10,
      }}
    >
      <Bone
        width={cardWidth}
        height={DISCOVER_CARD_HEIGHT}
        borderRadius={18}
        pulse={pulse}
      />
      <Bone
        width={cardWidth * 0.45}
        height={DISCOVER_CARD_HEIGHT}
        borderRadius={18}
        pulse={pulse}
      />
    </View>
  );
}

function SongRowSkeleton({ pulse }: { pulse: Animated.Value }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: PAGE,
      }}
    >
      <Bone width={56} height={56} borderRadius={28} pulse={pulse} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Bone width="58%" height={14} borderRadius={4} pulse={pulse} />
        <Bone
          width="42%"
          height={12}
          borderRadius={4}
          pulse={pulse}
          style={{ marginTop: 8 }}
        />
      </View>
      <Bone width={36} height={36} borderRadius={18} pulse={pulse} />
    </View>
  );
}

export function MusicCatalogSkeleton({
  showDiscover = true,
  rows = 8,
  screenWidth = 360,
}: {
  showDiscover?: boolean;
  rows?: number;
  screenWidth?: number;
}) {
  const pulse = usePulse();
  return (
    <View style={{ flex: 1, backgroundColor: PAGE }}>
      {showDiscover ? (
        <DiscoverShelfSkeleton pulse={pulse} screenWidth={screenWidth} />
      ) : null}
      {Array.from({ length: rows }, (_, i) => (
        <SongRowSkeleton key={i} pulse={pulse} />
      ))}
    </View>
  );
}
