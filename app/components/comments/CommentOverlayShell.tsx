/**
 * Shared same-window overlay chrome for comment action sheets.
 * Fade backdrop + slide-up card — keeps media playing (no RN Modal).
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  COMMENT_OVERLAY_IN,
  COMMENT_OVERLAY_OUT,
} from "../commentSheetLayout";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Card sits near bottom (action sheet) vs centered (confirm) */
  placement?: "bottom" | "center";
};

export function CommentOverlayShell({
  visible,
  onClose,
  children,
  placement = "bottom",
}: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(placement === "bottom" ? 56 : 28);
  const scale = useSharedValue(placement === "center" ? 0.94 : 1);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.value = withTiming(1, COMMENT_OVERLAY_IN);
      translateY.value = withTiming(0, COMMENT_OVERLAY_IN);
      scale.value = withTiming(1, COMMENT_OVERLAY_IN);
      return;
    }

    opacity.value = withTiming(0, COMMENT_OVERLAY_OUT);
    translateY.value = withTiming(
      placement === "bottom" ? 56 : 20,
      COMMENT_OVERLAY_OUT
    );
    scale.value = withTiming(
      placement === "center" ? 0.96 : 1,
      COMMENT_OVERLAY_OUT,
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      }
    );
  }, [visible, placement, opacity, translateY, scale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.48,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!mounted) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={visible ? onClose : undefined}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]} />
      </Pressable>
      <View
        style={[
          styles.wrap,
          placement === "center" ? styles.wrapCenter : styles.wrapBottom,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.card, cardStyle]}>{children}</Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 1200,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#000",
  },
  wrap: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 14,
  },
  wrapBottom: {
    justifyContent: "flex-end",
  },
  wrapCenter: {
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
});
