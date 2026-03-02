import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export interface LikeBurstProps {
  triggerKey: number;
  color?: string;
  size?: number;
  bubbles?: number;
  distance?: number;
  duration?: number;
  enabled?: boolean;
}

const HeartParticle = ({ delay, distance, color, size }: { delay: number; distance: number; color: string; size: number }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const upward = -distance * (0.8 + Math.random() * 0.7);
    const horizontal = (Math.random() - 0.5) * 60;
    const rotation = (Math.random() - 0.5) * 45;

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0.8, { duration: 400 }),
        withTiming(0, { duration: 300 })
      )
    );

    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.4, { damping: 4, stiffness: 100 }),
        withSpring(1, { damping: 8, stiffness: 80 }),
        withTiming(0.5, { duration: 400 })
      )
    );

    translateY.value = withDelay(
      delay,
      withTiming(upward, {
        duration: 850,
        easing: Easing.out(Easing.back(1)),
      })
    );

    translateX.value = withDelay(
      delay,
      withSpring(horizontal, { damping: 12, stiffness: 60 })
    );

    rotate.value = withDelay(
      delay,
      withTiming(rotation, { duration: 800 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      <Ionicons name="heart" size={size} color={color} />
    </Animated.View>
  );
};

export const LikeBurst: React.FC<LikeBurstProps> = ({
  triggerKey,
  color = "#FF1744",
  size = 20,
  bubbles = 10,
  distance = 100,
  enabled = true,
}) => {
  if (!enabled || triggerKey === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: bubbles }).map((_, i) => (
        <HeartParticle
          key={`${triggerKey}-${i}`}
          delay={i * 30}
          distance={distance}
          color={color}
          size={size * (0.6 + Math.random() * 0.6)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});

export default LikeBurst;
