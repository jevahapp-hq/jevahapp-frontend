/**
 * Name and avatar for the home header.
 * AsyncStorage and SecureStore are slow on Android, so this read starts at
 * import and the header paints from the result instead of waiting on /auth/me.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import {
  hydrateFallbackKvFromAsyncStorage,
  mmkvGetJson,
  mmkvRemove,
  mmkvSetJson,
} from "../../src/shared/cache/mmkvStorage";

const KEY = "header-profile-v1";

export type HeaderProfileSnapshot = {
  id?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  section?: string;
};

let memory: HeaderProfileSnapshot | null | undefined;
let hydratePromise: Promise<HeaderProfileSnapshot | null> | null = null;

export function readHeaderProfile(): HeaderProfileSnapshot | null {
  if (memory !== undefined) return memory;
  memory = mmkvGetJson<HeaderProfileSnapshot>(KEY);
  return memory;
}

function remember(user: HeaderProfileSnapshot | null): void {
  memory = user;
  if (!user || (!user.firstName && !user.lastName && !user.avatar)) {
    memory = null;
    mmkvRemove(KEY);
    return;
  }
  const next: HeaderProfileSnapshot = {
    id: user.id,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    avatar: user.avatar || null,
    section: user.section || "adult",
  };
  memory = next;
  mmkvSetJson(KEY, next);
  const avatar = next.avatar?.trim();
  if (avatar && avatar.startsWith("http")) {
    void Image.prefetch(avatar).catch(() => {});
  }
}

export function writeHeaderProfile(user: HeaderProfileSnapshot | null): void {
  remember(user);
}

export function startHeaderProfileHydrate(): Promise<HeaderProfileSnapshot | null> {
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const cached = readHeaderProfile();
      if (cached?.firstName || cached?.avatar) return cached;
      try {
        await hydrateFallbackKvFromAsyncStorage([KEY]);
        const warmed = mmkvGetJson<HeaderProfileSnapshot>(KEY);
        if (warmed && (warmed.firstName || warmed.avatar)) {
          memory = warmed;
          const avatar = warmed.avatar?.trim();
          if (avatar && avatar.startsWith("http")) {
            void Image.prefetch(avatar).catch(() => {});
          }
          return warmed;
        }
        const raw = await AsyncStorage.getItem("user");
        if (!raw) {
          memory = null;
          return null;
        }
        const user = JSON.parse(raw) as HeaderProfileSnapshot & {
          _id?: string;
          avatarUpload?: string | null;
        };
        const snap: HeaderProfileSnapshot = {
          id: user.id || user._id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          avatar: user.avatar || user.avatarUpload || null,
          section: user.section || "adult",
        };
        if (!snap.firstName && !snap.lastName && !snap.avatar) {
          memory = null;
          return null;
        }
        remember(snap);
        return snap;
      } catch {
        return readHeaderProfile();
      }
    })();
  }
  return hydratePromise;
}

void startHeaderProfileHydrate();
