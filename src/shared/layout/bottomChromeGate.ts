/**
 * BottomNav instances retain this while mounted so the root Create FAB
 * (Upload / Go Live) only shows on screens that actually have chrome.
 */
const listeners = new Set<() => void>();
let mounted = 0;

function emit(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // no-op
    }
  });
}

export function retainBottomChrome(): void {
  mounted += 1;
  emit();
}

export function releaseBottomChrome(): void {
  mounted = Math.max(0, mounted - 1);
  emit();
}

export function isBottomChromeMounted(): boolean {
  return mounted > 0;
}

export function subscribeBottomChrome(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
