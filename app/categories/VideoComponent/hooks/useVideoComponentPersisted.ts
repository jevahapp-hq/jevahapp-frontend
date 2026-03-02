/**
 * VideoComponent Persistence Hook
 * Handles loading persisted stats, favorites, viewed videos, and audio initialization
 */

import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import {
  getFavoriteState,
  getPersistedStats,
  getViewed,
  toggleFavorite,
} from "../../../utils/persistentStorage";
import { getVideoKey } from "../utils";
import { RecommendedItem, VideoCardData } from "../types";

interface UseVideoComponentPersistedProps {
  uploadedVideos: any[];
  loadDownloadedItems: () => Promise<void>;
  libraryStore: { isLoaded: boolean; loadSavedItems: () => Promise<void> };
  globalVideoStore: {
    mutedVideos: Record<string, boolean>;
    toggleVideoMute: (key: string) => void;
  };
}

export function useVideoComponentPersisted({
  uploadedVideos,
  loadDownloadedItems,
  libraryStore,
  globalVideoStore,
}: UseVideoComponentPersistedProps) {
  const [videoVolume, setVideoVolume] = useState<number>(1.0);
  const [videoStats, setVideoStats] = useState<
    Record<string, Partial<VideoCardData>>
  >({});
  const [previouslyViewedState, setPreviouslyViewedState] = useState<
    RecommendedItem[]
  >([]);
  const [miniCardViews, setMiniCardViews] = useState<Record<string, number>>(
    {}
  );
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>(
    {}
  );
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const loadPersistedData = async () => {
      if (!libraryStore.isLoaded) {
        await libraryStore.loadSavedItems();
      }
      await loadDownloadedItems();

      const stats = await getPersistedStats();
      const viewed = await getViewed();

      setVideoStats(stats);
      setPreviouslyViewedState(viewed);

      const miniViews: Record<string, number> = {};
      Object.keys(stats).forEach((key) => {
        if (typeof stats[key]?.views === "number") {
          miniViews[key] = stats[key].views;
        }
      });
      setMiniCardViews(miniViews);

      const favoriteStates: Record<string, boolean> = {};
      const favoriteCounts: Record<string, number> = {};

      await Promise.all(
        uploadedVideos.map(async (video) => {
          const key = getVideoKey(video.fileUrl);
          const { isUserFavorite, globalCount } = await getFavoriteState(key);
          favoriteStates[key] = isUserFavorite;
          favoriteCounts[key] = globalCount;
        })
      );

      setUserFavorites(favoriteStates);
      setGlobalFavoriteCounts(favoriteCounts);
    };

    loadPersistedData();
  }, [uploadedVideos.length]);

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        setVideoVolume(1.0);
        uploadedVideos.forEach((video) => {
          const key = getVideoKey(video.fileUrl);
          if (globalVideoStore.mutedVideos[key]) {
            globalVideoStore.toggleVideoMute(key);
          }
        });
      } catch (error) {
        console.error("VideoComponent: Failed to initialize audio session:", error);
        setVideoVolume(1.0);
        uploadedVideos.forEach((video) => {
          const key = getVideoKey(video.fileUrl);
          if (globalVideoStore.mutedVideos[key]) {
            globalVideoStore.toggleVideoMute(key);
          }
        });
      }
    };

    initializeAudio();
  }, [uploadedVideos]);

  return {
    videoVolume,
    setVideoVolume,
    videoStats,
    setVideoStats,
    previouslyViewedState,
    setPreviouslyViewedState,
    miniCardViews,
    setMiniCardViews,
    userFavorites,
    setUserFavorites,
    globalFavoriteCounts,
    setGlobalFavoriteCounts,
  };
}
