/**
 * fetch() ignores a `timeout` field on RequestInit. AbortController is the
 * supported way to bound request duration.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));

  const parent = init.signal;
  const onParentAbort = () => controller.abort();
  if (parent) {
    if (parent.aborted) {
      clearTimeout(timeoutId);
      controller.abort();
    } else {
      parent.addEventListener("abort", onParentAbort, { once: true });
    }
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    parent?.removeEventListener("abort", onParentAbort);
  }
}
