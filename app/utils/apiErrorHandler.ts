// API Error Handler Utility

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

export class ApiErrorHandler {
  static handle(error: any): ApiError {
    // Network error
    if (!error.response && !error.status) {
      return {
        success: false,
        error: "Network error. Please check your connection.",
        code: "NETWORK_ERROR",
      };
    }

    // Server error response
    const status = error.status || error.response?.status;
    const data = error.response?.data || error;

    // Handle specific status codes
    switch (status) {
      case 400:
        return {
          success: false,
          error: data?.error || "Invalid request. Please check your input.",
          code: data?.code || "VALIDATION_ERROR",
          details: data?.details,
        };

      case 401:
        return {
          success: false,
          error: "Unauthorized. Please login again.",
          code: "UNAUTHORIZED",
        };

      case 402:
        return {
          success: false,
          error: "Authentication failed. Please login again.",
          code: "AUTHENTICATION_FAILED",
        };

      case 403:
        return {
          success: false,
          error:
            data?.error ||
            "You do not have permission to perform this action.",
          code: "FORBIDDEN",
        };

      case 404:
        return {
          success: false,
          error: data?.error || "Resource not found.",
          code: "NOT_FOUND",
        };

      case 409:
        return {
          success: false,
          error: data?.error || "Conflict. Resource already exists.",
          code: "CONFLICT",
        };

      case 429:
        return {
          success: false,
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        };

      case 500:
      case 502:
      case 503:
        return {
          success: false,
          error: "Server error. Please try again later.",
          code: "SERVER_ERROR",
        };

      default:
        return {
          success: false,
          error: data?.error || "An unexpected error occurred.",
          code: data?.code || "UNKNOWN_ERROR",
          details: data?.details,
        };
    }
  }

  static showError(
    error: ApiError,
    showToast?: (message: string) => void
  ): void {
    if (showToast) {
      showToast(error.error);
    } else {
      console.error("API Error:", error);
    }
  }

  static isNetworkError(error: ApiError): boolean {
    return error.code === "NETWORK_ERROR";
  }

  static isAuthError(error: ApiError): boolean {
    return error.code === "UNAUTHORIZED" || error.code === "AUTHENTICATION_FAILED" || error.code === "FORBIDDEN";
  }

  static isValidationError(error: ApiError): boolean {
    return error.code === "VALIDATION_ERROR";
  }

  static isNotFoundError(error: ApiError): boolean {
    return error.code === "NOT_FOUND";
  }
}

