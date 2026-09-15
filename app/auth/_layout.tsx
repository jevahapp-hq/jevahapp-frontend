import { Redirect, Stack } from "expo-router";
import { hasBackendSessionSync } from "../utils/sessionAuth";

export default function AuthLayout() {
  // Sync MMKV only — awaiting SecureStore here blanked the login screen
  // after Logout and made sign-out feel stuck.
  if (hasBackendSessionSync()) {
    return <Redirect href="/categories/HomeScreen" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
