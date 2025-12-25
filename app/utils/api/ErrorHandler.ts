// Error handling utilities
export class ErrorHandler {
  static handleApiError(error: any): string {
    if (error.message?.includes("401") || error.message?.includes("402")) {
      return "Authentication required. Please sign in again.";
    }
    if (error.message?.includes("403")) {
      return "Access denied. You don't have permission for this action.";
    }
    if (error.message?.includes("404")) {
      return "Resource not found.";
    }
    if (error.message?.includes("500")) {
      return "Server error. Please try again later.";
    }
    if (error.message?.includes("Network")) {
      return "Network error. Please check your connection.";
    }
    return error.message || "An unexpected error occurred.";
  }

  static isNetworkError(error: any): boolean {
    return (
      error.message?.includes("Network") ||
      error.message?.includes("fetch") ||
      error.message?.includes("timeout")
    );
  }

  static isAuthError(error: any): boolean {
    return error.message?.includes("401") || error.message?.includes("402") || error.message?.includes("403");
  }
}

