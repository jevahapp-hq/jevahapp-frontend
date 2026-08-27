import { useEffect } from "react";
import { Dimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useModalSheetAnimations({
  visible,
  showPlaylistView,
  showPlaylistDetail,
  onClose,
}: {
  visible: boolean;
  showPlaylistView: boolean;
  showPlaylistDetail: boolean;
  onClose: () => void;
}) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const playlistViewTranslateY = useSharedValue(SCREEN_HEIGHT);
  const playlistDetailTranslateY = useSharedValue(SCREEN_HEIGHT);
  const dragY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activeOffsetY(20)
    .failOffsetX([-18, 18])
    .onUpdate((event) => {
      if (event.translationY > 0) {
        dragY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 600) {
        dragY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
          runOnJS(onClose)();
        });
      } else {
        dragY.value = withTiming(0, { duration: 140 });
      }
    });

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

  useEffect(() => {
    if (visible) {
      dragY.value = 0;
      translateY.value = withTiming(0, { duration: 140 });
    } else {
      dragY.value = 0;
      translateY.value = SCREEN_HEIGHT;
    }
  }, [visible, translateY, dragY]);

  const playlistViewAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistViewTranslateY.value }],
  }));

  const playlistDetailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistDetailTranslateY.value }],
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }],
  }));

  return {
    gesture,
    modalAnimatedStyle,
    playlistViewAnimatedStyle,
    playlistDetailAnimatedStyle,
  };
}
