import { useEffect, useState } from "react";
import { Animated } from "react-native";
import dailyVerseService, { DailyVerse } from "../services/dailyVerseService";

export const useDailyVerse = () => {
  const [currentVerse, setCurrentVerse] = useState<DailyVerse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));

  const loadTodaysVerse = async () => {
    try {
      setLoading(true);
      // Simulate a small delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500));
      const verse = dailyVerseService.getTodaysVerse();
      setCurrentVerse(verse);
    } catch (error) {
      console.error("Failed to load daily verse:", error);
    } finally {
      setLoading(false);
    }
  };

  const fadeToNewVerse = async () => {
    try {
      // Fade out current verse
      await new Promise((resolve) => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(resolve);
      });

      // Load new verse
      const verse = dailyVerseService.getTodaysVerse();
      setCurrentVerse(verse);

      // Fade in new verse
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error("Failed to fade to new verse:", error);
    }
  };

  const checkForNewDay = () => {
    const now = new Date();
    // Use AsyncStorage instead of localStorage for React Native
    // For now, we'll skip the localStorage check to avoid any issues
    // The verse will be determined by the day of the month
  };

  useEffect(() => {
    loadTodaysVerse();

    // Check for new day every minute
    const interval = setInterval(checkForNewDay, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    currentVerse,
    loading,
    fadeAnim,
    loadTodaysVerse,
    fadeToNewVerse,
  };
};
