/**
 * The real Create (+) control.
 *
 * BottomNav lives inside `Slot`. The Now Playing bar is a later root sibling
 * with GestureDetectors, so the in-page + never receives the press on Android.
 * This button is mounted after the mini player, is only as big as the +, and
 * uses RNGH Tap so it wins the hit test.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { InteractionManager, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { useMediaStore } from "@/store/useUploadStore";
import { setMiniPlayerSuppression } from "../../src/shared/audio/miniPlayerGate";
import {
  isBottomChromeMounted,
  subscribeBottomChrome,
} from "../../src/shared/layout/bottomChromeGate";
import {
  getCreateSheetBottomOffset,
  getFabWrapperBottom,
} from "../../src/shared/layout/bottomChromeLayout";
import { useCommentModal } from "../context/CommentModalContext";
import {
  prefetchCreateFlows,
  prefetchGoLiveScreen,
  prefetchUploadScreen,
} from "../utils/prefetchUploadScreen";
import {
  getFabSize,
  getResponsiveBorderRadius,
  getResponsiveShadow,
  getResponsiveSpacing,
} from "../../utils/responsive";
import { FabCreateActions } from "./FabCreateActions";

export default function RootCreateFab() {
  const chromeMounted = useSyncExternalStore(
    subscribeBottomChrome,
    isBottomChromeMounted,
    isBottomChromeMounted
  );
  const { isVisible: commentsOpen } = useCommentModal();
  const overlayFull = useCopyrightFreeOverlayStore((s) => s.surface === "full");
  const { width } = useWindowDimensions();

  const [showActions, setShowActions] = useState(false);
  const [sheetMounted, setSheetMounted] = useState(false);

  const hidden = !chromeMounted || commentsOpen || overlayFull;

  const toggle = useCallback(() => {
    setSheetMounted(true);
    setShowActions((open) => {
      const next = !open;
      if (next) prefetchCreateFlows();
      return next;
    });
  }, []);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(400)
        .onEnd((_e, success) => {
          if (success) runOnJS(toggle)();
        }),
    [toggle]
  );

  useEffect(() => {
    setMiniPlayerSuppression("create-sheet", showActions && !hidden);
  }, [hidden, showActions]);

  useEffect(() => {
    return () => setMiniPlayerSuppression("create-sheet", false);
  }, []);

  useEffect(() => {
    if (hidden && showActions) setShowActions(false);
  }, [hidden, showActions]);

  const handleUpload = useCallback(() => {
    setShowActions(false);
    router.push("/categories/upload");
    queueMicrotask(() => prefetchUploadScreen());
    InteractionManager.runAfterInteractions(() => {
      try {
        useMediaStore.getState().stopAudioFn?.();
      } catch {
        // no-op
      }
      try {
        useGlobalVideoStore.getState().pauseAllVideos();
      } catch {
        // no-op
      }
    });
  }, []);

  const handleGoLive = useCallback(() => {
    setShowActions(false);
    router.push("/goLlive/AllowPermissionsScreen");
    queueMicrotask(() => prefetchGoLiveScreen());
    InteractionManager.runAfterInteractions(() => {
      try {
        useMediaStore.getState().stopAudioFn?.();
      } catch {
        // no-op
      }
      try {
        useGlobalVideoStore.getState().pauseAllVideos();
      } catch {
        // no-op
      }
    });
  }, []);

  if (hidden) return null;

  const inner = getFabSize().size;
  const pad = getResponsiveSpacing(2, 3, 4, 5);
  const outer = inner + pad * 2;
  const left = Math.round(width / 2 - outer / 2);

  return (
    <>
      {sheetMounted ? (
        <FabCreateActions
          visible={showActions}
          bottomOffset={getCreateSheetBottomOffset()}
          onUpload={handleUpload}
          onGoLive={handleGoLive}
          onUploadIntent={prefetchUploadScreen}
          onGoLiveIntent={prefetchGoLiveScreen}
        />
      ) : null}

      <GestureDetector gesture={tap}>
        <View
          collapsable={false}
          accessible
          accessibilityRole="button"
          accessibilityLabel={showActions ? "Close create" : "Create"}
          style={{
            position: "absolute",
            bottom: getFabWrapperBottom(),
            left,
            backgroundColor: "white",
            padding: pad,
            borderRadius: getResponsiveBorderRadius("round"),
            ...getResponsiveShadow(),
            zIndex: 90000,
            elevation: 96,
          }}
        >
          <View
            collapsable={false}
            style={{
              width: inner,
              height: inner,
              borderRadius: getResponsiveBorderRadius("round"),
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={showActions ? "close" : "add"}
              size={getFabSize().iconSize}
              color="#256E63"
              pointerEvents="none"
            />
          </View>
        </View>
      </GestureDetector>
    </>
  );
}
