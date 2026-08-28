import { useCallback, useState } from "react";
import { Animated } from "react-native";
import dailyVerseService, { DailyVerse } from "../services/dailyVerseService";

/**
 * The daily verse is picked from a bundled table, so it resolves synchronously
 * on first render. `loading` only ever becomes true for an explicit retry.
 */
export const useDailyVerse = () => {
  const [currentVerse, setCurrentVerse] = useState<DailyVerse | null>(() => {
    try {
      return dailyVerseService.getTodaysVerse();
    } catch (error) {
      console.error("Failed to load daily verse:", error);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(1));

  const loadTodaysVerse = useCallback(() => {
    setLoading(true);
    try {
      setCurrentVerse(dailyVerseService.getTodaysVerse());
    } catch (error) {
      console.error("Failed to load daily verse:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    currentVerse,
    loading,
    fadeAnim,
    loadTodaysVerse,
  };
};
