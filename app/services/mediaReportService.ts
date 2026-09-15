import { API_BASE_URL } from "../utils/api";
import TokenUtils from "../utils/tokenUtils";
import { Platform } from "react-native";
import { resolveReportMediaId } from "./reportMediaId";

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

const VALID_REASONS = [
  "inappropriate_content",
  "non_gospel_content",
  "explicit_language",
  "violence",
  "sexual_content",
  "blasphemy",
  "spam",
  "copyright",
  "other",
] as const;

function createDuplicateError(message: string) {
  const duplicateError = new Error(message);
  (duplicateError as any).isDuplicateReport = true;
  return duplicateError;
}

function parseReportBody(rawText: string): any {
  if (!rawText) return {};
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function payloadMessage(payload: any, fallback: string): string {
  return (
    payload?.message ||
    payload?.error ||
    payload?.data?.message ||
    payload?.data?.error ||
    fallback
  );
}

/**
 * Report media content
 */
export const reportMedia = async (
  mediaId: string,
  reason: string,
  description?: string
): Promise<ReportMediaResponse> => {
  try {
    const id = resolveReportMediaId(mediaId);
    if (!id) {
      throw new Error("This content can't be reported right now.");
    }

    if (!VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
      throw new Error(`Invalid reason. Must be one of: ${VALID_REASONS.join(", ")}`);
    }

    const token = await TokenUtils.getAuthToken();
    if (!token) {
      throw new Error("Authentication required. Please log in to report content.");
    }

    const trimmedDescription = description?.trim();
    if (trimmedDescription && trimmedDescription.length > 1000) {
      throw new Error("Description cannot exceed 1000 characters");
    }

    const requestBody: { reason: string; description?: string } = { reason };
    if (trimmedDescription) {
      requestBody.description = trimmedDescription;
    }

    const url = `${API_BASE_URL}/api/media/${encodeURIComponent(id)}/report`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "expo-platform": Platform.OS,
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await response.text();
    const data = parseReportBody(rawText);
    const payload =
      data && typeof data === "object" && data.data && typeof data.data === "object"
        ? { ...data, ...data.data }
        : data || {};

    if (!response.ok) {
      const message = payloadMessage(payload, "Failed to report media.");
      if (response.status === 400 && message.toLowerCase().includes("already reported")) {
        throw createDuplicateError(message);
      }
      if (response.status === 401) {
        throw new Error("Please log in to report content.");
      }
      if (response.status === 404) {
        throw new Error("Media not found.");
      }
      throw new Error(message);
    }

    if (payload && payload.success === false) {
      const message = payloadMessage(payload, "Failed to report media.");
      if (message.toLowerCase().includes("already reported")) {
        throw createDuplicateError(message);
      }
      throw new Error(message);
    }

    return {
      success: true,
      message: payloadMessage(payload, "Report submitted"),
      report: payload.report || payload.data?.report,
    };
  } catch (error: any) {
    if (!(error as any).isDuplicateReport) {
      console.error("❌ Report Media Error:", {
        error: error.message,
        mediaId,
        reason,
      });
    }

    if (error.message) {
      throw error;
    }
    throw new Error("Network error. Please check your connection and try again.");
  }
};
