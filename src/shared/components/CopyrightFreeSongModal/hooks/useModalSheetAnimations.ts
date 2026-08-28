import { useEffect, useMemo } from "react";
import { Dimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const DISMISS_DISTANCE = 28;
const DISMISS_VELOCITY = 350;

function minimizeNow() {
  useCopyrightFreeOverlayStore.getState().minimize();
}

export function useModalSheetAnimations({
  showPlaylistView,
  showPlaylistDetail,
}: {
  visible: boolean;
  showPlaylistView: boolean;
  showPlaylistDetail: boolean;
  onClose: () => void;
}) {
  const playlistViewTranslateY = useSharedValue(SCREEN_HEIGHT);
  const playlistDetailTranslateY = useSharedValue(SCREEN_HEIGHT);

  const { handleGesture, artworkGesture } = useMemo(() => {
    const pan = () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-48, 48])
        .onEnd((event) => {
          if (
            event.translationY > DISMISS_DISTANCE ||
            event.velocityY > DISMISS_VELOCITY
          ) {
            runOnJS(minimizeNow)();
          }
        });

    return {
      handleGesture: pan(),
      artworkGesture: pan(),
    };
  }, []);

  useEffect(() => {
    if (showPlaylistView) {
      playlistViewTranslateY.value = withTiming(0, { duration: 180 });
    } else {
      playlistViewTranslateY.value = withTiming(SCREEN_HEIGHT, { duration: 160 });
    }
  }, [showPlaylistView, playlistViewTranslateY]);

  useEffect(() => {
    if (showPlaylistDetail) {
      playlistDetailTranslateY.value = withTiming(0, { duration: 180 });
    } else {
      playlistDetailTranslateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 160,
      });
    }
  }, [showPlaylistDetail, playlistDetailTranslateY]);

  const playlistViewAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistViewTranslateY.value }],
  }));

  const playlistDetailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistDetailTranslateY.value }],
  }));

  return {
    gesture: handleGesture,
    handleGesture,
    artworkGesture,
    playlistViewAnimatedStyle,
    playlistDetailAnimatedStyle,
  };
}
