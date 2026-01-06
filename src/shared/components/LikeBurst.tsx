import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, ViewStyle } from "react-native";

type Bubble = {
  translateY: Animated.Value;
  translateX: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
};

export interface LikeBurstProps {
  triggerKey: number; // change value to retrigger
  color?: string;
  size?: number;
  style?: ViewStyle;
  bubbles?: number;
  distance?: number; // how far bubbles travel up
  duration?: number; // base duration per bubble
  enabled?: boolean; // if false, won't trigger even if triggerKey changes
}

export const LikeBurst: React.FC<LikeBurstProps> = ({
  triggerKey,
  color = "#FF1744",
  size = 16,
  style,
  bubbles = 8, // Increased from 5 for more visual impact
  distance = 80, // Increased from 60 for more dramatic effect
  duration = 800, // Increased from 600 for smoother animation
  enabled = true, // Only trigger if enabled
}) => {
  const bubblesRef = useRef<Bubble[]>([]);

  // initialize bubbles exactly once
  if (bubblesRef.current.length === 0) {
    bubblesRef.current = new Array(bubbles).fill(0).map(() => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.3), // Start smaller for more dramatic pop
    }));
  }

  const sequences = useMemo(() => {
    return bubblesRef.current.map((b, i) => {
      // More varied trajectories for natural feel
      const upward = -distance * (0.7 + Math.random() * 0.8);
      const horizontal = (Math.random() - 0.5) * 40; // Wider spread
      const t = duration * (0.7 + Math.random() * 0.6); // More variation in timing
      
      return Animated.parallel([
        // Smoother upward motion with better easing
        Animated.timing(b.translateY, {
          toValue: upward,
          duration: t,
          easing: Easing.out(Easing.cubic), // Smoother than quad
          useNativeDriver: true,
        }),
        // Horizontal drift with smoother easing
        Animated.timing(b.translateX, {
          toValue: horizontal,
          duration: t,
          easing: Easing.inOut(Easing.sin), // Sinusoidal for natural drift
          useNativeDriver: true,
        }),
        // Fade in faster, fade out slower for better visibility
        Animated.sequence([
          Animated.timing(b.opacity, {
            toValue: 1,
            duration: Math.min(150, t * 0.25), // Faster fade in
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(b.opacity, {
            toValue: 0.8,
            duration: t * 0.4, // Hold at high opacity
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(b.opacity, {
            toValue: 0,
            duration: t * 0.35, // Smooth fade out
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        // More dramatic scale animation with bounce
        Animated.sequence([
          Animated.timing(b.scale, {
            toValue: 1.4, // Bigger initial pop
            duration: Math.min(180, t * 0.3),
            easing: Easing.out(Easing.back(1.5)), // More bounce
            useNativeDriver: true,
          }),
          Animated.timing(b.scale, {
            toValue: 1.1, // Slight shrink
            duration: Math.min(120, t * 0.2),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(b.scale, {
            toValue: 0.8, // Fade out while shrinking
            duration: t * 0.5,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]);
    });
  }, [bubbles, distance, duration]);

  useEffect(() => {
    // ✅ Only trigger animation if enabled (prevents burst on unlikes)
    if (!enabled || triggerKey === 0) return;
    
    // reset
    bubblesRef.current.forEach((b) => {
      b.translateY.setValue(0);
      b.translateX.setValue(0);
      b.opacity.setValue(0);
      b.scale.setValue(0.3); // Start smaller for more dramatic pop
    });

    // Staggered launch for cascading effect (reduced delay for smoother flow)
    const animations = sequences.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * 25), // Reduced from 40ms for tighter cascade
        anim,
      ])
    );
    Animated.parallel(animations).start();
  }, [triggerKey, sequences, enabled]);

  return (
    <>
      {bubblesRef.current.map((b, i) => (
        <Animated.View
          key={`bubble-${i}`}
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              opacity: b.opacity,
              transform: [
                { translateY: b.translateY },
                { translateX: b.translateX },
                { scale: b.scale },
              ],
            },
            style,
          ]}
          pointerEvents="none"
        >
          <MaterialIcons name="favorite" size={size} color={color} />
        </Animated.View>
      ))}
    </>
  );
};

export default LikeBurst;
