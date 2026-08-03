import React, { useRef } from "react";
import { Animated, Dimensions, PanResponder } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Params = {
  clear: () => void;
};

export function useFloatingPlayerActions({ clear }: Params) {
  const [showFullPlayer, setShowFullPlayer] = React.useState(false);

  const handleCloseMini = React.useCallback(() => {
    // For an explicit close tap, immediately clear the global
    // audio player so the mini player disappears in one action.
    clear();
  }, [clear]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Persistent vertical offset from the baseline position
  const baselineOffset = useRef(0);
  const dragY = useRef(new Animated.Value(0)).current;

  // Pan responder for dragging (to avoid obstruction) and swipe down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        dragY.setOffset(baselineOffset.current);
        dragY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        dragY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        dragY.flattenOffset();

        // Calculate the absolute position from the baseline
        // baseline position is getBottomNavHeight() + 56
        const currentY = (dragY as any)._value;

        // Dismissal logic: Swipe down fast or far enough
        if (gestureState.dy > 100 || gestureState.vy > 0.8) {
          Animated.timing(dragY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            clear();
          });
          return;
        }

        // Bound checking: Don't let it go too high or too low
        // Max up: ~SCREEN_HEIGHT / 2
        // Max down: 0 (which is the baseline)
        const maxUp = -SCREEN_HEIGHT * 0.6;
        const maxDown = 40; // Allow a little bit of downward drag without dismissing

        let finalValue = currentY;
        if (currentY < maxUp) finalValue = maxUp;
        if (currentY > maxDown) finalValue = 0;

        baselineOffset.current = finalValue;

        Animated.spring(dragY, {
          toValue: finalValue,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return {
    showFullPlayer,
    setShowFullPlayer,
    handleCloseMini,
    formatTime,
    dragY,
    panResponder,
  };
}
