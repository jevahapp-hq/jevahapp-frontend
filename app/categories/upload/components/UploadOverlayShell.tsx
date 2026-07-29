/**
 * Same-window overlay chrome for upload result sheets.
 * Fade + scale — mirrors comment delete/sort overlays.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const IN = { duration: 220, easing: Easing.bezier(0.22, 1, 0.36, 1) };
const OUT = { duration: 160, easing: Easing.bezier(0.4, 0, 1, 1) };

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function UploadOverlayShell({ visible, onClose, children }: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(28);
  const scale = useSharedValue(0.94);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.value = withTiming(1, IN);
      translateY.value = withTiming(0, IN);
      scale.value = withTiming(1, IN);
      return;
    }
    opacity.value = withTiming(0, OUT);
    translateY.value = withTiming(20, OUT);
    scale.value = withTiming(0.96, OUT, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [visible, opacity, translateY, scale]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.48,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
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
        style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]}
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
    zIndex: 1300,
    elevation: 1300,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#000",
  },
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
});
