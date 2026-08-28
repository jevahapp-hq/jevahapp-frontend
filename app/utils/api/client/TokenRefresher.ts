import { enhancedFetch } from "../fetchUtils";
import { TokenManager } from "../TokenManager";
import { API_BASE_URL } from "../types";

/**
 * Owns the token-refresh handshake and collapses concurrent refreshes into a
 * single in-flight request. One instance per ApiClient, so separate clients do
 * not share refresh state.
 */
export class TokenRefresher {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  refresh(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.run().finally(() => {
      this.isRefreshing = false;
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async run(): Promise<string | null> {
    try {
      const currentToken = await TokenManager.getToken();
      if (!currentToken) {
        console.log("🔄 No token to refresh");
        return null;
      }

      console.log("🔄 Attempting to refresh token...");

      const refreshResponse = await enhancedFetch(
        `${API_BASE_URL}/api/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ token: currentToken }),
        }
      );

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text().catch(() => "");
        console.log(
          `🔄 Token refresh failed: ${refreshResponse.status}`,
          errorText
        );

        // IG/TikTok: end session only when refresh proves identity is dead
        if (refreshResponse.status === 401 || refreshResponse.status === 402) {
          const { endSessionIfNeeded } = await import("../../sessionExpired");
          if (
            endSessionIfNeeded(refreshResponse.status, errorText, "refresh")
          ) {
            console.log("🔄 Session expired, tokens cleared");
          } else {
            console.warn(
              "⚠️ Token refresh 401 looks like outage — keeping session"
            );
          }
        }

        return null;
      }

      const refreshData = await refreshResponse.json();
      const newToken = refreshData?.data?.token || refreshData?.token || null;

      if (!newToken) {
        console.log("🔄 Token refresh succeeded but no token in response");
        return null;
      }

      // Valid JWTs have three dot-separated parts.
      if (newToken.split(".").length !== 3) {
        console.log("🔄 New token has invalid format");
        return null;
      }

      await TokenManager.setToken(newToken);
      console.log("✅ Token refreshed successfully");

      return newToken;
    } catch (error) {
      console.log("🔄 Token refresh error:", error);
      return null;
    }
  }
}
