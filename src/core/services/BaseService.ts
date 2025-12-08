/**
 * Base Service Class
 * All API services should extend this class to avoid code duplication
 */

import { ApiResponse } from "../../shared/types";
import { BaseApiClient } from "../api/BaseApiClient";

export abstract class BaseService extends BaseApiClient {
  /**
   * Map content type to backend format
   */
  protected mapContentTypeToBackend(
    contentType: string
  ): string {
    const mapping: Record<string, string> = {
      media: "media",
      videos: "media",
      video: "media",
      devotional: "devotional",
      ebook: "ebook",
      sermon: "sermon",
    };

    return mapping[contentType.toLowerCase()] || contentType;
  }

  /**
   * Validate MongoDB ObjectId format
   */
  protected isValidObjectId(id?: string): boolean {
    return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
  }

  /**
   * Extract data from API response
   * Handles different response formats
   */
  protected extractData<T>(response: ApiResponse<T>): T | null {
    if (!response.success) {
      return null;
    }

    // Handle nested data structure
    if (response.data && typeof response.data === "object") {
      // If response.data has a data property, use that
      if ("data" in response.data) {
        return (response.data as any).data as T;
      }
    }

    return response.data;
  }

  /**
   * Handle API errors consistently
   */
  protected handleError(error: any, context: string): ApiResponse<never> {
    console.error(`Error in ${context}:`, error);

    let errorMessage = "An error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }

  /**
   * Build query string from params
   */
  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
  }
}

export default BaseService;

