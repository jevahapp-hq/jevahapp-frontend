import { apiLog, apiWarn, baseUrl, errorMessageOf } from "./http";

export interface ServerHealth {
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
}

export async function checkServerHealth(): Promise<ServerHealth> {
  const startTime = Date.now();

  try {
    const healthResponse = await fetch(`${baseUrl()}/health`, {
      method: "GET",
    });

    if (healthResponse.ok) {
      return { isHealthy: true, responseTime: Date.now() - startTime };
    }

    // Older deployments may not expose /health.
    const apiResponse = await fetch(`${baseUrl()}/api`, { method: "GET" });

    return {
      isHealthy: apiResponse.ok,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    apiWarn("Server health check failed:", error);
    return {
      isHealthy: false,
      responseTime: Date.now() - startTime,
      error: errorMessageOf(error),
    };
  }
}

/** Dev helper for probing which content endpoints a deployment exposes. */
export async function testAvailableEndpoints(): Promise<void> {
  if (__DEV__) {
    apiLog("🧪 Testing available endpoints...");
    apiLog("🌐 Base URL:", baseUrl());
  }

  try {
    const endpoints = [
      "/api/media/public/all-content",
      "/api/media/all-content",
      "/api/media/default",
      "/api/media",
    ];

    for (const endpoint of endpoints) {
      apiLog(`🔍 Testing ${endpoint}...`);
      const response = await fetch(`${baseUrl()}${endpoint}?page=1&limit=1`);
      if (__DEV__) apiLog(`📡 ${endpoint} status:`, response.status);

      if (response.ok) {
        apiLog(`✅ ${endpoint} response:`, await response.json());
      } else if (__DEV__) {
        apiLog(`❌ ${endpoint} error:`, await response.text());
      }
    }
  } catch (error) {
    if (__DEV__) console.error("❌ Endpoint test failed:", error);
  }
}
