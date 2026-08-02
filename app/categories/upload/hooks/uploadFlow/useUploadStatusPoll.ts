/**
 * Poll upload status when Socket.IO is quiet (BE optional endpoint).
 * Soft-fails on 404 — simulated progress continues until HTTP completes.
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

  const stopPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (quietTimerRef.current) {
      clearTimeout(quietTimerRef.current);
      quietTimerRef.current = null;
    }
  }, []);

  const markRealtimeEvent = useCallback(() => {
    lastEventAtRef.current = Date.now();
    isUsingRealTimeProgressRef.current = true;
    stopSimulated();
    // Keep polling off while socket is healthy
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, [isUsingRealTimeProgressRef, stopSimulated]);

  const startPoll = useCallback(
    (uploadId: string) => {
      stopPoll();
      endpointMissingRef.current = false;
      lastEventAtRef.current = Date.now();

      quietTimerRef.current = setTimeout(() => {
        if (endpointMissingRef.current) return;
        if (isUsingRealTimeProgressRef.current && Date.now() - lastEventAtRef.current < QUIET_BEFORE_POLL_MS) {
          return;
        }

        pollTimerRef.current = setInterval(async () => {
          if (endpointMissingRef.current) {
            stopPoll();
            return;
          }
          // If socket just fired, skip this tick
          if (
            isUsingRealTimeProgressRef.current &&
            Date.now() - lastEventAtRef.current < QUIET_BEFORE_POLL_MS
          ) {
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
              | UploadProgressEvent
              | { data?: UploadProgressEvent }
              | null;
            const event =
              (json as any)?.uploadId
                ? (json as UploadProgressEvent)
                : (json as any)?.data?.uploadId
                  ? ((json as any).data as UploadProgressEvent)
                  : null;

            if (!event || event.uploadId !== uploadId) return;

            markRealtimeEvent();
            const mapped = mapUploadProgressEvent(event);
            setUploadState({
              status: mapped.status,
              progress: mapped.progress,
              message: mapped.message,
            });

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
      }, QUIET_BEFORE_POLL_MS);
    },
    [
      isUsingRealTimeProgressRef,
      markRealtimeEvent,
      setUploadState,
      stopPoll,
    ]
  );

  return { startPoll, stopPoll, markRealtimeEvent };
}
