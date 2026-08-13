/**
 * Animated field help under the ? button.
 */
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { getResponsiveFontSize } from "../../../../utils/responsive";
import { useReduceMotion } from "../hooks/useReduceMotion";

type Props = {
  visible: boolean;
  text: string;
};

export function FieldHelpTip({ visible, text }: Props) {
  const progress = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: reduceMotion ? 0 : visible ? 260 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reduceMotion, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    maxHeight: 4 + progress.value * 72,
    marginBottom: progress.value * 8,
    transform: [{ translateY: (1 - progress.value) * -6 }],
  }));

  return (
    <Animated.View
      style={[style, { pointerEvents: visible ? "auto" : "none" }]}
      accessibilityElementsHidden={!visible}
    >
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: getResponsiveFontSize(11, 12, 13),
    color: "#64748B",
    fontFamily: "Rubik-Regular",
    lineHeight: 17,
  },
});
