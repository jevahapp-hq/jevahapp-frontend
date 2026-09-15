import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueryClient } from "@tanstack/react-query";

export function pickDisplayAvatarUrl(user: {
  avatar?: string | null;
  avatarUpload?: string | null;
  avatarUpdatedAt?: number | string | null;
} | null | undefined): string | null {
  if (!user) return null;
  const url = String(user.avatar || user.avatarUpload || "").trim();
  if (!url) return null;
  const version = user.avatarUpdatedAt;
  if (!version) return url;
  if (/[?&]v=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
}

export function patchUserAvatar<T extends Record<string, any>>(
  user: T | null | undefined,
  avatarUrl: string
): T | null {
  if (!user) return user ?? null;
  const version = Date.now();
  return {
    ...user,
    avatar: avatarUrl,
    avatarUpload: avatarUrl,
    avatarUpdatedAt: version,
  };
}

export async function persistUserAvatar(
  queryClient: QueryClient,
  avatarUrl: string
): Promise<void> {
  const url = String(avatarUrl || "").trim();
  if (!url) return;

  let stored: Record<string, any> = {};
  try {
    const raw = await AsyncStorage.getItem("user");
    if (raw) stored = JSON.parse(raw);
  } catch {
    stored = {};
  }

  const next = patchUserAvatar(stored, url) || { avatar: url, avatarUpload: url };
  await AsyncStorage.setItem("user", JSON.stringify(next));

  queryClient.setQueriesData({ queryKey: ["user-profile"] }, (old: any) => {
    if (!old) return next;
    return patchUserAvatar(old, url);
  });
}
