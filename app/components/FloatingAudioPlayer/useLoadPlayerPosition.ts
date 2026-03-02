import { useEffect } from "react";
import { Animated } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PLAYER_POSITION_KEY = "floating_player_position";

interface UseLoadPlayerPositionProps {
  setPlayerPosition: (pos: { x: number; y: number }) => void;
  translateX: Animated.Value;
  translateYDrag: Animated.Value;
}

export function useLoadPlayerPosition({
  setPlayerPosition,
  translateX,
  translateYDrag,
}: UseLoadPlayerPositionProps) {
  useEffect(() => {
    const loadSavedPosition = async () => {
      try {
        const savedPosition = await AsyncStorage.getItem(PLAYER_POSITION_KEY);
        if (savedPosition) {
          const { x, y } = JSON.parse(savedPosition);
          setPlayerPosition({ x, y });
          translateX.setValue(x);
          translateYDrag.setValue(y);
        }
      } catch (error) {
        console.log("Error loading player position:", error);
      }
    };
    loadSavedPosition();
  }, [setPlayerPosition, translateX, translateYDrag]);
}
