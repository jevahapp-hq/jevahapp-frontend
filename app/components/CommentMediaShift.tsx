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
  const { isVisible, isClosing, mediaShiftY, mediaScale, showPeekHud } = useCommentModal();
  const shiftY = useSharedValue(0);
  const scale = useSharedValue(1);
  const wasPeekRef = useRef(false);

  const peeking = isCommentPeekHudVisible(isVisible, isClosing, showPeekHud);

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
    transform: [{ translateY: shiftY.value }, { scale: scale.value }],
  }));

  // Always keep the same native child. Swapping View ↔ Animated.View on
  // comment dismiss remounted Home / Reels and jumped away from the video
  // the user had just opened comments on. `styles.fill` keeps flex even if
  // Reanimated's transform style is empty.
  return (
    <View style={styles.clip} pointerEvents="auto" collapsable={false}>
      <Animated.View
        style={[styles.fill, animatedStyle]}
        collapsable={false}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  fill: {
    flex: 1,
  },
});
