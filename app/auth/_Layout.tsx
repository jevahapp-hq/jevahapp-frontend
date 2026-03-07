import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";

export default function AuthLayout() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("token").then((t) => setHasToken(!!t));
  }, []);

  // Still checking storage
  if (hasToken === null) return null;

  // Already logged in — send to app
  if (hasToken) {
    return <Redirect href="/categories/HomeScreen" />;
  }

  return <Stack />;
}
