import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Platform } from "react-native";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/** Run async operations in fixed-size batches, yielding between them. */
export async function batchOperations<T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 3
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    results.push(...(await Promise.all(batch.map((op) => op()))));

    // Small delay between batches to prevent blocking
    if (i + batchSize < operations.length) await sleep(5);
  }

  return results;
}

/**
 * Android blocks more easily on many concurrent AsyncStorage writes, so batch
 * them there; iOS can take them all at once.
 */
export async function batchStorageOperations(
  operations: Array<{ key: string; value: string }>
): Promise<void> {
  const write = (op: { key: string; value: string }) =>
    AsyncStorage.setItem(op.key, op.value);

  if (Platform.OS === "ios") {
    await Promise.all(operations.map(write));
    return;
  }

  const batchSize = 5;
  for (let i = 0; i < operations.length; i += batchSize) {
    await Promise.all(operations.slice(i, i + batchSize).map(write));
    if (i + batchSize < operations.length) await sleep(10);
  }
}

/** Coalesce state updates into one render pass where the runtime allows it. */
export function batchStateUpdates(updates: Array<() => void>): void {
  if (updates.length === 0) return;

  const run = () => updates.forEach((update) => update());

  if (typeof React !== "undefined" && (React as any).startTransition) {
    (React as any).startTransition(run);
    return;
  }
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(run);
    return;
  }
  run();
}
