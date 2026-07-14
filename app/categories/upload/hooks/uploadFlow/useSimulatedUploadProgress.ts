import { useCallback, useRef } from "react";
import type { UploadState } from "../../types";

export function useSimulatedUploadProgress(
  setUploadState: (
    v: UploadState | ((prev: UploadState) => UploadState)
  ) => void
) {
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const stopSimulated = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startSimulated = useCallback(() => {
    stopSimulated();
    let currentProgress = 10;
    progressIntervalRef.current = setInterval(() => {
      currentProgress = Math.min(currentProgress + Math.random() * 3 + 1, 85);
      setUploadState((prev) => ({
        ...prev,
        progress: Math.round(currentProgress),
      }));
    }, 500);
  }, [setUploadState, stopSimulated]);

  return { startSimulated, stopSimulated, progressIntervalRef };
}
