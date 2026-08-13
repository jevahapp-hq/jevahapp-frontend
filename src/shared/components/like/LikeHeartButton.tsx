/**
 * Instagram / TikTok like heart — punch + ring + shared LikeBurst.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { formatCount } from "../../utils/formatCount";
import { LIKE_COLOR, LIKE_IDLE_COLOR } from "./constants";
import { LikeBurst } from "./LikeBurst";
import { useLikeHeartAnimation } from "./useLikeHeartAnimation";

export type LikeHeartButtonProps = {
  liked: boolean;
  likeCount?: number;
  onPress: () => void;
  size?: number;
  likedColor?: string;
  idleColor?: string;
  countColor?: string;
  layout?: "horizontal" | "vertical";
  showCount?: boolean;
  /** Drop outer margin — used inside CardFooterActions grid */
  compact?: boolean;
};

export function LikeHeartButton({
  liked,
  likeCount = 0,
  onPress,
  size = 28,
  likedColor = LIKE_COLOR,
  idleColor = LIKE_IDLE_COLOR,
  countColor,
  layout = "horizontal",
  showCount = true,
  compact = false,
}: LikeHeartButtonProps) {
  const { scale, burst, playLike, playUnlike } = useLikeHeartAnimation();

  const handlePress = useCallback(() => {
    if (liked) playUnlike();
    else playLike();
    onPress();
  }, [liked, onPress, playLike, playUnlike]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.15, 1], [0, 0.55, 0]),
    transform: [{ scale: interpolate(burst.value, [0, 1], [0.45, 2.15]) }],
  }));

  const color = liked ? likedColor : idleColor;
  const labelColor =
    countColor ?? (layout === "vertical" ? "#FFFFFF" : idleColor);
  const isVertical = layout === "vertical";

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={[
        styles.press,
        isVertical ? styles.col : styles.row,
        compact && styles.compact,
      ]}
      accessibilityRole="button"
      accessibilityLabel={liked ? "Unlike" : "Like"}
    >
      <View style={[styles.heartBox, { width: size + 8, height: size + 8 }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: size + 6,
              height: size + 6,
              borderRadius: (size + 6) / 2,
              borderColor: likedColor,
            },
            ringStyle,
          ]}
        />
        <LikeBurst progress={burst} color={likedColor} size={Math.round(size * 0.42)} />
        <Animated.View style={heartStyle}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={size}
            color={color}
          />
        </Animated.View>
      </View>
      {showCount && likeCount > 0 ? (
        <Text
          style={[
            styles.count,
            isVertical ? styles.countBelow : styles.countBeside,
            { color: labelColor },
            isVertical ? styles.countShadow : null,
          ]}
          pointerEvents="none"
        >
          {formatCount(likeCount)}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    marginRight: 12,
  },
  compact: {
    marginRight: 0,
  },
  col: {
    flexDirection: "column",
  },
  heartBox: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
  },
  count: {
    fontSize: 10,
    fontFamily: "Rubik-SemiBold",
  },
  countBeside: {
    marginLeft: 4,
  },
  countBelow: {
    marginTop: 2,
  },
  countShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default LikeHeartButton;
