/**
 * Heart particle burst — single implementation for feed + Reels.
 * Deterministic layout; Lite uses fewer particles; unmounts after animation.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { isLiteProfileActive } from "../../lite/liteProfile";
import {
  LIKE_BURST_MS_FULL,
  LIKE_BURST_MS_LITE,
  LIKE_COLOR,
  LIKE_PARTICLES_FULL,
  LIKE_PARTICLES_LITE,
  type LikeParticleSpec,
} from "./constants";

export type LikeBurstProps = {
  /** 0→1 progress from useLikeHeartAnimation (preferred). */
  progress?: SharedValue<number>;
  /** Legacy remount trigger when no SharedValue is available. */
  triggerKey?: number;
  color?: string;
  size?: number;
  enabled?: boolean;
};

function Particle({
  progress,
  spec,
  color,
  size,
}: {
  progress: SharedValue<number>;
  spec: LikeParticleSpec;
  color: string;
  size: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: interpolate(t, [0, 0.1, 0.65, 1], [0, 1, 0.65, 0]),
      transform: [
        { translateX: spec.dx * t },
        { translateY: spec.dy * t },
        {
          scale:
            spec.s * interpolate(t, [0, 0.22, 1], [0.15, 1.12, 0.35]),
        },
        { rotate: `${spec.r * t}deg` },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.particle, style]}>
      <Ionicons name="heart" size={size} color={color} />
    </Animated.View>
  );
}

function BurstLayer({
  progress,
  color,
  size,
  particles,
}: {
  progress: SharedValue<number>;
  color: string;
  size: number;
  particles: LikeParticleSpec[];
}) {
  return (
    <View style={styles.fill} pointerEvents="none">
      {particles.map((spec, i) => (
        <Particle
          key={i}
          progress={progress}
          spec={spec}
          color={color}
          size={Math.round(size * (0.85 + (i % 3) * 0.08))}
        />
      ))}
    </View>
  );
}

function TriggerKeyBurst({
  triggerKey,
  color,
  size,
  particles,
}: {
  triggerKey: number;
  color: string;
  size: number;
  particles: LikeParticleSpec[];
}) {
  const progress = useSharedValue(0);
  const [alive, setAlive] = useState(true);
  const ms = isLiteProfileActive() ? LIKE_BURST_MS_LITE : LIKE_BURST_MS_FULL;

  useEffect(() => {
    setAlive(true);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: ms,
      easing: Easing.out(Easing.cubic),
    });
    const t = setTimeout(() => setAlive(false), ms + 40);
    return () => clearTimeout(t);
  }, [ms, progress, triggerKey]);

  if (!alive) return null;
  return (
    <BurstLayer
      progress={progress}
      color={color}
      size={size}
      particles={particles}
    />
  );
}

export function LikeBurst({
  progress,
  triggerKey = 0,
  color = LIKE_COLOR,
  size = 12,
  enabled = true,
}: LikeBurstProps) {
  const particles = useMemo(
    () =>
      isLiteProfileActive() ? LIKE_PARTICLES_LITE : LIKE_PARTICLES_FULL,
    []
  );

  const [progressVisible, setProgressVisible] = useState(false);

  useAnimatedReaction(
    () => progress?.value ?? 0,
    (current, prev) => {
      if (!progress) return;
      if (current > 0.02 && (prev ?? 0) <= 0.02) {
        runOnJS(setProgressVisible)(true);
      }
      if (current >= 0.98 && (prev ?? 0) < 0.98) {
        runOnJS(setProgressVisible)(false);
      }
    },
    [progress]
  );

  if (!enabled) return null;

  if (progress) {
    if (!progressVisible) return null;
    return (
      <BurstLayer
        progress={progress}
        color={color}
        size={size}
        particles={particles}
      />
    );
  }

  if (triggerKey === 0) return null;

  return (
    <TriggerKeyBurst
      key={triggerKey}
      triggerKey={triggerKey}
      color={color}
      size={size}
      particles={particles}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  particle: {
    position: "absolute",
  },
});

export default LikeBurst;
