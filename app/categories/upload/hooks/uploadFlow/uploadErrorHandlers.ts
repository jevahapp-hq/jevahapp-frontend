import type { ModerationError, UploadResultState, UploadState } from "../../types";
import { buildErrorResult, buildModerationResult } from "../../components/UploadResultModal";

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
  setModerationError: (v: ModerationError | null) => void;
  setUploadResult: (v: UploadResultState | null) => void;
  setUploadState: (v: UploadState) => void;
}): Promise<boolean> {
  const { res, result, rawText, setModerationError, setUploadResult, setUploadState } =
    params;

  if (res.status === 413) {
    setUploadResult(
      buildErrorResult(
        "The file exceeds the server's size limit. Choose a smaller file or compress your media.",
        "File too large"
      )
    );
    setUploadState({ status: "idle", progress: 0, message: "" });
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
    const moderation: ModerationError = {
      message:
        body.message || "Content does not meet our community guidelines.",
      reason: moderationResult.reason,
      flags: moderationResult.flags || [],
      status: moderationResult.status,
    };

    setModerationError(moderation);
    setUploadResult(buildModerationResult(moderation));
    setUploadState({ status: "idle", progress: 0, message: "" });
    return true;
  }

  const body = result as { message?: string; error?: string } | null;
  const message =
    (body && (body.message || body.error)) ||
    (rawText ? `Unexpected response (${res.status}).` : `HTTP ${res.status}`);

  setUploadResult(buildErrorResult(message || "Please try again."));
  setUploadState({ status: "idle", progress: 0, message: "" });
  return true;
}

export function handleUploadParseFailure(
  setUploadResult: (v: UploadResultState | null) => void
) {
  setUploadResult(
    buildErrorResult(
      "Server returned an unexpected response. Please try again."
    )
  );
}
