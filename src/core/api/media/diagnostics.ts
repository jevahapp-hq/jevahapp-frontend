import { API_CONFIG } from "../../../shared/constants";
import { apiClient } from "../ApiClient";

/** Dev helper: report which content endpoints a deployment exposes. */
export async function testAvailableEndpoints(): Promise<{
  available: string[];
  unavailable: string[];
}> {
  const endpoints = [
    { name: "All Content Public", path: API_CONFIG.ENDPOINTS.ALL_CONTENT },
    { name: "All Content Auth", path: API_CONFIG.ENDPOINTS.ALL_CONTENT_AUTH },
    { name: "Default Content", path: API_CONFIG.ENDPOINTS.DEFAULT_CONTENT },
  ];

  const available: string[] = [];
  const unavailable: string[] = [];

  for (const endpoint of endpoints) {
    try {
      const isAvailable = await apiClient.testEndpoint(endpoint.path);
      (isAvailable ? available : unavailable).push(endpoint.name);
    } catch {
      unavailable.push(endpoint.name);
    }
  }

  console.log("🔍 Endpoint availability test:", { available, unavailable });
  return { available, unavailable };
}
