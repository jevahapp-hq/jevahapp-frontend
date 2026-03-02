import { useRef, useCallback } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  PanResponderGestureState,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PLAYER_POSITION_KEY = "floating_player_position";

interface UseFloatingPlayerDragProps {
  playerPosition: { x: number; y: number };
  setPlayerPosition: (pos: { x: number; y: number }) => void;
  getBottomNavHeight: () => number;
  insets: { top: number };
  onClear: () => void;
}

interface SafeBoundaries {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function useFloatingPlayerDrag({
  playerPosition,
  setPlayerPosition,
  getBottomNavHeight,
  insets,
  onClear,
}: UseFloatingPlayerDragProps) {
  const translateX = useRef(new Animated.Value(playerPosition.x)).current;
  const translateYDrag = useRef(new Animated.Value(playerPosition.y)).current;
  const panX = useRef(playerPosition.x);
  const panYDrag = useRef(playerPosition.y);
  const isDragging = useRef(false);

  const MINI_PLAYER_WIDTH = SCREEN_WIDTH - 32;
  const MINI_PLAYER_HEIGHT = 72;

  const getSafeBoundaries = useCallback((): SafeBoundaries => {
    const bottomNavHeight = getBottomNavHeight();
    const safeTop = insets.top + 10;
    const safeBottom = SCREEN_HEIGHT - bottomNavHeight - MINI_PLAYER_HEIGHT - 10;
    const safeLeft = 8;
    const safeRight = SCREEN_WIDTH - MINI_PLAYER_WIDTH - 8;

    return {
      minX: safeLeft,
      maxX: safeRight,
      minY: safeTop,
      maxY: safeBottom,
    };
  }, [getBottomNavHeight, insets.top]);

  const savePosition = useCallback(async (x: number, y: number) => {
    try {
      await AsyncStorage.setItem(PLAYER_POSITION_KEY, JSON.stringify({ x, y }));
    } catch (error) {
      console.log("Error saving player position:", error);
    }
  }, []);

  // Single tap and hold to drag - no touch handler needed
  const panResponder = useRef(
    PanResponder.create({
      // Don't capture on touch start - wait for movement
      onStartShouldSetPanResponder: () => false,
      // Capture when moving significantly (tap and hold then drag)
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        // Require significant movement to start dragging
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        panX.current = playerPosition.x;
        panYDrag.current = playerPosition.y;
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        if (!isDragging.current) return;

        const boundaries = getSafeBoundaries();
        let newX = panX.current + gestureState.dx;
        let newY = panYDrag.current - gestureState.dy;

        newX = Math.max(boundaries.minX, Math.min(boundaries.maxX, newX));
        newY = Math.max(boundaries.minY, Math.min(boundaries.maxY, newY));

        translateX.setValue(newX);
        translateYDrag.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        if (!isDragging.current) return;

        const boundaries = getSafeBoundaries();
        let finalX = panX.current + gestureState.dx;
        let finalY = panYDrag.current - gestureState.dy;

        finalX = Math.max(boundaries.minX, Math.min(boundaries.maxX, finalX));
        finalY = Math.max(boundaries.minY, Math.min(boundaries.maxY, finalY));

        if (gestureState.dy > 80 && gestureState.vy > 0.5) {
          Animated.timing(translateYDrag, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClear();
          });
        } else {
          setPlayerPosition({ x: finalX, y: finalY });
          savePosition(finalX, finalY);

          Animated.parallel([
            Animated.spring(translateX, {
              toValue: finalX,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(translateYDrag, {
              toValue: finalY,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start(() => {
            isDragging.current = false;
          });
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: playerPosition.x,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(translateYDrag, {
            toValue: playerPosition.y,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

  return {
    translateX,
    translateYDrag,
    panResponder,
    savePosition,
  };
}
