/**
 * Optional haptic feedback for scrub grant / release.
 */
import { useEffect, useRef } from "react";

export const useHaptics = (enabled: boolean) => {
  const hapticsRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      hapticsRef.current = require("expo-haptics");
    } catch {
      // Haptics unavailable
    }
  }, [enabled]);

  const trigger = (style: "light" | "medium" | "heavy" = "light") => {
    if (!hapticsRef.current) return;
    try {
      const ImpactFeedbackStyle = hapticsRef.current.ImpactFeedbackStyle;
      const styleMap = {
        light: ImpactFeedbackStyle.Light,
        medium: ImpactFeedbackStyle.Medium,
        heavy: ImpactFeedbackStyle.Heavy,
      };
      hapticsRef.current.impactAsync(styleMap[style]).catch(() => {});
    } catch {
      // no-op
    }
  };

  return { trigger };
};
