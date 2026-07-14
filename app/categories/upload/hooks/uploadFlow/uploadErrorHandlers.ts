import { Alert } from "react-native";
import type { UploadState } from "../../types";
import { formatFriendlyRejectionMessage } from "../../utils";

type NotificationFn = (opts: {
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
}) => void;

export function mapUploadNetworkError(error: unknown): string {
  const err = error as { name?: string; message?: string };
  if (err?.name === "AbortError") return "Request timed out. Please try again.";
  if (err?.message?.includes("Network request failed")) {
    return "Network connection failed. Please check your internet connection and try again.";
  }
  if (err?.message?.includes("timeout")) return "Request timed out. Please try again.";
  if (err?.message?.includes("fetch")) {
    return "Unable to connect to server. Please check your internet connection.";
  }
  return err?.message || "Something went wrong.";
}

export async function handleUploadHttpError(params: {
  res: Response;
  result: unknown;
  rawText: string | null;
  showNotification: NotificationFn;
  setModerationError: (v: {
    message: string;
    reason?: string;
    flags?: string[];
    status?: string;
  } | null) => void;
  setUploadState: (v: UploadState) => void;
}): Promise<boolean> {
  const { res, result, rawText, showNotification, setModerationError, setUploadState } =
    params;

  if (res.status === 413) {
    showNotification({
      type: "warning",
      title: "File too large",
      message:
        "The file exceeds the server's size limit. Please choose a smaller file or compress your media.",
      duration: 5000,
    });
    return true;
  }

  if (res.status === 403 && result && typeof result === "object") {
    const body = result as {
      message?: string;
      moderationResult?: {
        status?: string;
        reason?: string;
        flags?: string[];
      };
    };
    const moderationResult = body.moderationResult || {};
    const errorMessage =
      body.message || "Content does not meet our community guidelines.";
    const friendly = formatFriendlyRejectionMessage(
      moderationResult.status,
      moderationResult.reason,
      moderationResult.flags,
      errorMessage
    );

    showNotification({
      type: friendly.isReview ? "info" : "warning",
      title: friendly.title,
      message: friendly.message,
      duration: 6000,
    });

    setModerationError({
      message: errorMessage,
      reason: moderationResult.reason,
      flags: moderationResult.flags || [],
      status: moderationResult.status,
    });
    setUploadState({ status: "idle", progress: 0, message: "" });
    return true;
  }

  const body = result as { message?: string; error?: string } | null;
  const message =
    (body && (body.message || body.error)) ||
    (rawText ? `Unexpected response (${res.status}).` : `HTTP ${res.status}`);

  showNotification({
    type: "error",
    title: "Upload failed",
    message: message || "Please try again.",
    duration: 5000,
  });
  return true;
}

export function handleUploadParseFailure() {
  Alert.alert(
    "Upload failed",
    "Server returned unexpected response. Please try again."
  );
}
