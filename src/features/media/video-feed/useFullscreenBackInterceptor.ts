import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import {
  runFullscreenBackExit,
  setFullscreenBackExit,
} from "./fullscreenBackSession";

/**
 * While Reels (fullscreen) is focused: Android back exits fullscreen and
 * does not leave the app. Uses a ref so playback re-renders do not tear
 * down the BackHandler subscription.
 */
export function useFullscreenBackInterceptor(onExitFullscreen: () => void) {
  const onExitRef = useRef(onExitFullscreen);
  onExitRef.current = onExitFullscreen;

  useFocusEffect(
    useCallback(() => {
      setFullscreenBackExit(() => {
        onExitRef.current();
      });

      if (Platform.OS !== "android") {
        return () => setFullscreenBackExit(null);
      }

      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        try {
          if (!runFullscreenBackExit()) {
            onExitRef.current();
          }
        } catch {
          // Still consume — never leave the app while fullscreen is focused.
        }
        return true;
      });
      return () => {
        sub.remove();
        setFullscreenBackExit(null);
      };
    }, [])
  );
}
