import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Dimensions } from "react-native";

export function useForumAnimation() {
  const router = useRouter();
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBackToCommunity = () => {
    // Slide out animation to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.push("/screens/PrayerWallScreen");
    });
  };

  return { slideAnim, handleBackToCommunity };
}
