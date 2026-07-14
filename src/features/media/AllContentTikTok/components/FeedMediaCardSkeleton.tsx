/**
 * FeedMediaCardSkeleton — faint gray card placeholder with soft pulse/shimmer.
 * Kept light so load feels calm and blended with the white feed.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";

const PAGE_BG = UI_CONFIG.COLORS.BACKGROUND || "#FFFFFF";
/** Very faint cool gray — readable as placeholder, not harsh */
const MEDIA_BG = "#F0F1F3";
const BONE = "#E4E6EA";
const BONE_SOFT = "#ECEEF1";

type FeedMediaCardSkeletonProps = {
  /** Stagger entrance (ms) so cards cascade in */
  delay?: number;
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
            outputRange: [0.55, 1],
          }),
        },
        style,
      ]}
    />
  );
}

export function FeedMediaCardSkeleton({ delay = 0 }: FeedMediaCardSkeletonProps) {
  const enter = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(enter, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.linear),
        useNativeDriver: true,
      })
    );

    entrance.start();
    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      entrance.stop();
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [delay, enter, pulse, shimmer]);

  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 320],
  });

  return (
    <Animated.View
      style={{
        marginBottom: 20,
        backgroundColor: PAGE_BG,
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      {/* Media plane — faint gray, not black */}
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
            width: 90,
            backgroundColor: "rgba(255,255,255,0.55)",
            transform: [{ translateX: shimmerX }, { skewX: "-18deg" }],
          }}
        />

        <View style={{ position: "absolute", top: 12, left: 12, zIndex: 2 }}>
          <Bone width={64} height={24} borderRadius={6} pulse={pulse} />
        </View>
        <View style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}>
          <Bone width={36} height={30} borderRadius={6} pulse={pulse} />
        </View>

        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
          pointerEvents="none"
        >
          <Bone width={56} height={56} borderRadius={28} pulse={pulse} />
        </View>

        <View
          style={{
            position: "absolute",
            bottom: 64,
            left: 12,
            right: 48,
            zIndex: 2,
          }}
        >
          <Bone width="68%" height={14} borderRadius={4} pulse={pulse} />
        </View>

        <View
          style={{
            position: "absolute",
            bottom: 24,
            left: 12,
            right: 48,
            zIndex: 2,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Bone width={32} height={10} borderRadius={4} pulse={pulse} />
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Bone width="100%" height={4} borderRadius={2} pulse={pulse} />
          </View>
          <Bone width={32} height={10} borderRadius={4} pulse={pulse} />
        </View>
        <View style={{ position: "absolute", bottom: 18, right: 12, zIndex: 2 }}>
          <Bone width={28} height={28} borderRadius={14} pulse={pulse} />
        </View>
      </View>

      {/* Footer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          paddingHorizontal: 8,
          backgroundColor: PAGE_BG,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Bone width={40} height={40} borderRadius={20} pulse={pulse} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Bone width={110} height={14} borderRadius={4} pulse={pulse} />
              <Bone
                width={48}
                height={10}
                borderRadius={4}
                pulse={pulse}
                style={{ marginLeft: 8 }}
              />
            </View>
            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Bone width={22} height={22} borderRadius={11} pulse={pulse} />
              <Bone width={22} height={22} borderRadius={11} pulse={pulse} />
              <Bone width={22} height={22} borderRadius={11} pulse={pulse} />
              <Bone width={22} height={22} borderRadius={11} pulse={pulse} />
            </View>
          </View>
        </View>
        <Bone width={24} height={24} borderRadius={4} pulse={pulse} />
      </View>

      {/* Soft separator tint */}
      <View
        style={{
          height: 1,
          marginTop: 12,
          backgroundColor: BONE_SOFT,
          opacity: 0.7,
        }}
      />
    </Animated.View>
  );
}

export default FeedMediaCardSkeleton;
