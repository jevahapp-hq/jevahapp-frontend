import AsyncStorage from "@react-native-async-storage/async-storage";
import { cacheAuthToken, peekAuthToken } from "./tokenMemory";

export { isValidJwtFormat } from "./jwtFormat";

const SECURE_JWT_KEY = "jwt";
const LEGACY_ASYNC_KEYS = ["userToken", "token"] as const;

async function secureStore() {
  return import("expo-secure-store");
}

/**
 * JWTs live in SecureStore only. Legacy AsyncStorage copies are migrated
 * once, then deleted so they cannot land in Android Auto Backup.
 */
export async function getAuthToken(): Promise<string | null> {
  const cached = peekAuthToken();
  if (cached !== undefined) return cached;

  try {
    const SecureStore = await secureStore();
    if (typeof SecureStore.getItemAsync === "function") {
      const secure = await SecureStore.getItemAsync(SECURE_JWT_KEY);
      if (secure) {
        cacheAuthToken(secure);
        return secure;
      }
    }
  } catch {
    // SecureStore unavailable (web / Expo Go quirks)
  }

  try {
    for (const key of LEGACY_ASYNC_KEYS) {
      const legacy = await AsyncStorage.getItem(key);
      if (legacy) {
        await storeAuthToken(legacy);
        return legacy;
      }
    }
  } catch {
    // ignore
  }

  cacheAuthToken(null);
  return null;
}

export async function storeAuthToken(token: string): Promise<void> {
  cacheAuthToken(token);
  const SecureStore = await secureStore();
  if (typeof SecureStore.setItemAsync !== "function") {
    throw new Error("SecureStore is unavailable; cannot persist auth token");
  }
  await SecureStore.setItemAsync(SECURE_JWT_KEY, token);
  try {
    await AsyncStorage.multiRemove([...LEGACY_ASYNC_KEYS]);
  } catch {
    // best-effort wipe of backup-prone copies
  }
}

export async function clearAuthTokens(): Promise<void> {
  cacheAuthToken(null);
  try {
    const SecureStore = await secureStore();
    if (typeof SecureStore.deleteItemAsync === "function") {
      await SecureStore.deleteItemAsync(SECURE_JWT_KEY);
    }
  } catch {
    // continue
  }
  try {
    await AsyncStorage.multiRemove([...LEGACY_ASYNC_KEYS]);
  } catch {
    // continue
  }
}

export async function getTokenSources(): Promise<string[]> {
  const sources: string[] = [];
  try {
    const SecureStore = await secureStore();
    if (typeof SecureStore.getItemAsync === "function") {
      const jwt = await SecureStore.getItemAsync(SECURE_JWT_KEY);
      if (jwt) sources.push("jwt");
    }
  } catch {
    // ignore
  }
  return sources;
}
