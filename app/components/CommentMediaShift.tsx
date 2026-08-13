/**
 * Lifts the app feed into the comment peek when the sheet opens so the
 * watching video fills the top band (pause / seek stay usable).
 */
import { useEffect, useRef, type ReactNode } from "react";
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
  const { isVisible, mediaShiftY, mediaScale } = useCommentModal();
  const shiftY = useSharedValue(0);
  const scale = useSharedValue(1);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (isVisible) {
      const opening = !wasVisibleRef.current;
      wasVisibleRef.current = true;
      if (opening) {
        shiftY.value = withTiming(mediaShiftY, COMMENT_SHEET_IN);
        scale.value = withTiming(mediaScale, COMMENT_SHEET_IN);
      } else {
        shiftY.value = mediaShiftY;
        scale.value = mediaScale;
      }
    } else {
      wasVisibleRef.current = false;
      shiftY.value = withTiming(0, COMMENT_SHEET_OUT);
      scale.value = withTiming(1, COMMENT_SHEET_OUT);
    }
  }, [isVisible, mediaShiftY, mediaScale, shiftY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    // Top-align only — no scale-about-seam (that emptied the peek to black)
    transform: [
      { translateY: shiftY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.clip} pointerEvents="auto">
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
