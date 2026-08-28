// API warmup: opens the TLS/HTTP connection before the first real request.
import { API_BASE_URL } from "./api";

/**
 * The backend runs on a VPS and does not sleep, so this is not a cold-start
 * workaround. It exists to pay the DNS + TLS handshake cost up front, which
 * is worth doing when the single origin region is far from most users.
 *
 * @param timeoutMs Cap the wait so startup never blocks on an unreachable host.
 */
export async function warmupBackend(timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 404) {
      if (__DEV__) console.log("✅ Backend warmed up successfully");
      return true;
    }

    if (__DEV__) {
      console.warn("⚠️ Backend warmup returned non-200 status:", response.status);
    }
    return false;
  } catch (error: any) {
    if (error.name === "AbortError") {
      if (__DEV__) {
        console.warn(`⚠️ Backend warmup timed out after ${timeoutMs}ms`);
      }
      return false;
    }
    if (__DEV__) console.warn("❌ Backend warmup failed:", error.message);
    return false;
  }
}

/**
 * Warmup with retry - useful for critical app startup paths
 */
export async function warmupBackendWithRetry(maxRetries = 2): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Backend warmup attempt ${attempt}/${maxRetries}`);
    const success = await warmupBackend();
    if (success) return true;

    // Wait before retry (except on last attempt)
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.error("❌ Backend warmup failed after all retries");
  return false;
}

/**
 * Schedule periodic warming to prevent sleep during active use
 */
let warmupInterval: NodeJS.Timeout | null = null;

export function startPeriodicWarmup(intervalMinutes = 10): void {
  stopPeriodicWarmup(); // Clear any existing interval

  // Warm up immediately
  warmupBackend();

  // Then schedule periodic warming
  warmupInterval = setInterval(() => {
    console.log("🔄 Periodic backend warmup triggered");
    warmupBackend();
  }, intervalMinutes * 60 * 1000);

  console.log(
    `✅ Started periodic backend warmup every ${intervalMinutes} minutes`
  );
}

export function stopPeriodicWarmup(): void {
  if (warmupInterval) {
    clearInterval(warmupInterval);
    warmupInterval = null;
    console.log("⏹️ Stopped periodic backend warmup");
  }
}















