/**
 * FAB create sheet — Upload / Go Live with icons + spring press + sheet entrance.
 */
import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  getResponsiveBorderRadius,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";

type Props = {
  visible: boolean;
  bottomOffset: number;
  onUpload: () => void;
  onGoLive: () => void;
  /** Fire on chip press-in so JS chunks warm before navigation. */
  onUploadIntent?: () => void;
  onGoLiveIntent?: () => void;
};

function ActionChip({
  label,
  icon,
  backgroundColor,
  onPress,
  onPressInWarm,
  delay = 0,
  visible,
}: {
  label: string;
  icon: ReactNode;
  backgroundColor: string;
  onPress: () => void;
  onPressInWarm?: () => void;
  delay?: number;
  visible: boolean;
}) {
  const scale = useSharedValue(1);
  const enter = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      enter.value = 0;
      enter.value = withTiming(1, {
        duration: 180 + delay * 30,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      enter.value = withTiming(0, { duration: 100 });
    }
  }, [delay, enter, visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { scale: scale.value * (0.92 + 0.08 * enter.value) },
      { translateY: (1 - enter.value) * (10 + delay * 4) },
    ],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        unstable_pressDelay={0}
        onPressIn={() => {
          onPressInWarm?.();
          scale.value = withSpring(0.92, { damping: 14, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 280 });
        }}
        onPress={onPress}
        style={[styles.chip, { backgroundColor }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {icon}
        <Text style={[getResponsiveTextStyle("button"), styles.chipLabel]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function FabCreateActions({
  visible,
  bottomOffset,
  onUpload,
  onGoLive,
  onUploadIntent,
  onGoLiveIntent,
}: Props) {
  const sheet = useSharedValue(0);

  useEffect(() => {
    sheet.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 180 : 120,
      easing: Easing.out(Easing.cubic),
    });
  }, [sheet, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheet.value,
    transform: [
      { translateX: -140 },
      { translateY: (1 - sheet.value) * 16 },
      { scale: 0.96 + 0.04 * sheet.value },
    ],
  }));

  const gap = getResponsiveSpacing(12, 16, 20, 24);
  const content = (
    <>
      <ActionChip
        visible={visible}
        delay={0}
        label="Upload"
        backgroundColor="#256E63"
        onPress={onUpload}
        onPressInWarm={onUploadIntent}
        icon={<Feather name="upload-cloud" size={18} color="#FFFFFF" />}
      />
      <ActionChip
        visible={visible}
        delay={1}
        label="Go Live"
        backgroundColor="#111827"
        onPress={onGoLive}
        onPressInWarm={onGoLiveIntent}
        icon={<Ionicons name="radio-outline" size={18} color="#FFFFFF" />}
      />
    </>
  );

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.sheet, { bottom: bottomOffset }, sheetStyle]}
    >
      <View style={styles.sheetInner}>
        {Platform.OS !== "web" ? (
          <BlurView intensity={80} tint="light" style={[styles.blur, { gap }]}>
            {content}
          </BlurView>
        ) : (
          <View style={[styles.webRow, { gap }]}>{content}</View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: "50%",
    width: 280,
    zIndex: 1000,
    alignItems: "center",
  },
  sheetInner: {
    borderRadius: getResponsiveBorderRadius("large"),
    overflow: "hidden",
    width: "100%",
    minHeight: 72,
  },
  blur: {
    flexDirection: "row",
    width: "100%",
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 140, 0, 0.16)",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  webRow: {
    flexDirection: "row",
    width: "100%",
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: getResponsiveBorderRadius("large"),
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: getResponsiveSpacing(14, 16, 18, 20),
    paddingVertical: getResponsiveSpacing(8, 10, 11, 12),
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  chipLabel: {
    color: "#FFFFFF",
  },
});
