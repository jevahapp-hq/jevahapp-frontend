import { useRef } from "react";
import { Dimensions, PanResponder } from "react-native";
import { useSharedValue, withSpring, runOnJS } from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useDismissSwipe(onClose: () => void) {
  const swipeTranslateY = useSharedValue(0);
  const isDismissing = useRef(false);

  const dismissPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 3;
      },
      onPanResponderGrant: () => {
        swipeTranslateY.value = 0;
        isDismissing.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          const resistance = 0.85;
          swipeTranslateY.value = gestureState.dy * resistance;
          if (gestureState.dy > 80) {
            isDismissing.current = true;
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80 || (gestureState.dy > 40 && gestureState.vy > 0.5)) {
          swipeTranslateY.value = withSpring(SCREEN_HEIGHT, {
            damping: 15,
            stiffness: 300,
            mass: 0.5,
          }, () => {
            runOnJS(onClose)();
          });
        } else {
          swipeTranslateY.value = withSpring(0, {
            damping: 25,
            stiffness: 400,
            mass: 0.5,
          });
          isDismissing.current = false;
        }
      },
    })
  ).current;

  return {
    swipeTranslateY,
    dismissPanResponder,
  };
}
