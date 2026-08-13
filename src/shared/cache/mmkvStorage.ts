/**
 * Fast storage for feed/cache hydrate.
 * Prefer MMKV when NitroModules is in the native binary; otherwise use an
 * in-memory map (+ optional AsyncStorage mirror) so Expo Go / stale dev
 * clients still boot.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StateStorage } from "zustand/middleware";

type KvStore = {
  getString: (key: string) => string | undefined;
  getNumber: (key: string) => number | undefined;
  set: (key: string, value: string | number | boolean) => void;
  remove: (key: string) => void;
};

const memory = new Map<string, string | number | boolean>();

const memoryStore: KvStore = {
  getString: (key) => {
    const v = memory.get(key);
    return typeof v === "string" ? v : undefined;
  },
  getNumber: (key) => {
    const v = memory.get(key);
    return typeof v === "number" ? v : undefined;
  },
  set: (key, value) => {
    memory.set(key, value);
  },
  remove: (key) => {
    memory.delete(key);
  },
};

function tryCreateMmkvStore(): KvStore | null {
  try {
    // Dynamic require so missing NitroModules does not crash module evaluation
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mmkvMod = require("react-native-mmkv") as {
      createMMKV: (opts: { id: string }) => {
        getString: (k: string) => string | undefined;
        getNumber: (k: string) => number | undefined;
        set: (k: string, v: string | number | boolean) => void;
        remove: (k: string) => void;
      };
    };
    const instance = mmkvMod.createMMKV({ id: "jevah-app-cache" });
    return {
      getString: (k) => instance.getString(k) ?? undefined,
      getNumber: (k) => instance.getNumber(k) ?? undefined,
      set: (k, v) => instance.set(k, v),
      remove: (k) => instance.remove(k),
    };
  } catch (e) {
    if (__DEV__) {
      console.warn(
        "⚠️ MMKV/NitroModules unavailable — using memory+AsyncStorage fallback. Rebuild a native dev client with react-native-mmkv for sync cold-start cache.",
        e instanceof Error ? e.message : e
      );
    }
    return null;
  }
}

const mmkv = tryCreateMmkvStore();
export const appMmkv: KvStore = mmkv ?? memoryStore;
export const isMmkvNative = Boolean(mmkv);

const ASYNC_PREFIX = "@jevah-kv:";

/** Mirror fallback writes to AsyncStorage (best-effort, async). */
function mirrorAsync(key: string, value: string | null): void {
  if (isMmkvNative) return;
  const asyncKey = `${ASYNC_PREFIX}${key}`;
  void (value == null
    ? AsyncStorage.removeItem(asyncKey)
    : AsyncStorage.setItem(asyncKey, value)
  ).catch(() => {});
}

/** Zustand `createJSONStorage(() => mmkvZustandStorage)` */
export const mmkvZustandStorage: StateStorage = {
  getItem: (name) => {
    const value = appMmkv.getString(name);
    return value ?? null;
  },
  setItem: (name, value) => {
    appMmkv.set(name, value);
    mirrorAsync(name, value);
  },
  removeItem: (name) => {
    appMmkv.remove(name);
    mirrorAsync(name, null);
  },
};

export function mmkvGetJson<T>(key: string): T | null {
  try {
    const raw = appMmkv.getString(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function mmkvSetJson(key: string, value: unknown): void {
  try {
    const raw = JSON.stringify(value);
    appMmkv.set(key, raw);
    mirrorAsync(key, raw);
  } catch {
    // ignore quota / serialize errors
  }
}

/**
 * Warm memory fallback from AsyncStorage so cold start after process death
 * can still seed RQ once this resolves (non-blocking for splash).
 */
export async function hydrateFallbackKvFromAsyncStorage(
  keys: string[]
): Promise<void> {
  if (isMmkvNative) return;
  try {
    const pairs = await AsyncStorage.multiGet(
      keys.map((k) => `${ASYNC_PREFIX}${k}`)
    );
    for (const [asyncKey, value] of pairs) {
      if (value == null) continue;
      const key = asyncKey.slice(ASYNC_PREFIX.length);
      memory.set(key, value);
    }
  } catch {
    // ignore
  }
}
