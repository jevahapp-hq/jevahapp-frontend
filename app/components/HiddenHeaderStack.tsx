import { Stack } from "expo-router";

/** Hides Expo Router's default route-name bar (e.g. "signup") above in-app headers. */
export default function HiddenHeaderStack() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
