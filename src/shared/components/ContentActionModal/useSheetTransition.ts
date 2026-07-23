import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import {
  HandlerStateChangeEvent,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const OPEN_SPRING = {
  damping: 20,
  stiffness: 100,
  mass: 1,
  overshootClamping: true,
};

const CLOSE_DURATION = 240;

/**
 * Drives the bottom-sheet open/close transition and swipe-to-dismiss gesture.
 * Unmount is scheduled with a JS timer rather than a Reanimated animation
 * callback so closing works even if worklet callbacks fail to fire.
 */
export function useSheetTransition(isVisible: boolean, onClose: () => void) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  const [internalVisible, setInternalVisible] = useState(isVisible);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const startCloseAnimation = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: CLOSE_DURATION });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: CLOSE_DURATION });
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setInternalVisible(false);
    }, CLOSE_DURATION + 30);
  }, [backdropOpacity, translateY, clearCloseTimer]);

  useEffect(() => {
    if (isVisible) {
      clearCloseTimer();
      setInternalVisible(true);
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, OPEN_SPRING);
    } else if (internalVisible) {
      startCloseAnimation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  const requestClose = useCallback(() => {
    startCloseAnimation();
    onClose();
  }, [startCloseAnimation, onClose]);

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    if (translationY > 0) {
      translateY.value = translationY;
      lastTranslateY.value = translationY;
    }
  };

  const onGestureEnd = (
    _event: HandlerStateChangeEvent<Record<string, unknown>>
  ) => {
    if (lastTranslateY.value > 150) {
      requestClose();
    } else {
      translateY.value = withSpring(0, OPEN_SPRING);
    }
    lastTranslateY.value = 0;
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return {
    internalVisible,
    requestClose,
    onGestureEvent,
    onGestureEnd,
    sheetStyle,
    backdropStyle,
  };
}
