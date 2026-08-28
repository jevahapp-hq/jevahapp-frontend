import type { ModerationError, UploadResultState, UploadState } from "../../types";
import { buildErrorResult, buildModerationResult } from "../../components/UploadResultModal";
import {
  isGatewayTimeout,
  reconcileUploadOutcome,
} from "./reconcileUploadOutcome";

export function mapUploadNetworkError(error: unknown): string {
  const err = error as { name?: string; message?: string };
  // We aborted, so the server was never told to stop — it may still finish.
  if (err?.name === "AbortError" || err?.message?.includes("timeout")) {
    return "This took longer than we waited for. The upload may still be processing — check your profile before trying again.";
  }
  if (err?.message?.includes("Network request failed")) {
    return "Network connection failed. Please check your internet connection and try again.";
  }
  if (err?.message?.includes("fetch")) {
    return "Unable to connect to server. Please check your internet connection.";
  }
  return err?.message || "Something went wrong.";
}

export async function handleUploadHttpError(params: {
  res: Response;
  result: unknown;
  rawText: string | null;
  /** Same id sent as `X-Upload-ID`; lets us ask whether the write committed. */
  uploadId?: string;
  setModerationError: (v: ModerationError | null) => void;
  setUploadResult: (v: UploadResultState | null) => void;
  setUploadState: (v: UploadState) => void;
  /** Called when the upload actually succeeded behind a gateway timeout. */
  onLateSuccess?: (mediaId?: string) => void;
}): Promise<boolean> {
  const {
    res,
    result,
    rawText,
    uploadId,
    setModerationError,
    setUploadResult,
    setUploadState,
    onLateSuccess,
  } = params;

  /**
   * Gateway timeouts are the proxy talking, not the API. The upload may well
   * have completed, so reconcile before we say anything — otherwise we report a
   * false failure and the user re-uploads into a duplicate.
   *
   * These used to fall through to the generic branch below, which printed
   * "Unexpected response (504)." because nginx returns an HTML error page and
   * JSON parsing yields null.
   */
  if (isGatewayTimeout(res.status) && uploadId) {
    setUploadState({
      status: "verifying",
      progress: 95,
      message: "Server is taking a while — checking if your upload finished…",
    });

    const outcome = await reconcileUploadOutcome(uploadId);

    if (outcome.status === "completed") {
      onLateSuccess?.(outcome.mediaId);
      return true;
    }

    if (outcome.status === "processing") {
      setUploadResult(
        buildErrorResult(
          "Your upload is still processing on the server. It should appear in your profile shortly — please don't upload it again, or you'll end up with two copies.",
          "Still processing"
        )
      );
      setUploadState({ status: "idle", progress: 0, message: "" });
      return true;
    }

    if (outcome.status === "failed") {
      setUploadResult(
        buildErrorResult(
          outcome.message ||
            "The server couldn't finish this upload. Please try again.",
          "Upload failed"
        )
      );
      setUploadState({ status: "idle", progress: 0, message: "" });
      return true;
    }

    setUploadResult(
      buildErrorResult(
        "The server took too long to respond, so we couldn't confirm this upload. Check your profile first — if it isn't there, try again.",
        "Couldn't confirm upload"
      )
    );
    setUploadState({ status: "idle", progress: 0, message: "" });
    return true;
  }

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
