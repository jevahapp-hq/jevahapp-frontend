/**
 * Feed skeleton — light gray bones, whisper shimmer, short stagger.
 * Close to the white feed so it reads as layout, not a loading screen.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";

const PAGE_BG = UI_CONFIG.COLORS.BACKGROUND || "#FCFCFD";
const MEDIA_BG = "#F3F4F6";
const BONE = "#E8EAED";

type FeedMediaCardSkeletonProps = {
  delay?: number;
  instant?: boolean;
};

function Bone({
  width,
  height,
  borderRadius = 6,
  style,
  pulse,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
  pulse: Animated.Value;
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
            outputRange: [0.72, 1],
          }),
        },
        style,
      ]}
    />
  );
}

export function FeedMediaCardSkeleton({
  delay = 0,
  instant = false,
}: FeedMediaCardSkeletonProps) {
  const enter = useRef(new Animated.Value(instant ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = instant
      ? null
      : Animated.sequence([
          Animated.delay(delay),
          Animated.timing(enter, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]);

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.linear),
        useNativeDriver: true,
      })
    );

    entrance?.start();
    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      entrance?.stop();
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [delay, enter, pulse, shimmer, instant]);

  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-70, 380],
  });

  return (
    <Animated.View
      style={{
        marginBottom: 16,
        backgroundColor: PAGE_BG,
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [6, 0],
            }),
          },
        ],
      }}
    >
      <View
        style={{
          width: "100%",
          height: 400,
          backgroundColor: MEDIA_BG,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 72,
            backgroundColor: "rgba(255,255,255,0.22)",
            transform: [{ translateX: shimmerX }, { skewX: "-16deg" }],
          }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 10,
          paddingHorizontal: 12,
          backgroundColor: PAGE_BG,
        }}
      >
        <Bone width={36} height={36} borderRadius={18} pulse={pulse} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Bone width={128} height={11} borderRadius={4} pulse={pulse} />
          <Bone
            width={72}
            height={8}
            borderRadius={4}
            pulse={pulse}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>
    </Animated.View>
  );
}

export function FeedSkeletonStack({ count = 2 }: { count?: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG, paddingTop: 4 }}>
      {Array.from({ length: count }, (_, i) => (
        <FeedMediaCardSkeleton key={i} delay={i * 70} />
      ))}
    </View>
  );
}

function useBonePulse() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
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

/** Compact song/hymn/library row — not a video card. */
export function ListRowSkeleton() {
  const pulse = useBonePulse();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <Bone width={52} height={52} borderRadius={8} pulse={pulse} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Bone width="62%" height={12} borderRadius={4} pulse={pulse} />
        <Bone
          width="38%"
          height={9}
          borderRadius={4}
          pulse={pulse}
          style={{ marginTop: 8 }}
        />
      </View>
    </View>
  );
}

export function ListSkeletonStack({ rows = 8 }: { rows?: number }) {
  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG, paddingTop: 8 }}>
      {Array.from({ length: rows }, (_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </View>
  );
}

export default FeedMediaCardSkeleton;
