/**
 * Did the upload actually land?
 *
 * A 502/503/504 comes from the proxy in front of the API, not from the API
 * itself. It means "no answer within my timeout" — never "the work did not
 * happen". A big sermon video can easily still be finishing in Cloudinary and
 * moderation after nginx has given up, so treating a 504 as failure is wrong in
 * both directions: we tell the user it failed, and if they re-upload they get a
 * duplicate.
 *
 * We already stamp every attempt with `X-Upload-ID` and the backend exposes
 * `GET /api/media/upload/:uploadId/status`, so we can just ask.
 */
import TokenUtils from "../../../../utils/tokenUtils";
import { API_BASE_URL } from "../../constants";

/** How long we keep asking before telling the user to check for themselves. */
const RECONCILE_WINDOW_MS = 45000;
const RECONCILE_INTERVAL_MS = 3000;

export type UploadOutcome =
  /** Server confirms it finished; `mediaId` is live. */
  | { status: "completed"; mediaId?: string }
  /** Server confirms it failed; safe to retry. */
  | { status: "failed"; message?: string }
  /** Still working. Re-uploading now would duplicate. */
  | { status: "processing" }
  /** No status endpoint, or we never got a usable answer. */
  | { status: "unknown" };

function classify(stage?: string, progress?: number): UploadOutcome | null {
  const s = String(stage || "").toLowerCase();
  if (s.includes("complete") || s.includes("success") || s === "done") {
    return { status: "completed" };
  }
  if (s.includes("fail") || s.includes("error") || s.includes("reject")) {
    return { status: "failed" };
  }
  if (typeof progress === "number" && progress >= 100) {
    return { status: "completed" };
  }
  return null;
}

async function readStatusOnce(
  uploadId: string,
  token: string
): Promise<UploadOutcome> {
  const res = await fetch(
    `${API_BASE_URL}/api/media/upload/${encodeURIComponent(uploadId)}/status`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }
  );

  // Endpoint absent — nothing to reconcile against.
  if (res.status === 404 || res.status === 501) return { status: "unknown" };
  if (!res.ok) return { status: "unknown" };

  const json: any = await res.json().catch(() => null);
  const data = json?.data || json;
  if (!data || typeof data !== "object") return { status: "unknown" };

  const verdict = classify(data.stage, Number(data.progress));
  if (verdict?.status === "completed") {
    return { status: "completed", mediaId: data.mediaId };
  }
  if (verdict?.status === "failed") {
    return { status: "failed", message: data.message };
  }
  // A mediaId alone means the document exists, so the write committed.
  if (data.mediaId) return { status: "completed", mediaId: data.mediaId };
  return { status: "processing" };
}

/**
 * Poll the upload's status until it resolves or the window closes.
 * Never throws — a reconcile failure must not mask the original error.
 */
export async function reconcileUploadOutcome(
  uploadId: string
): Promise<UploadOutcome> {
  const deadline = Date.now() + RECONCILE_WINDOW_MS;

  try {
    const token = await TokenUtils.getAuthToken();
    if (!token) return { status: "unknown" };

    let sawProcessing = false;

    while (Date.now() < deadline) {
      const outcome = await readStatusOnce(uploadId, token).catch(
        () => ({ status: "unknown" }) as UploadOutcome
      );

      if (outcome.status === "completed" || outcome.status === "failed") {
        return outcome;
      }
      if (outcome.status === "processing") sawProcessing = true;

      await new Promise((r) => setTimeout(r, RECONCILE_INTERVAL_MS));
    }

    // Timed out while it was demonstrably still working.
    return sawProcessing ? { status: "processing" } : { status: "unknown" };
  } catch {
    return { status: "unknown" };
  }
}

/** True for statuses where the request may have succeeded despite the error. */
export function isGatewayTimeout(status: number): boolean {
  return status === 502 || status === 503 || status === 504 || status === 408;
}
