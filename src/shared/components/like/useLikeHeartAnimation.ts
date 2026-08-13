/**
 * Heart scale + burst progress (UI-thread via Reanimated).
 */
import { useCallback } from "react";
import {
  Easing,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { isLiteProfileActive } from "../../lite/liteProfile";
import {
  triggerHapticFeedback,
  triggerLikeHaptic,
} from "../../utils/haptics";
import { LIKE_BURST_MS_FULL, LIKE_BURST_MS_LITE } from "./constants";

export function useLikeHeartAnimation() {
  const scale = useSharedValue(1);
  const burst = useSharedValue(0);

  const playLike = useCallback(() => {
    const lite = isLiteProfileActive();
    const burstMs = lite ? LIKE_BURST_MS_LITE : LIKE_BURST_MS_FULL;

    scale.value = withSequence(
      withTiming(0.68, { duration: 70, easing: Easing.out(Easing.quad) }),
      withSpring(1.28, { damping: 7, stiffness: 480, mass: 0.55 }),
      withSpring(1, { damping: 12, stiffness: 280 })
    );
    burst.value = 0;
    burst.value = withTiming(1, {
      duration: burstMs,
      easing: Easing.out(Easing.cubic),
    });
    triggerLikeHaptic();
  }, [burst, scale]);

  const playUnlike = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.86, { duration: 80 }),
      withSpring(1, { damping: 14, stiffness: 260 })
    );
    triggerHapticFeedback("light");
  }, [scale]);

  return { scale, burst, playLike, playUnlike };
}
