/**
 * Scrub gestures via RNGH Gesture.Pan so the bar wins over vertical FlatList
 * (RN PanResponder loses to gesture-handler scroll views).
 * Refs keep width / callbacks fresh for runOnJS handlers.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import type { ProgressBarConfig } from "./types";
import { calculateProgressFromTouch, clamp, debugLog } from "./utils";

export type ProgressBarGestureCallbacks = {
  getStartProgress: () => number;
  onDragStart: (progress: number) => void;
  onDragMove: (progress: number) => void;
  onDragEnd: (finalProgress: number) => void;
  onLiveSeek: (progress: number) => void;
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
  const finishedRef = useRef(false);
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

  const handleBegin = useCallback((x: number) => {
    finishedRef.current = false;
    movedRef.current = false;
    const width = barWidthRef.current;
    const grant =
      width > 0
        ? clamp(x / width, 0, 1)
        : callbacksRef.current.getStartProgress();

    grantProgressRef.current = grant;
    dragProgressRef.current = grant;
    liveSeekLastRef.current = 0;

    debugLog(
      "Drag started",
      { locationX: x, width, grant },
      debugRef.current
    );

    callbacksRef.current.onDragStart(grant);

    if (configRef.current.seekDuringDrag) {
      liveSeekLastRef.current = Date.now();
      callbacksRef.current.onLiveSeek(grant);
    }
  }, []);

  const handleUpdate = useCallback(
    (x: number, translationX: number, translationY: number) => {
      if (Math.abs(translationX) > 3 || Math.abs(translationY) > 3) {
        movedRef.current = true;
      }

      const width = barWidthRef.current;
      const next = calculateProgressFromTouch(
        x,
        width,
        grantProgressRef.current,
        translationX,
        translationY,
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
    []
  );

  const handleEnd = useCallback((x: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    const width = barWidthRef.current;
    if (!movedRef.current && width > 0) {
      const tapped = clamp(x / width, 0, 1);
      dragProgressRef.current = tapped;
      debugLog("Tap seek", { tapped, width }, debugRef.current);
      callbacksRef.current.onTapSeek(tapped);
      return;
    }

    const finalProgress = dragProgressRef.current;
    debugLog("Drag ended", { finalProgress }, debugRef.current);
    callbacksRef.current.onDragEnd(finalProgress);
  }, []);

  const handleCancel = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const finalProgress = dragProgressRef.current;
    debugLog("Drag cancelled", { finalProgress }, debugRef.current);
    callbacksRef.current.onDragEnd(finalProgress);
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        // Claim immediately so Reels FlatList cannot steal the touch
        .manualActivation(true)
        .onTouchesDown((_e, stateManager) => {
          stateManager.activate();
        })
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        .onBegin((e) => {
          runOnJS(handleBegin)(e.x);
        })
        .onUpdate((e) => {
          runOnJS(handleUpdate)(e.x, e.translationX, e.translationY);
        })
        .onEnd((e) => {
          runOnJS(handleEnd)(e.x);
        })
        .onFinalize((_e, success) => {
          if (!success) {
            runOnJS(handleCancel)();
          }
        }),
    [handleBegin, handleUpdate, handleEnd, handleCancel]
  );

  return {
    gesture,
    dragProgressRef,
  };
};
