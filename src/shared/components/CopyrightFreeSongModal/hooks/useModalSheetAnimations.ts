import { useEffect } from "react";
import { Dimensions } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
    playlistViewAnimatedStyle,
    playlistDetailAnimatedStyle,
  };
}
