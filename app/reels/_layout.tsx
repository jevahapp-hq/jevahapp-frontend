import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function ReelsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: Platform.OS === "ios",
        fullScreenGestureEnabled: false,
        animation: Platform.OS === "ios" ? "slide_from_right" : "none",
        contentStyle: { backgroundColor: "#000" },
      }}
    />
  );
}
