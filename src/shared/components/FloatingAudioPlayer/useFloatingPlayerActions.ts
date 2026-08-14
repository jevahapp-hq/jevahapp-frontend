import React, { useRef } from "react";
import { Animated, Dimensions, PanResponder } from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Params = {
  clear: () => void;
};

export function useFloatingPlayerActions({ clear }: Params) {
  const handleCloseMini = React.useCallback(() => {
    clear();
  }, [clear]);

  const baselineOffset = useRef(0);
  const dragY = useRef(new Animated.Value(0)).current;

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

        const currentY = (dragY as any)._value;

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

        const maxUp = -SCREEN_HEIGHT * 0.6;
        const maxDown = 40;

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
    handleCloseMini,
    dragY,
    panResponder,
  };
}
