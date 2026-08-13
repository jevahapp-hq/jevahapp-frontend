import TokenUtils from "../tokenUtils";

/** Thin facade — prefer TokenUtils / sessionAuth directly. */
export class TokenManager {
  static getToken(): Promise<string | null> {
    return TokenUtils.getAuthToken();
  }

  static setToken(token: string): Promise<void> {
    return TokenUtils.storeAuthToken(token);
  }

  static clearToken(): Promise<void> {
    return TokenUtils.clearAuthTokens();
  }
}
