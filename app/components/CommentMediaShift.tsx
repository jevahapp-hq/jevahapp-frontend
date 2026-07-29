/**
 * Lifts the app feed into the comment peek when the comment sheet opens,
 * so media visibly shifts up instead of sitting under an opaque overlay.
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
  MEDIA_SHIFT_Y,
} from "./commentSheetLayout";

export function CommentMediaShift({ children }: { children: ReactNode }) {
  const { isVisible } = useCommentModal();
  const shiftY = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      shiftY.value = withTiming(MEDIA_SHIFT_Y, COMMENT_SHEET_IN);
    } else {
      shiftY.value = withTiming(0, COMMENT_SHEET_OUT);
    }
  }, [isVisible, shiftY]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateY: shiftY.value }],
  }));

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
