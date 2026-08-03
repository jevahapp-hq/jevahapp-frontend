import { useEffect } from "react";
import { Dimensions } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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
    .activeOffsetY([0, 10])
    .failOffsetX([-20, 20])
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
        dragY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  useEffect(() => {
    if (showPlaylistView) {
      playlistViewTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
        overshootClamping: true,
      });
    } else {
      playlistViewTranslateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
      });
    }
  }, [showPlaylistView, playlistViewTranslateY]);

  useEffect(() => {
    if (showPlaylistDetail) {
      playlistDetailTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
        overshootClamping: true,
      });
    } else {
      playlistDetailTranslateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
      });
    }
  }, [showPlaylistDetail, playlistDetailTranslateY]);

  useEffect(() => {
    if (visible) {
      dragY.value = 0;
      translateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
        overshootClamping: true,
      });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
      });
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
