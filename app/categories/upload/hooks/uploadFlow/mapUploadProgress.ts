/**
 * Map backend upload-progress stages → FE UploadState + progress UX copy.
 */
import type { UploadState } from "../../types";

export type UploadProgressEvent = {
  uploadId: string;
  progress: number;
  stage: string;
  message?: string;
  timestamp?: string;
};

export function mapUploadProgressEvent(
  event: UploadProgressEvent
): Pick<UploadState, "status" | "progress" | "message"> {
  const stage = (event.stage || "").toLowerCase().trim();
  const progress = Math.max(0, Math.min(100, Math.round(Number(event.progress) || 0)));

  let status: UploadState["status"] = "verifying";
  if (stage === "complete") status = "success";
  else if (stage === "error" || stage === "rejected") status = "error";
  else if (
    stage === "received" ||
    stage === "uploading" ||
    stage === "finalizing"
  ) {
    status = "uploading";
  } else if (
    stage === "scanning" ||
    stage === "verifying" ||
    stage === "processing" ||
    stage === "moderating"
  ) {
    status = "verifying";
  }

  const message =
    (event.message && event.message.trim()) ||
    defaultMessageForStage(stage, status);

  return { status, progress, message };
}

function defaultMessageForStage(
  stage: string,
  status: UploadState["status"]
): string {
  switch (stage) {
    case "received":
      return "Upload received...";
    case "uploading":
      return "Uploading your file...";
    case "scanning":
    case "verifying":
    case "moderating":
      return "Verifying content...";
    case "processing":
      return "Processing media...";
    case "finalizing":
      return "Finalizing...";
    case "complete":
      return "Upload complete";
    case "rejected":
      return "Content needs a tweak";
    case "error":
      return "Upload failed";
    default:
      return status === "uploading"
        ? "Uploading..."
        : "Analyzing content...";
  }
}
