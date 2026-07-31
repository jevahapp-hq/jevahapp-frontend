import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions } from "react-native";
import { State } from "react-native-gesture-handler";
import type {
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
/** Finger travel (px) before the sheet dismisses */
const DISMISS_THRESHOLD = 100;
/** Fast flick downward also dismisses */
const DISMISS_VELOCITY = 900;

/**
 * Bottom-sheet open/close + swipe-down-to-dismiss.
 * Gesture end must only run on END/CANCELLED — handling BEGAN/ACTIVE
 * was fighting the drag and made pull-to-close feel broken.
 */
export function useSheetTransition(isVisible: boolean, onClose: () => void) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [internalVisible, setInternalVisible] = useState(isVisible);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const startCloseAnimation = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    backdropOpacity.value = withTiming(0, { duration: CLOSE_DURATION });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: CLOSE_DURATION });
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setInternalVisible(false);
      closingRef.current = false;
    }, CLOSE_DURATION + 30);
  }, [backdropOpacity, translateY, clearCloseTimer]);

  useEffect(() => {
    if (isVisible) {
      closingRef.current = false;
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

  const dismissFromGesture = useCallback(() => {
    startCloseAnimation();
    onClose();
  }, [startCloseAnimation, onClose]);

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    if (translationY > 0) {
      translateY.value = translationY;
    }
  };

  const onGestureEnd = (
    event: HandlerStateChangeEvent<Record<string, unknown>> | { nativeEvent?: any }
  ) => {
    const native = (event as any)?.nativeEvent ?? event;
    const state = native?.state;
    // Only settle on gesture end — ignore BEGAN/ACTIVE (old bug fought the drag)
    if (
      state != null &&
      state !== State.END &&
      state !== State.CANCELLED &&
      state !== State.FAILED
    ) {
      return;
    }

    const ty = Number(native?.translationY ?? 0);
    const vy = Number(native?.velocityY ?? 0);

    if (ty > DISMISS_THRESHOLD || vy > DISMISS_VELOCITY) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: CLOSE_DURATION });
      backdropOpacity.value = withTiming(0, { duration: CLOSE_DURATION });
      dismissFromGesture();
    } else {
      translateY.value = withSpring(0, OPEN_SPRING);
    }
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
