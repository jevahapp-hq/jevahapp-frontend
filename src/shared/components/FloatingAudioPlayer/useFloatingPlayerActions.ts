import { useCallback, useEffect, useMemo, useRef } from "react";
import { useWindowDimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getMiniPlayerBottomOffset,
  getMiniPlayerFloorOffset,
  MINI_PLAYER_SIDE_MARGIN,
} from "../../layout/bottomChromeLayout";
import {
  clampMiniPlayerTranslation,
  getMiniPlayerTranslationBounds,
  type MiniPlayerDragBounds,
} from "../../layout/miniPlayerDragBounds";
import { MINI_PLAYER_HEIGHT } from "./floatingMiniBarStyles";

const SPRING = { damping: 22, stiffness: 280 };
const DRAG_ACTIVATE = 8;

type Params = {
  clear: () => void;
  onExpand?: () => void;
};

/**
 * Free-drag the Now Playing bar anywhere except into the bottom nav / FAB.
 * Tap artwork or the grabber to expand. Play / next / close keep their own taps.
 */
export function useFloatingPlayerActions({ clear, onExpand }: Params) {
  const handleCloseMini = useCallback(() => {
    clear();
  }, [clear]);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { top: topInset } = useSafeAreaInsets();

  const defaultBottom = getMiniPlayerBottomOffset();
  const minBottom = getMiniPlayerFloorOffset();
  const barWidth = Math.max(0, screenWidth - MINI_PLAYER_SIDE_MARGIN * 2);

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const bounds = useSharedValue<MiniPlayerDragBounds>(
    getMiniPlayerTranslationBounds({
      screenWidth,
      screenHeight,
      barWidth,
      barHeight: MINI_PLAYER_HEIGHT,
      defaultLeft: MINI_PLAYER_SIDE_MARGIN,
      defaultBottom,
      minBottom,
      topInset,
      sideMargin: MINI_PLAYER_SIDE_MARGIN,
    })
  );

  useEffect(() => {
    const next = getMiniPlayerTranslationBounds({
      screenWidth,
      screenHeight,
      barWidth,
      barHeight: MINI_PLAYER_HEIGHT,
      defaultLeft: MINI_PLAYER_SIDE_MARGIN,
      defaultBottom,
      minBottom,
      topInset,
      sideMargin: MINI_PLAYER_SIDE_MARGIN,
    });
    bounds.value = next;
    const clamped = clampMiniPlayerTranslation(
      offsetX.value,
      offsetY.value,
      next
    );
    offsetX.value = clamped.x;
    offsetY.value = clamped.y;
  }, [
    barWidth,
    bounds,
    defaultBottom,
    minBottom,
    offsetX,
    offsetY,
    screenHeight,
    screenWidth,
    topInset,
  ]);

  const onExpandRef = useRef(onExpand);
  onExpandRef.current = onExpand;

  const fireExpand = useCallback(() => {
    onExpandRef.current?.();
  }, []);

  const makePan = useCallback(
    () =>
      Gesture.Pan()
        .minDistance(DRAG_ACTIVATE)
        .onStart(() => {
          startX.value = offsetX.value;
          startY.value = offsetY.value;
        })
        .onUpdate((event) => {
          const next = clampMiniPlayerTranslation(
            startX.value + event.translationX,
            startY.value + event.translationY,
            bounds.value
          );
          offsetX.value = next.x;
          offsetY.value = next.y;
        })
        .onEnd(() => {
          const next = clampMiniPlayerTranslation(
            offsetX.value,
            offsetY.value,
            bounds.value
          );
          offsetX.value = withSpring(next.x, SPRING);
          offsetY.value = withSpring(next.y, SPRING);
        }),
    [bounds, offsetX, offsetY, startX, startY]
  );

  const { handleGesture, surfaceGesture } = useMemo(() => {
    const handlePan = makePan();
    const surfacePan = makePan();
    const handleTap = Gesture.Tap().onEnd((_event, success) => {
      if (success) runOnJS(fireExpand)();
    });
    const surfaceTap = Gesture.Tap().onEnd((_event, success) => {
      if (success) runOnJS(fireExpand)();
    });
    return {
      handleGesture: Gesture.Exclusive(handlePan, handleTap),
      surfaceGesture: Gesture.Exclusive(surfacePan, surfaceTap),
    };
  }, [fireExpand, makePan]);

  return {
    handleCloseMini,
    dragX: offsetX,
    dragY: offsetY,
    handlePan: handleGesture,
    surfaceGesture,
  };
}
