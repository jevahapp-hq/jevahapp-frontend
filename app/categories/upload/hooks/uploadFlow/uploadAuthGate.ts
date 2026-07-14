import { Alert } from "react-native";
import type { Router } from "expo-router";
import {
  logUserDataStatus,
  validateUserForUpload,
} from "../../../../utils/userValidation";
import { checkAuthenticationStatus } from "../../utils";

export async function ensureUploadAuthenticated(
  router: Router
): Promise<{ ok: true; token: string; user: Record<string, unknown> } | { ok: false }> {
  const authStatus = await checkAuthenticationStatus();

  if (!authStatus.hasToken || !authStatus.hasUser) {
    let message = "Please log in to upload content.";
    if (!authStatus.hasToken && !authStatus.hasUser) {
      message = "Your session has expired. Please log in again.";
    } else if (!authStatus.hasToken) {
      message = "Authentication token missing. Please log in again.";
    } else if (!authStatus.hasUser) {
      message = "User data missing. Please log in again.";
    }

    Alert.alert("Authentication Required", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Go to Login", onPress: () => router.push("/auth/login") },
    ]);
    return { ok: false };
  }

  return {
    ok: true,
    token: authStatus.token!,
    user: authStatus.user as Record<string, unknown>,
  };
}

export function normalizeUploadUser(user: Record<string, unknown>) {
  const validation = validateUserForUpload(user);
  const normalizedUser = validation.normalizedUser;

  logUserDataStatus(user, "Upload");

  if (!validation.isValid) {
    console.warn("⚠️ Upload with incomplete user data:", validation.missingFields);
  }

  if (!normalizedUser.avatar) {
    const avatar =
      (user.avatar as string) ||
      (user.imageUrl as string) ||
      (user.profileImage as string) ||
      "";
    if (avatar) normalizedUser.avatar = avatar;
  }

  return { normalizedUser, validation };
}
