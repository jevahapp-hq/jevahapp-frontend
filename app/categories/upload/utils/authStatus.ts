/**
 * Resolve auth token + user for upload eligibility checks.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import TokenUtils from "../../../utils/tokenUtils";
import type { AuthStatus } from "../types";

export const checkAuthenticationStatus = async (): Promise<AuthStatus> => {
  const token = await TokenUtils.getAuthToken();
  const tokenInfo = await TokenUtils.getTokenInfo();
  const tokenSource = tokenInfo.sources[0] || "none";

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
