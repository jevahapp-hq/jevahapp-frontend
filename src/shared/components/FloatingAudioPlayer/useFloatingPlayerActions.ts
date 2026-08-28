import { useCallback, useEffect, useMemo, useRef } from "react";
import { Dimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const DISMISS_DISTANCE = 56;
const DISMISS_VELOCITY = 450;
const EXPAND_DISTANCE = 24;
const EXPAND_VELOCITY = 350;

type Params = {
  clear: () => void;
  trackId?: string;
  onExpand?: () => void;
};

/**
 * Surface of the Now Playing bar: tap / chevron → expand, drag down → dismiss,
 * drag up → expand. Pan lives on the artwork + title only so play / next / close
 * keep their own taps.
 */
export function useFloatingPlayerActions({
  clear,
  trackId,
  onExpand,
}: Params) {
  const handleCloseMini = useCallback(() => {
    clear();
  }, [clear]);

  const dragY = useSharedValue(0);
  const onExpandRef = useRef(onExpand);
  onExpandRef.current = onExpand;
  const clearRef = useRef(clear);
  clearRef.current = clear;

  const fireExpand = useCallback(() => {
    onExpandRef.current?.();
  }, []);
  const fireClear = useCallback(() => {
    clearRef.current();
  }, []);

  useEffect(() => {
    dragY.value = 0;
  }, [dragY, trackId]);

  const makePan = useCallback(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .failOffsetX([-28, 28])
        .onUpdate((event) => {
          dragY.value =
            event.translationY < 0
              ? Math.max(event.translationY * 0.4, -32)
              : event.translationY;
        })
        .onEnd((event) => {
          const dismissed =
            event.translationY > DISMISS_DISTANCE ||
            event.velocityY > DISMISS_VELOCITY;
          if (dismissed) {
            dragY.value = SCREEN_HEIGHT;
            runOnJS(fireClear)();
            return;
          }

          const expand =
            event.translationY < -EXPAND_DISTANCE ||
            event.velocityY < -EXPAND_VELOCITY;
          if (expand) {
            runOnJS(fireExpand)();
          }

          dragY.value = withSpring(0, { damping: 18, stiffness: 260 });
        }),
    [dragY, fireClear, fireExpand]
  );

  const { handlePan, surfaceGesture } = useMemo(() => {
    const handlePan = makePan();
    const surfacePan = makePan();
    const tap = Gesture.Tap().onEnd(() => {
      runOnJS(fireExpand)();
    });
    return {
      handlePan,
      surfaceGesture: Gesture.Exclusive(surfacePan, tap),
    };
  }, [fireExpand, makePan]);

  return {
    handleCloseMini,
    dragY,
    handlePan,
    surfaceGesture,
  };
}
