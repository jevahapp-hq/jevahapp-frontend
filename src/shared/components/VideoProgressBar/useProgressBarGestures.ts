/**
 * Scrub gestures — refs keep PanResponder fresh (bar width, progress, seek callbacks).
 * Stale useRef(PanResponder.create) was seeking to 0% because barWidth froze at 0.
 */
import { useEffect, useMemo, useRef } from "react";
import { PanResponder } from "react-native";
import type { ProgressBarConfig } from "./types";
import { calculateProgressFromTouch, clamp, debugLog } from "./utils";

export type ProgressBarGestureCallbacks = {
  /** Latest external/display progress when a new drag starts (fallback if width unknown) */
  getStartProgress: () => number;
  onDragStart: (progress: number) => void;
  onDragMove: (progress: number) => void;
  /** Always receives the final progress from an internal ref — never trust a React closure */
  onDragEnd: (finalProgress: number) => void;
  /** Live scrub while dragging (throttled) */
  onLiveSeek: (progress: number) => void;
  /** Tap-to-seek on short press without drag */
  onTapSeek: (progress: number) => void;
};

export const useProgressBarGestures = (
  barWidth: number,
  config: ProgressBarConfig,
  callbacks: ProgressBarGestureCallbacks,
  debug: boolean = false
) => {
  const barWidthRef = useRef(barWidth);
  const grantProgressRef = useRef(0);
  const dragProgressRef = useRef(0);
  const liveSeekLastRef = useRef(0);
  const movedRef = useRef(false);
  const debugRef = useRef(debug);
  const configRef = useRef(config);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    barWidthRef.current = barWidth;
  }, [barWidth]);
  useEffect(() => {
    debugRef.current = debug;
  }, [debug]);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        // Keep scrubbing even if a parent scroll/tap wants the gesture
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,

        onPanResponderGrant: (evt) => {
          movedRef.current = false;
          const width = barWidthRef.current;
          const grant =
            width > 0
              ? clamp(evt.nativeEvent.locationX / width, 0, 1)
              : callbacksRef.current.getStartProgress();

          grantProgressRef.current = grant;
          dragProgressRef.current = grant;
          liveSeekLastRef.current = 0;

          debugLog(
            "Drag started",
            { locationX: evt.nativeEvent.locationX, width, grant },
            debugRef.current
          );

          callbacksRef.current.onDragStart(grant);

          if (configRef.current.seekDuringDrag) {
            liveSeekLastRef.current = Date.now();
            callbacksRef.current.onLiveSeek(grant);
          }
        },

        onPanResponderMove: (evt, gestureState) => {
          if (
            Math.abs(gestureState.dx) > 3 ||
            Math.abs(gestureState.dy) > 3
          ) {
            movedRef.current = true;
          }

          const width = barWidthRef.current;
          const next = calculateProgressFromTouch(
            evt.nativeEvent.locationX,
            width,
            grantProgressRef.current,
            gestureState.dx,
            gestureState.dy,
            configRef.current.verticalScrub
          );

          dragProgressRef.current = next;
          callbacksRef.current.onDragMove(next);

          if (configRef.current.seekDuringDrag) {
            const throttle = configRef.current.liveSeekThrottleMs ?? 48;
            const now = Date.now();
            if (now - liveSeekLastRef.current >= throttle) {
              liveSeekLastRef.current = now;
              callbacksRef.current.onLiveSeek(next);
              debugLog("Live seek", { next }, debugRef.current);
            }
          }
        },

        onPanResponderRelease: (evt) => {
          const width = barWidthRef.current;
          // Short tap without meaningful drag → absolute seek from touch X
          if (!movedRef.current && width > 0) {
            const tapped = clamp(evt.nativeEvent.locationX / width, 0, 1);
            dragProgressRef.current = tapped;
            debugLog("Tap seek", { tapped, width }, debugRef.current);
            callbacksRef.current.onTapSeek(tapped);
            return;
          }

          const finalProgress = dragProgressRef.current;
          debugLog("Drag ended", { finalProgress }, debugRef.current);
          callbacksRef.current.onDragEnd(finalProgress);
        },

        onPanResponderTerminate: () => {
          const finalProgress = dragProgressRef.current;
          debugLog("Drag cancelled", { finalProgress }, debugRef.current);
          callbacksRef.current.onDragEnd(finalProgress);
        },
      }),
    []
  );

  return {
    panHandlers: panResponder.panHandlers,
    dragProgressRef,
  };
};
