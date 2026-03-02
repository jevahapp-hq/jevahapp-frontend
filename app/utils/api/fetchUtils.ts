import { Platform } from "react-native";
import { PerformanceMonitor } from "../performance";
import { FetchOptions } from "./types";

// Enhanced fetch with retry logic and timeout
export async function enhancedFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    method = "GET",
    body,
    headers = {},
    retryCount = 3,
    timeout = 8000, // Reduced timeout for faster response
  } = options;

  PerformanceMonitor.startTimer(`fetch-${method}-${url}`);

  let lastError: Error;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    // Create a fresh controller and timeout per attempt to avoid reusing aborted signals
    const controller = new AbortController();
    const attemptTimeoutId = setTimeout(() => controller.abort(), timeout);

    // Build fetch options per attempt so we attach the fresh signal
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
        ...headers,
      },
      signal: controller.signal,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(attemptTimeoutId);
      PerformanceMonitor.endTimer(`fetch-${method}-${url}`);
      return response;
    } catch (error) {
      clearTimeout(attemptTimeoutId);
      lastError = error as Error;
      console.warn(`Fetch attempt ${attempt} failed:`, error);

      if (attempt === retryCount) {
        PerformanceMonitor.endTimer(`fetch-${method}-${url}`);
        throw lastError;
      }

      // Reduced wait time for faster retry
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(1.5, attempt) * 500)
      );
    }
  }

  throw lastError!;
}

