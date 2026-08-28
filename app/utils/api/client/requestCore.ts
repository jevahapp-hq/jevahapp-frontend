import { Platform } from "react-native";
import type { CacheManager } from "../../cache/CacheManager";
import { PerformanceOptimizer } from "../../performance";
import { enhancedFetch } from "../fetchUtils";
import { TokenManager } from "../TokenManager";
import { API_BASE_URL, CACHE_DURATION, FetchOptions } from "../types";
import type { TokenRefresher } from "./TokenRefresher";

export interface RequestDeps {
  cache: CacheManager;
  refresher: TokenRefresher;
}

/** Read `message` out of an error body, falling back to the HTTP status line. */
async function errorMessageFrom(
  response: Response
): Promise<{ message: string; body: unknown }> {
  const fallback = `HTTP ${response.status}: ${response.statusText}`;
  try {
    const body = await response.json();
    const message = (body as any)?.message;
    return { message: message || fallback, body };
  } catch {
    return { message: fallback, body: null };
  }
}

export function performRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {},
  deps: RequestDeps
): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    cache = false,
    cacheDuration = CACHE_DURATION,
  } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  const cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;

  const cacheIfGet = (data: any) => {
    if (cache && method === "GET") {
      deps.cache.set(cacheKey, data, cacheDuration);
    }
  };

  // Use performance optimizer for caching and request deduplication
  return PerformanceOptimizer.optimizedFetch(
    cacheKey,
    async () => {
      if (cache && method === "GET") {
        const cachedData = deps.cache.get(cacheKey);
        if (cachedData) return cachedData;
      }

      const token = await TokenManager.getToken();
      const requestHeaders: Record<string, string> = { ...headers };
      if (token) requestHeaders.Authorization = `Bearer ${token}`;
      requestHeaders["expo-platform"] = Platform.OS;

      const send = (authHeaders: Record<string, string>) =>
        enhancedFetch(url, {
          method,
          body,
          headers: authHeaders,
          ...options,
        });

      try {
        const response = await send(requestHeaders);

        // 402 is also used for auth failures by this backend.
        if ((response.status === 401 || response.status === 402) && token) {
          console.log(
            `🔄 Received ${response.status}, attempting token refresh...`
          );
          const newToken = await deps.refresher.refresh();

          if (!newToken) {
            // Refresh failed — only end session when policy says so
            const errBody = await response.text().catch(() => "");
            const { endSessionIfNeeded } = await import(
              "../../sessionExpired"
            );
            if (endSessionIfNeeded(response.status, errBody, "refresh")) {
              console.log(`❌ API: Token refresh failed, forcing logout`);
              throw new Error("Authentication failed. Please log in again.");
            }
            console.warn(
              `⚠️ API: ${response.status} + refresh failed (outage) — keeping session`
            );
            throw new Error(
              `HTTP ${response.status}: Backend temporarily unavailable`
            );
          }

          console.log(`🔄 Retrying request with new token: ${method} ${url}`);
          const retryResponse = await send({
            ...requestHeaders,
            Authorization: `Bearer ${newToken}`,
          });

          if (!retryResponse.ok) {
            console.error(
              `❌ API: HTTP ${retryResponse.status}: ${retryResponse.statusText}`
            );
            const { message } = await errorMessageFrom(retryResponse);
            throw new Error(message);
          }

          const retryData = await retryResponse.json();
          console.log(`✅ API: Response data after refresh:`, retryData);
          cacheIfGet(retryData);
          return retryData;
        }

        if (!response.ok) {
          const { message: errorMessage, body: errorBody } =
            await errorMessageFrom(response);

          const {
            isGuestNoTokenError,
            isTransientBackendAuthError,
            authFailureTextFromBody,
          } = await import("../../sessionExpired");
          const combined = authFailureTextFromBody(errorBody) || errorMessage;
          const softAuth =
            (response.status === 401 || response.status === 402) &&
            (!token ||
              isGuestNoTokenError(combined) ||
              isTransientBackendAuthError(combined));

          if (softAuth) {
            if (__DEV__) {
              console.warn(
                `⚠️ API: ${method} ${endpoint} → ${response.status} (expected / soft)`,
                combined
              );
            }
          } else {
            console.error(
              `❌ API: HTTP ${response.status}: ${response.statusText}`,
              combined
            );
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        cacheIfGet(data);
        return data;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const { isGuestNoTokenError, isTransientBackendAuthError } =
          await import("../../sessionExpired");
        if (isGuestNoTokenError(msg) || isTransientBackendAuthError(msg)) {
          if (__DEV__) {
            console.warn(`⚠️ API soft-fail: ${method} ${endpoint}`, msg);
          }
        } else {
          console.error(`API request failed: ${method} ${endpoint}`, error);
        }
        throw error;
      }
    },
    {
      cacheDuration: cache ? cacheDuration : 0,
      background: method === "GET", // Run GET requests in background
    }
  );
}
