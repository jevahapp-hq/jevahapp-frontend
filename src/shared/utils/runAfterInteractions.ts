type IdleTask = { cancel: () => void };

/**
 * Replacement for deprecated InteractionManager.runAfterInteractions.
 * Prefers requestIdleCallback; falls back to a short timeout.
 */
export function runAfterInteractions(task: () => void): IdleTask {
  const ric = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    }
  ).requestIdleCallback;
  const cancelIdle = (
    globalThis as typeof globalThis & {
      cancelIdleCallback?: (id: number) => void;
    }
  ).cancelIdleCallback;

  if (typeof ric === "function") {
    const id = ric(() => task());
    return {
      cancel: () => {
        cancelIdle?.(id);
      },
    };
  }

  const timeout = setTimeout(task, 1);
  return { cancel: () => clearTimeout(timeout) };
}
