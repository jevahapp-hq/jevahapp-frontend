import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function ReelsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: Platform.OS === "ios" ? "slide_from_right" : "none",
        contentStyle: { backgroundColor: "#000" },
      }}
    />
  );
}
