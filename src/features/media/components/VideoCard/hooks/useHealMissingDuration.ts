/**
 * One-shot detail refetch when a ready card is missing duration
 * (rare probe miss / stale feed). Seeds session cache so seek can enable.
 */
import { useEffect, useRef, useState } from "react";
import { mediaApi } from "../../../../../core/api/MediaApi";
import { setCachedDurationMs } from "../player/durationCache";
import { normalizeDurationToMs } from "../player/normalizeDuration";

export function useHealMissingDuration(params: {
  mediaId?: string | null;
  durationSec?: number | null;
  processingStatus?: string | null;
  enabled?: boolean;
}): number {
  const { mediaId, durationSec, processingStatus, enabled = true } = params;
  const [healedMs, setHealedMs] = useState(0);
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    const id = String(mediaId || "").trim();
    if (!enabled || !id) return;

    const known = Number(durationSec) || 0;
    if (known >= 0.5) return;

    const status = String(processingStatus || "").toLowerCase();
    // Skip while still processing / failed — upload poll handles that path.
    if (status === "processing" || status === "pending" || status === "failed") {
      return;
    }

    if (attemptedRef.current === id) return;
    attemptedRef.current = id;

    let cancelled = false;
    void (async () => {
      const res = await mediaApi.getMediaById(id);
      if (cancelled || !res.success || !res.data) return;
      const ms = normalizeDurationToMs((res.data as any).duration);
      if (ms < 500) return;
      setCachedDurationMs(id, ms);
      if (!cancelled) setHealedMs(ms);
      if (__DEV__) {
        console.log("[VideoCard] healed duration from detail", {
          id,
          duration: (res.data as any).duration,
          processingStatus: (res.data as any).processingStatus,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mediaId, durationSec, processingStatus, enabled]);

  return healedMs;
}
