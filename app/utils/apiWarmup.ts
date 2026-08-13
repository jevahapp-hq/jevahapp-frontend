// API Warmup utility for Render cold starts
import { API_BASE_URL } from "./api";

/**
 * Render free tier instances sleep after 15 minutes of inactivity.
 * Cold starts can take 30-90 seconds. This function "wakes up" the backend
 * by making a lightweight request before user actions.
 */
/**
 * @param timeoutMs Cap wait so cold start never blocks on a sleeping host.
 * Default 3s — Render cold starts still benefit from fire-and-forget warmup.
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















