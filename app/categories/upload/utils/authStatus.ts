/**
 * Resolve auth token + user for upload eligibility checks.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthStatus } from "../types";

export const checkAuthenticationStatus = async (): Promise<AuthStatus> => {
  // Check for token in multiple locations
  let token = await AsyncStorage.getItem("userToken");
  let tokenSource = "userToken";

  if (!token) {
    token = await AsyncStorage.getItem("token");
    tokenSource = "token";
  }

  if (!token) {
    try {
      const { default: SecureStore } = await import("expo-secure-store");
      token = await SecureStore.getItemAsync("jwt");
      tokenSource = "jwt";
    } catch (secureStoreError) {
      // Silent fallback
    }
  }

  const userRaw = await AsyncStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  return {
    hasToken: !!token,
    token,
    tokenSource,
    hasUser: !!user,
    user,
    userRaw,
  };
};
