import { mmkvGetJson, mmkvRemove, mmkvSetJson } from "./mmkvStorage";
import { SESSION_CACHE_USER_KEY } from "./persistKeys";

export function getSessionCacheUserId(): string {
  const id = mmkvGetJson<string>(SESSION_CACHE_USER_KEY);
  return typeof id === "string" && id.trim() ? id.trim() : "guest";
}

export function setSessionCacheUserId(userId: string | null | undefined): void {
  const id = typeof userId === "string" ? userId.trim() : "";
  if (!id) {
    mmkvRemove(SESSION_CACHE_USER_KEY);
    return;
  }
  mmkvSetJson(SESSION_CACHE_USER_KEY, id);
}
