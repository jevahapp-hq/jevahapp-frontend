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
}

export const LikeBurst: React.FC<LikeBurstProps> = ({
  triggerKey,
  color = "#FF1744",
  size = 16,
  style,
  bubbles = 5,
  distance = 60,
  duration = 600,
}) => {
  const bubblesRef = useRef<Bubble[]>([]);

  // initialize bubbles exactly once
  if (bubblesRef.current.length === 0) {
    bubblesRef.current = new Array(bubbles).fill(0).map(() => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.6),
    }));
  }

  const sequences = useMemo(() => {
    return bubblesRef.current.map((b, i) => {
      const upward = -distance * (0.8 + Math.random() * 0.6);
      const horizontal = (Math.random() - 0.5) * 24; // left/right spread
      const t = duration * (0.8 + Math.random() * 0.5);
      return Animated.parallel([
        Animated.timing(b.translateY, {
          toValue: upward,
          duration: t,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(b.translateX, {
          toValue: horizontal,
          duration: t,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(b.opacity, {
          toValue: 1,
          duration: Math.min(180, t * 0.3),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(b.scale, {
            toValue: 1.2,
            duration: Math.min(200, t * 0.35),
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
          Animated.timing(b.scale, {
            toValue: 1,
            duration: Math.min(160, t * 0.25),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]);
    });
  }, [bubbles, distance, duration]);

  useEffect(() => {
    // reset
    bubblesRef.current.forEach((b) => {
      b.translateY.setValue(0);
      b.translateX.setValue(0);
      b.opacity.setValue(0);
      b.scale.setValue(0.6);
    });

    // slight stagger for each bubble
    const animations = sequences.map((anim, i) =>
      Animated.sequence([
        Animated.delay(i * 40),
        anim,
        Animated.timing(bubblesRef.current[i].opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(animations).start();
  }, [triggerKey, sequences]);

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
