/**
 * Progress bar UI state (drag / seek hold / measured width).
 */
import { useState } from "react";
import type { ProgressBarState } from "./types";
import { debugLog } from "./utils";

export const useProgressBarState = (
  _config?: unknown,
  debug: boolean = false
) => {
  const [state, setState] = useState<ProgressBarState>({
    isDragging: false,
    isSeeking: false,
    dragProgress: 0,
    targetProgress: null,
    stableTicks: 0,
    barWidth: 0,
  });

  const updateState = (updates: Partial<ProgressBarState>) => {
    setState((prev) => ({ ...prev, ...updates }));
    debugLog("State updated", updates, debug);
  };

  return { state, updateState };
};
