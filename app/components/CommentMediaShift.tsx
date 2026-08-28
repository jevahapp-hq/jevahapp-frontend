/**
 * Lifts the watching video into the comment peek and clips everything else.
 * Peek height matches the player frame so likes / avatar stay under the sheet.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCommentModal } from "../context/CommentModalContext";
import { isCommentPeekHudVisible } from "../../src/shared/comments/commentPeekHud";
import {
  COMMENT_SHEET_IN,
  COMMENT_SHEET_OUT,
} from "./commentSheetLayout";

export function CommentMediaShift({ children }: { children: ReactNode }) {
  const { isVisible, isClosing, mediaShiftY, mediaScale } = useCommentModal();
  const shiftY = useSharedValue(0);
  const scale = useSharedValue(1);
  const wasPeekRef = useRef(false);

  const peeking = isCommentPeekHudVisible(isVisible, isClosing);

  useEffect(() => {
    if (peeking) {
      const opening = !wasPeekRef.current;
      wasPeekRef.current = true;
      if (opening) {
        shiftY.value = withTiming(mediaShiftY, COMMENT_SHEET_IN);
        scale.value = withTiming(mediaScale, COMMENT_SHEET_IN);
      } else {
        shiftY.value = mediaShiftY;
        scale.value = mediaScale;
      }
    } else {
      wasPeekRef.current = false;
      shiftY.value = withTiming(0, COMMENT_SHEET_OUT);
      scale.value = withTiming(1, COMMENT_SHEET_OUT);
    }
  }, [peeking, mediaShiftY, mediaScale, shiftY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateY: shiftY.value }, { scale: scale.value }],
  }));

  return (
    <View
      style={styles.clip}
      pointerEvents="auto"
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
