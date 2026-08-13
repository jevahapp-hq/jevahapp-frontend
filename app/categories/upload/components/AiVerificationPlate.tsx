/**
 * Jevah AI Protected — hidden until form is complete, then reveal + typewriter.
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { getResponsiveFontSize } from "../../../../utils/responsive";
import { useReduceMotion } from "../hooks/useReduceMotion";

const TITLE = "Jevah AI Protected";
const SUB =
  "Safe community verification active. Ensure you own the rights to this media.";

type Props = {
  ready: boolean;
};

export function AiVerificationPlate({ ready }: Props) {
  const reveal = useSharedValue(0);
  const check = useSharedValue(0);
  const [titleTyped, setTitleTyped] = useState("");
  const [subTyped, setSubTyped] = useState("");
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReduceMotion();
  const timersRef = useRef<{
    title?: ReturnType<typeof setInterval>;
    sub?: ReturnType<typeof setInterval>;
  }>({});

  const clearTypeTimers = () => {
    if (timersRef.current.title) clearInterval(timersRef.current.title);
    if (timersRef.current.sub) clearInterval(timersRef.current.sub);
    timersRef.current = {};
  };

  const hideFully = () => {
    setMounted(false);
    setTitleTyped("");
    setSubTyped("");
  };

  useEffect(() => {
    if (!ready) {
      clearTypeTimers();
      check.value = withTiming(0, { duration: reduceMotion ? 0 : 120 });
      reveal.value = withTiming(
        0,
        { duration: reduceMotion ? 0 : 180 },
        (finished) => {
          if (finished) runOnJS(hideFully)();
        }
      );
      return () => clearTypeTimers();
    }

    setMounted(true);

    if (reduceMotion) {
      reveal.value = 1;
      check.value = 1;
      setTitleTyped(TITLE);
      setSubTyped(SUB);
      return;
    }

    reveal.value = withTiming(1, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
    check.value = withDelay(
      120,
      withSequence(
        withSpring(1.2, { damping: 8, stiffness: 320 }),
        withSpring(1, { damping: 12, stiffness: 240 })
      )
    );

    clearTypeTimers();
    let titleIdx = 0;
    let subIdx = 0;
    setTitleTyped("");
    setSubTyped("");

    timersRef.current.title = setInterval(() => {
      titleIdx += 1;
      setTitleTyped(TITLE.slice(0, titleIdx));
      if (titleIdx >= TITLE.length) {
        if (timersRef.current.title) clearInterval(timersRef.current.title);
        timersRef.current.title = undefined;
        timersRef.current.sub = setInterval(() => {
          subIdx += 1;
          setSubTyped(SUB.slice(0, subIdx));
          if (subIdx >= SUB.length) {
            if (timersRef.current.sub) clearInterval(timersRef.current.sub);
            timersRef.current.sub = undefined;
          }
        }, 16);
      }
    }, 28);

    return () => clearTypeTimers();
  }, [check, ready, reduceMotion, reveal]);

  const plateStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: (1 - reveal.value) * 14 },
      { scale: 0.96 + 0.04 * reveal.value },
    ],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.max(check.value, 0.01) }],
    opacity: Math.min(1, check.value),
  }));

  if (!mounted) return null;

  return (
    <Animated.View
      style={[styles.plate, plateStyle, { pointerEvents: ready ? "auto" : "none" }]}
      accessibilityLabel={`${TITLE}. ${SUB}`}
    >
      <View style={styles.iconBox}>
        <Animated.View style={checkStyle}>
          <Ionicons name="shield-checkmark" size={24} color="#10b981" />
        </Animated.View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {titleTyped}
          {!reduceMotion && titleTyped.length < TITLE.length && ready ? (
            <Text style={styles.caret}>|</Text>
          ) : null}
        </Text>
        <Text style={styles.sub}>
          {subTyped}
          {!reduceMotion &&
          titleTyped.length >= TITLE.length &&
          subTyped.length < SUB.length &&
          ready ? (
            <Text style={styles.caret}>|</Text>
          ) : null}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.015)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    width: "100%",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: "#1f2937",
    fontFamily: "Rubik-SemiBold",
    fontSize: getResponsiveFontSize(13, 14, 15),
    marginBottom: 1,
    minHeight: 18,
  },
  sub: {
    color: "#6b7280",
    fontFamily: "Rubik-Regular",
    fontSize: getResponsiveFontSize(11, 12, 13),
    lineHeight: 16,
    minHeight: 32,
  },
  caret: {
    color: "#10b981",
    fontFamily: "Rubik-SemiBold",
  },
});
