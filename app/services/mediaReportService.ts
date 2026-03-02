import { API_BASE_URL } from "../utils/api";
import TokenUtils from "../utils/tokenUtils";

export interface ReportMediaRequest {
  reason: string;
  description?: string;
}

export interface ReportMediaResponse {
  success: boolean;
  message: string;
  report?: {
    _id: string;
    mediaId: string;
    reason: string;
    status: string;
    createdAt: string;
  };
}

/**
 * Report media content
 * @param mediaId - The ID of the media to report (MongoDB ObjectId)
 * @param reason - The reason for reporting (required, must be one of the valid enum values)
 * @param description - Optional description (max 1000 characters)
 * @returns Promise with report response
 */
export const reportMedia = async (
  mediaId: string,
  reason: string,
  description?: string
): Promise<ReportMediaResponse> => {
  try {
    // Validate mediaId format (should be MongoDB ObjectId - 24 hex characters)
    if (!mediaId || typeof mediaId !== "string" || mediaId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(mediaId)) {
      throw new Error("Invalid media ID format");
    }

    // Validate reason is one of the valid enum values
    const validReasons = [
      "inappropriate_content",
      "non_gospel_content",
      "explicit_language",
      "violence",
      "sexual_content",
      "blasphemy",
      "spam",
      "copyright",
      "other"
    ];
    
    if (!validReasons.includes(reason)) {
      throw new Error(`Invalid reason. Must be one of: ${validReasons.join(", ")}`);
    }

    // Get auth token using TokenUtils (checks all sources: AsyncStorage + SecureStore)
    const token = await TokenUtils.getAuthToken();

    if (!token) {
      throw new Error("Authentication required. Please log in to report content.");
    }

    // Validate description length if provided
    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 1000) {
      throw new Error("Description cannot exceed 1000 characters");
    }

    // Build request body - only include description if it's not empty
    const requestBody: { reason: string; description?: string } = {
      reason,
    };
    
    if (trimmedDescription && trimmedDescription.length > 0) {
      requestBody.description = trimmedDescription;
    }

    const url = `${API_BASE_URL}/api/media/${mediaId}/report`;

    console.log("📧 Report Media Request:", {
      url,
      mediaId,
      reason,
      hasDescription: !!trimmedDescription,
      descriptionLength: trimmedDescription?.length || 0,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : "none",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log("📧 Report Media Response:", {
      status: response.status,
      success: data.success,
      message: data.message,
      hasReport: !!data.report,
    });

    // Helper function to create duplicate report error (graceful handling)
    const createDuplicateError = (message: string) => {
      const duplicateError = new Error(message);
      (duplicateError as any).isDuplicateReport = true;
      return duplicateError;
    };

    if (!response.ok) {
      // Handle specific error responses
      if (response.status === 400) {
        // Check if it's a duplicate report (graceful handling)
        if (data.message && data.message.toLowerCase().includes("already reported")) {
          throw createDuplicateError(data.message);
        }
        throw new Error(
          data.message || "Invalid request. Please check your input."
        );
      } else if (response.status === 401) {
        throw new Error("Please log in to report content.");
      } else if (response.status === 404) {
        throw new Error("Media not found.");
      } else {
        throw new Error(data.message || "Failed to report media.");
      }
    }

    if (!data.success) {
      // Check if it's a duplicate report in the response data
      if (data.message && data.message.toLowerCase().includes("already reported")) {
        throw createDuplicateError(data.message);
      }
      throw new Error(data.message || "Failed to report media.");
    }

    // Log success for debugging
    console.log("✅ Report submitted successfully:", {
      reportId: data.report?._id,
      mediaId: data.report?.mediaId,
      reason: data.report?.reason,
      status: data.report?.status,
    });

    return data;
  } catch (error: any) {
    // Only log as error if it's not a duplicate report (graceful case)
    if (!(error as any).isDuplicateReport) {
      console.error("❌ Report Media Error:", {
        error: error.message,
        mediaId,
        reason,
      });
    } else {
      // Log duplicate reports as info, not error
      console.log("ℹ️ Duplicate report attempt:", {
        mediaId,
        reason,
      });
    }
    
    // Re-throw with proper error message
    if (error.message) {
      throw error;
    }
    throw new Error("Network error. Please check your connection and try again.");
  }
};







