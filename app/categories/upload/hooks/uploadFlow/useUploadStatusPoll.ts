/**
 * Poll upload status when Socket.IO is quiet (BE optional endpoint).
 * Soft-fails on 404 — simulated progress continues until HTTP completes.
 *
 * Contract (BE 2026-08-02):
 * GET /api/media/upload/:uploadId/status
 * → { success, data: { uploadId, progress, stage, message, mediaId, timestamp } }
 */

import { useCallback, useRef } from "react";
import TokenUtils from "../../../../utils/tokenUtils";
import { API_BASE_URL } from "../../constants";
import type { UploadState } from "../../types";
import {
  mapUploadProgressEvent,
  type UploadProgressEvent,
} from "./mapUploadProgress";

const POLL_MS = 800;
const QUIET_BEFORE_POLL_MS = 3000;

export function useUploadStatusPoll(
  setUploadState: (
    v: UploadState | ((prev: UploadState) => UploadState)
  ) => void,
  stopSimulated: () => void,
  isUsingRealTimeProgressRef: { current: boolean }
) {
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endpointMissingRef = useRef(false);
  const lastEventAtRef = useRef(0);
  const activeUploadIdRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (quietTimerRef.current) {
      clearTimeout(quietTimerRef.current);
      quietTimerRef.current = null;
    }
  }, []);

  const stopPoll = useCallback(() => {
    clearTimers();
    activeUploadIdRef.current = null;
  }, [clearTimers]);

  const applyProgressEvent = useCallback(
    (event: UploadProgressEvent) => {
      lastEventAtRef.current = Date.now();
      isUsingRealTimeProgressRef.current = true;
      stopSimulated();

      const mapped = mapUploadProgressEvent(event);
      setUploadState((prev) => ({
        status: mapped.status,
        progress: Math.max(prev.progress || 0, mapped.progress),
        message: mapped.message,
      }));

      return mapped;
    },
    [isUsingRealTimeProgressRef, setUploadState, stopSimulated]
  );

  const beginPolling = useCallback(
    (uploadId: string) => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      pollTimerRef.current = setInterval(async () => {
        if (endpointMissingRef.current) {
          stopPoll();
          return;
        }
        if (Date.now() - lastEventAtRef.current < QUIET_BEFORE_POLL_MS) {
          return;
        }

        try {
          const token = await TokenUtils.getAuthToken();
          if (!token) return;

          const res = await fetch(
            `${API_BASE_URL}/api/media/upload/${encodeURIComponent(uploadId)}/status`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            }
          );

          if (res.status === 404) {
            endpointMissingRef.current = true;
            stopPoll();
            if (__DEV__) {
              console.warn(
                "⚠️ Upload status poll 404 — BE endpoint not ready; using socket/sim"
              );
            }
            return;
          }

          if (!res.ok) return;

          const json = (await res.json().catch(() => null)) as
            | { success?: boolean; data?: UploadProgressEvent }
            | UploadProgressEvent
            | null;

          const event: UploadProgressEvent | null =
            json &&
            typeof json === "object" &&
            "data" in json &&
            (json as { data?: UploadProgressEvent }).data?.uploadId
              ? (json as { data: UploadProgressEvent }).data
              : json &&
                  typeof json === "object" &&
                  "uploadId" in json &&
                  (json as UploadProgressEvent).uploadId
                ? (json as UploadProgressEvent)
                : null;

          if (!event || event.uploadId !== uploadId) return;

          const mapped = applyProgressEvent(event);

          if (
            mapped.status === "success" ||
            mapped.status === "error" ||
            mapped.progress >= 100
          ) {
            stopPoll();
          }
        } catch {
          // Network blip — keep trying until cleanup
        }
      }, POLL_MS);
    },
    [applyProgressEvent, stopPoll]
  );

  const scheduleQuietPoll = useCallback(
    (uploadId: string) => {
      if (quietTimerRef.current) {
        clearTimeout(quietTimerRef.current);
        quietTimerRef.current = null;
      }
      if (endpointMissingRef.current) return;

      quietTimerRef.current = setTimeout(() => {
        if (endpointMissingRef.current) return;
        if (activeUploadIdRef.current !== uploadId) return;

        // Socket still hot — wait another quiet window
        if (Date.now() - lastEventAtRef.current < QUIET_BEFORE_POLL_MS) {
          scheduleQuietPoll(uploadId);
          return;
        }

        beginPolling(uploadId);
      }, QUIET_BEFORE_POLL_MS);
    },
    [beginPolling]
  );

  /** Call on every real socket/poll progress event (stops sim; re-arms quiet→poll). */
  const markRealtimeEvent = useCallback(
    (uploadId?: string) => {
      lastEventAtRef.current = Date.now();
      isUsingRealTimeProgressRef.current = true;
      stopSimulated();

      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }

      const id = uploadId || activeUploadIdRef.current;
      if (id && !endpointMissingRef.current) {
        scheduleQuietPoll(id);
      }
    },
    [isUsingRealTimeProgressRef, scheduleQuietPoll, stopSimulated]
  );

  const startPoll = useCallback(
    (uploadId: string) => {
      clearTimers();
      endpointMissingRef.current = false;
      activeUploadIdRef.current = uploadId;
      lastEventAtRef.current = Date.now();
      scheduleQuietPoll(uploadId);
    },
    [clearTimers, scheduleQuietPoll]
  );

  return { startPoll, stopPoll, markRealtimeEvent };
}
