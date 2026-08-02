/**
 * Lifts + optionally scales the app feed into the comment peek when the
 * comment sheet opens, so the media bottom meets the sheet top (TikTok/IG).
 */
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCommentModal } from "../context/CommentModalContext";
import {
  COMMENT_SHEET_IN,
  COMMENT_SHEET_OUT,
} from "./commentSheetLayout";

export function CommentMediaShift({ children }: { children: ReactNode }) {
  const { isVisible, mediaShiftY, mediaScale, mediaPeekHeight } =
    useCommentModal();
  const shiftY = useSharedValue(0);
  const scale = useSharedValue(1);
  const peek = useSharedValue(mediaPeekHeight);

  useEffect(() => {
    peek.value = mediaPeekHeight;
  }, [mediaPeekHeight, peek]);

  useEffect(() => {
    if (isVisible) {
      shiftY.value = withTiming(mediaShiftY, COMMENT_SHEET_IN);
      scale.value = withTiming(mediaScale, COMMENT_SHEET_IN);
    } else {
      shiftY.value = withTiming(0, COMMENT_SHEET_OUT);
      scale.value = withTiming(1, COMMENT_SHEET_OUT);
    }
  }, [isVisible, mediaShiftY, mediaScale, shiftY, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    // Scale about the sheet/peek seam so the docked media bottom stays flush
    const p = peek.value;
    return {
      flex: 1,
      transform: [
        { translateY: shiftY.value },
        { translateY: p },
        { scale: scale.value },
        { translateY: -p },
      ],
    };
  });

  return (
    <View
      style={styles.clip}
      // While comments are open, don't let the feed steal taps (peek = dismiss)
      pointerEvents={isVisible ? "none" : "auto"}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#000",
  },
});
