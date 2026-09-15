/**
 * Last Home feed chip (ALL / SERMON / E-BOOKS / …) so the ebook reader
 * can return to the tab the user opened it from.
 */
import { appMmkv } from "../cache/mmkvStorage";

const KEY = "home_feed_category";

let last = "ALL";

export function rememberHomeFeedCategory(category: string): void {
  const next = String(category || "ALL").trim() || "ALL";
  last = next;
  try {
    appMmkv.set(KEY, next);
  } catch {
    // ignore
  }
}

export function readHomeFeedCategory(): string {
  try {
    const stored = appMmkv.getString(KEY);
    if (stored) {
      last = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  return last || "ALL";
}
