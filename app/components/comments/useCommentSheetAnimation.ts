import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Dimensions, Keyboard, Platform } from "react-native";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { getWindowHeight } from "../commentSheetAnchor";
import {
  COMMENT_SHEET_BACKDROP_MAX,
  COMMENT_SHEET_DISMISS_THRESHOLD,
  COMMENT_SHEET_IN,
  COMMENT_SHEET_OUT,
  MEDIA_PEEK_HEIGHT,
} from "../commentSheetLayout";

const SCREEN_H = Dimensions.get("screen").height;

export function useCommentSheetAnimation(options: {
  isVisible: boolean;
  /** Dynamic peek — measured media bottom when available */
  mediaPeekHeight?: number;
  /** Fire on the same frame dismiss starts — HUD + media restore */
  onDismissStart?: () => void;
  onHideComplete: () => void;
  onClosedUiReset?: () => void;
}) {
  const {
    isVisible,
    mediaPeekHeight = MEDIA_PEEK_HEIGHT,
    onDismissStart,
    onHideComplete,
    onClosedUiReset,
  } = options;
  const peekRef = useRef(mediaPeekHeight);
  peekRef.current = mediaPeekHeight;
  const windowH = getWindowHeight();
  const sheetRestHeight = Math.max(280, windowH - mediaPeekHeight);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const closingRef = useRef(false);

  const translateY = useSharedValue(windowH);
  const backdropOpacity = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);
  const peekShared = useSharedValue(mediaPeekHeight);
  const windowHShared = useSharedValue(windowH);

  useEffect(() => {
    // Sync immediately so first paint / scale origin aren't one frame late
    peekShared.value = mediaPeekHeight;
  }, [mediaPeekHeight, peekShared]);

  useEffect(() => {
    windowHShared.value = windowH;
  }, [windowH, windowHShared]);

  useEffect(() => {
    const onShow = (e: {
      endCoordinates: { height: number; screenY: number };
    }) => {
      const { height, screenY } = e.endCoordinates;
      const fromScreen = Math.max(0, SCREEN_H - screenY);
      const liveH = getWindowHeight();
      const windowOvershoot = Math.max(0, SCREEN_H - liveH);
      const measured = Math.max(
        0,
        Math.max(height, fromScreen) - windowOvershoot
      );
      setKeyboardHeight(measured);
      keyboardOffset.value = withTiming(measured, {
        duration: Platform.OS === "ios" ? 250 : 160,
      });
    };
    const onHide = () => {
      setKeyboardHeight(0);
      keyboardOffset.value = withTiming(0, {
        duration: Platform.OS === "ios" ? 220 : 140,
      });
    };
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      onShow
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      onHide
    );
    return () => {
      show?.remove();
      hide?.remove();
    };
  }, [keyboardOffset]);

  useEffect(() => {
    if (isVisible) {
      // Ensure peek is current before open animation (avoids full-bleed first frame)
      peekShared.value = mediaPeekHeight;
      closingRef.current = false;
      translateY.value = sheetRestHeight;
      backdropOpacity.value = 0;
      translateY.value = withTiming(0, COMMENT_SHEET_IN);
      backdropOpacity.value = withTiming(COMMENT_SHEET_BACKDROP_MAX, {
        duration: 160,
      });
    } else {
      translateY.value = getWindowHeight();
      backdropOpacity.value = 0;
      keyboardOffset.value = 0;
      setKeyboardHeight(0);
      onClosedUiReset?.();
    }
  }, [
    isVisible,
    mediaPeekHeight,
    sheetRestHeight,
    translateY,
    backdropOpacity,
    keyboardOffset,
    peekShared,
    onClosedUiReset,
  ]);

  const finishHide = useCallback(() => {
    onHideComplete();
    closingRef.current = false;
  }, [onHideComplete]);

  const closeModal = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    onDismissStart?.();
    Keyboard.dismiss();
    keyboardOffset.value = withTiming(0, { duration: 160 });
    const rest = Math.max(280, getWindowHeight() - peekRef.current);
    translateY.value = withTiming(rest + 40, COMMENT_SHEET_OUT);
    backdropOpacity.value = withTiming(0, { duration: 140 });
    setTimeout(() => finishHide(), 165);
  }, [finishHide, onDismissStart, translateY, backdropOpacity, keyboardOffset]);

  useEffect(() => {
    if (!isVisible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeModal();
      return true;
    });
    return () => sub.remove();
  }, [isVisible, closeModal]);

  const dismissFromGesture = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    onDismissStart?.();
    Keyboard.dismiss();
    setTimeout(() => finishHide(), 200);
  }, [finishHide, onDismissStart]);

  const handleGestureEnd = (event: any) => {
    "worklet";
    const ty = event.translationY ?? event.nativeEvent?.translationY ?? 0;
    if (ty > COMMENT_SHEET_DISMISS_THRESHOLD) {
      const rest = Math.max(280, windowHShared.value - peekShared.value);
      translateY.value = withTiming(rest + 80, COMMENT_SHEET_OUT);
      backdropOpacity.value = withTiming(0, { duration: 180 });
      runOnJS(dismissFromGesture)();
    } else {
      translateY.value = withTiming(0, COMMENT_SHEET_IN);
    }
  };

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    const kb = keyboardOffset.value;
    // Pin top via StyleSheet `top: peek`; only lift for keyboard + dismiss slide
    return {
      bottom: kb,
      transform: [{ translateY: translateY.value }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const keyboardBridgeStyle = useAnimatedStyle(() => ({
    height: keyboardOffset.value,
    opacity: keyboardOffset.value > 0 ? 1 : 0,
  }));

  const onPanGestureEvent = (event: any) => {
    "worklet";
    const ty = event.nativeEvent.translationY;
    if (ty > 0) translateY.value = ty;
  };

  return {
    keyboardHeight,
    closeModal,
    handleGestureEnd,
    onPanGestureEvent,
    sheetAnimatedStyle,
    backdropStyle,
    keyboardBridgeStyle,
    translateY,
    mediaPeekHeight,
  };
}
