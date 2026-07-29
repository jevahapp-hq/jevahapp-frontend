import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Dimensions, Keyboard, Platform } from "react-native";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  COMMENT_SHEET_BACKDROP_MAX,
  COMMENT_SHEET_DISMISS_THRESHOLD,
  COMMENT_SHEET_IN,
  COMMENT_SHEET_OUT,
  MEDIA_PEEK_HEIGHT,
  SCREEN_HEIGHT,
  SHEET_HEIGHT_REST,
} from "../commentSheetLayout";

const SCREEN_H = Dimensions.get("screen").height;

export function useCommentSheetAnimation(options: {
  isVisible: boolean;
  onHideComplete: () => void;
  onClosedUiReset?: () => void;
}) {
  const { isVisible, onHideComplete, onClosedUiReset } = options;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const closingRef = useRef(false);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);

  useEffect(() => {
    const onShow = (e: {
      endCoordinates: { height: number; screenY: number };
    }) => {
      const { height, screenY } = e.endCoordinates;
      const fromScreen = Math.max(0, SCREEN_H - screenY);
      const windowOvershoot = Math.max(0, SCREEN_H - SCREEN_HEIGHT);
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
      closingRef.current = false;
      translateY.value = SHEET_HEIGHT_REST;
      backdropOpacity.value = 0;
      translateY.value = withTiming(0, COMMENT_SHEET_IN);
      backdropOpacity.value = withTiming(COMMENT_SHEET_BACKDROP_MAX, {
        duration: 160,
      });
    } else {
      translateY.value = SCREEN_HEIGHT;
      backdropOpacity.value = 0;
      keyboardOffset.value = 0;
      setKeyboardHeight(0);
      onClosedUiReset?.();
    }
  }, [
    isVisible,
    translateY,
    backdropOpacity,
    keyboardOffset,
    onClosedUiReset,
  ]);

  const finishHide = useCallback(() => {
    onHideComplete();
    closingRef.current = false;
  }, [onHideComplete]);

  const closeModal = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    keyboardOffset.value = withTiming(0, { duration: 160 });
    translateY.value = withTiming(SHEET_HEIGHT_REST + 40, COMMENT_SHEET_OUT);
    backdropOpacity.value = withTiming(0, { duration: 140 });
    setTimeout(() => finishHide(), 165);
  }, [finishHide, translateY, backdropOpacity, keyboardOffset]);

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
    Keyboard.dismiss();
    setTimeout(() => finishHide(), 200);
  }, [finishHide]);

  const handleGestureEnd = (event: any) => {
    "worklet";
    const ty = event.translationY ?? event.nativeEvent?.translationY ?? 0;
    if (ty > COMMENT_SHEET_DISMISS_THRESHOLD) {
      translateY.value = withTiming(SHEET_HEIGHT_REST + 80, COMMENT_SHEET_OUT);
      backdropOpacity.value = withTiming(0, { duration: 180 });
      runOnJS(dismissFromGesture)();
    } else {
      translateY.value = withTiming(0, COMMENT_SHEET_IN);
    }
  };

  const sheetAnimatedStyle = useAnimatedStyle(() => {
    const kb = keyboardOffset.value;
    const h = Math.max(280, SCREEN_HEIGHT - MEDIA_PEEK_HEIGHT - kb);
    return {
      bottom: kb,
      height: h,
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
  };
}
