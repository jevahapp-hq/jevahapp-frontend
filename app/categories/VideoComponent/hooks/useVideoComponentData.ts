/**
 * VideoComponent Data Hook
 * Computes indexed videos, trending items, recommendations, and explore sections
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMemo, useEffect, useState } from "react";
import { getVideoKey } from "../utils";
import { RecommendedItem } from "../types";

interface UseVideoComponentDataProps {
  uploadedVideos: any[];
  videoStats: Record<string, any>;
  libraryStore: { savedItems: any[]; isItemSaved: (key: string) => boolean };
  contentStats: Record<string, any>;
  previouslyViewedState: RecommendedItem[];
  userFavorites: Record<string, boolean>;
}

function calculateTrendingScore(video: any, videoData: any) {
  const now = Date.now();
  const createdAt = new Date(videoData?.createdAt || now).getTime();
  const ageInHours = Math.max(1, (now - createdAt) / (1000 * 60 * 60));

  const views = video.globalViews ?? video.views ?? 0;
  const shares = video.globalShares ?? video.shares ?? 0;
  const favorites = video.globalLikes ?? video.favorites ?? 0;
  const comments = video.globalComments ?? video.comments ?? 0;
  const saves = video.globalSaves ?? video.saves ?? 0;

  const viewsPerHour = views / ageInHours;
  const likesPerHour = favorites / ageInHours;
  const sharesPerHour = shares / ageInHours;
  const commentsPerHour = comments / ageInHours;
  const savesPerHour = saves / ageInHours;

  const weightedVelocity =
    1 * Math.sqrt(Math.max(0, viewsPerHour)) +
    2 * Math.log1p(Math.max(0, savesPerHour)) +
    3 * Math.log1p(Math.max(0, likesPerHour)) +
    5 * Math.log1p(Math.max(0, commentsPerHour)) +
    6 * Math.log1p(Math.max(0, sharesPerHour));

  const halfLifeHours = 24;
  const decay = Math.exp(-ageInHours / halfLifeHours);
  const earlyBoost = ageInHours < 6 && shares + comments >= 10 ? 1.25 : 1.0;
  const score = weightedVelocity * decay * earlyBoost * 300;
  const recency = 1 / ageInHours;

  return { score, recency };
}

export function useVideoComponentData({
  uploadedVideos,
  videoStats,
  libraryStore,
  contentStats,
  previouslyViewedState,
  userFavorites,
}: UseVideoComponentDataProps) {
  const [userInterestsState, setUserInterestsState] = useState<string[]>([]);

  useEffect(() => {
    const loadInterests = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const user = JSON.parse(userStr);
          const ints = user.interests || [];
          setUserInterestsState(
            Array.isArray(ints) ? ints.filter(Boolean).map((s) => String(s).toLowerCase()) : []
          );
        }
      } catch (error) {
        console.log("Error fetching user interests:", error);
      }
    };
    loadInterests();
  }, []);

  const allIndexedVideos = useMemo(
    () =>
      uploadedVideos.map((video: any) => {
        const key = getVideoKey(video.fileUrl);
        const stats = videoStats[key] || {};
        const isItemSaved = libraryStore.isItemSaved(key);
        const contentId = key;
        const global = contentId ? (contentStats as any)[contentId] : undefined;
        const globalViews = global?.views ?? 0;
        const globalShares = global?.shares ?? 0;
        const globalLikes = global?.likes ?? 0;
        const globalComments = global?.comments ?? 0;
        const globalSaves = global?.saves ?? 0;
        const views = Math.max(globalViews, stats.views ?? 0, video.viewCount ?? 0);
        const shares = Math.max(globalShares, stats.sheared ?? 0, video.sheared ?? 0);
        const favorites = Math.max(globalLikes, stats.favorite ?? 0, video.favorite ?? 0);
        const comments = Math.max(globalComments, stats.comment ?? 0, video.comment ?? 0);
        const saves = Math.max(globalSaves, (stats as any).totalSaves ?? stats.saved ?? 0, video.saved ?? 0);
        const score = views + shares + favorites + comments + saves;

        return {
          contentId,
          key,
          fileUrl: video.fileUrl,
          title: video.title,
          subTitle: video.speaker || "Unknown",
          views,
          shares,
          favorites,
          comments,
          saves,
          globalViews,
          globalShares,
          globalLikes,
          globalComments,
          globalSaves,
          score,
          isItemSaved,
          imageUrl: { uri: video.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg" },
        };
      }),
    [uploadedVideos, videoStats, libraryStore.savedItems, contentStats]
  );

  const trendingItems: RecommendedItem[] = useMemo(() => {
    const scored = allIndexedVideos
      .map((video) => {
        const originalVideo = uploadedVideos.find((v) => v.fileUrl === video.fileUrl);
        const { score, recency } = calculateTrendingScore(video, originalVideo || {});
        return { ...video, trendingScore: score, recency, createdAt: originalVideo?.createdAt } as any;
      })
      .filter((v) => (v as any).trendingScore > 0);

    const takeTop = (list: any[]) =>
      list
        .sort((a: any, b: any) => {
          if ((b.trendingScore ?? 0) !== (a.trendingScore ?? 0))
            return (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
          const av = a.globalViews ?? a.views ?? 0;
          const bv = b.globalViews ?? b.views ?? 0;
          if (bv !== av) return bv - av;
          return (b.recency ?? 0) - (a.recency ?? 0);
        })
        .slice(0, 20)
        .map(
          ({
            fileUrl,
            title,
            subTitle,
            imageUrl,
            trendingScore,
            globalViews,
            views,
          }: any) => {
            const scoreNum = Number(trendingScore || 0);
            return {
              fileUrl,
              title,
              subTitle,
              views: globalViews ?? views ?? 0,
              imageUrl,
              isHot: scoreNum > 1200,
              isRising: scoreNum > 600 && scoreNum <= 1200,
              trendingScore: scoreNum,
            } as RecommendedItem;
          }
        );

    if (scored.length > 0) return takeTop(scored);

    const fallback = allIndexedVideos
      .map((video) => {
        const originalVideo = uploadedVideos.find((v) => v.fileUrl === video.fileUrl);
        const createdAt = new Date(originalVideo?.createdAt || Date.now()).getTime();
        return { ...video, createdAt } as any;
      })
      .sort((a: any, b: any) => {
        const bv = b.globalViews ?? b.views ?? 0;
        const av = a.globalViews ?? a.views ?? 0;
        if (bv !== av) return bv - av;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      })
      .slice(0, 20)
      .map(({ fileUrl, title, subTitle, imageUrl, globalViews, views }: any) => ({
        fileUrl,
        title,
        subTitle,
        views: globalViews ?? views ?? 0,
        imageUrl,
        isHot: false,
        isRising: false,
        trendingScore: 0,
      } as RecommendedItem));

    return fallback;
  }, [allIndexedVideos, uploadedVideos]);

  const enhancedRecommendedForYou = useMemo((): RecommendedItem[] => {
    if (!uploadedVideos.length) return [];

    const watchedSpeakers =
      previouslyViewedState.length > 0
        ? [...new Set(previouslyViewedState.map((v) => (v.subTitle || "").toLowerCase()))]
        : [];

    const likedKeys = Object.keys(userFavorites || {}).filter((k) => userFavorites[k]);
    const likedSpeakers = new Set<string>();
    likedKeys.forEach((k) => {
      const video = allIndexedVideos.find((v) => v.key === k);
      if (video?.subTitle) likedSpeakers.add(String(video.subTitle).toLowerCase());
    });
    const interestKeywords = new Set<string>(userInterestsState || []);

    const scoreVideo = (video: any) => {
      const originalVideo = uploadedVideos.find((v) => v.fileUrl === video.fileUrl);
      let recommendationScore = 1;
      const titleLower = (video.title || "").toLowerCase();
      const speakerLower = (video.subTitle || "").toLowerCase();
      const fromLikedSpeaker = likedSpeakers.has(speakerLower);
      if (fromLikedSpeaker) recommendationScore *= 3.0;
      const fromWatchedSpeaker = watchedSpeakers.includes(speakerLower);
      if (fromWatchedSpeaker) recommendationScore *= 1.8;
      let keywordMatches = 0;
      interestKeywords.forEach((kw) => {
        if (!kw) return;
        if (titleLower.includes(kw) || speakerLower.includes(kw)) keywordMatches += 1;
      });
      if (keywordMatches > 0) {
        recommendationScore *= 1 + Math.min(0.6, 0.25 * keywordMatches);
      }
      const now = new Date().getTime();
      const createdAt = new Date(originalVideo?.createdAt || Date.now()).getTime();
      const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0.75, 1 - ageInDays / 45);
      recommendationScore *= recencyBoost;
      const globalTieBreaker =
        (video.globalViews || 0) * 0.001 +
        (video.globalLikes || 0) * 0.01 +
        (video.globalShares || 0) * 0.02;
      recommendationScore += globalTieBreaker;
      return { ...video, recommendationScore };
    };

    const scoredFiltered = allIndexedVideos
      .filter((video) => !previouslyViewedState.some((v) => v.fileUrl === video.fileUrl))
      .map(scoreVideo)
      .sort((a, b) => b.recommendationScore - a.recommendationScore);

    const source =
      scoredFiltered.length > 0
        ? scoredFiltered
        : allIndexedVideos.map(scoreVideo).sort((a, b) => b.recommendationScore - a.recommendationScore);

    return source.slice(0, 12).map(({ fileUrl, title, subTitle, views, imageUrl }) => ({
      fileUrl,
      title,
      subTitle,
      views,
      imageUrl,
    }));
  }, [
    uploadedVideos,
    previouslyViewedState,
    allIndexedVideos,
    videoStats,
    userFavorites,
    userInterestsState,
  ]);

  const firstExploreVideos = useMemo(() => uploadedVideos.slice(1, 5), [uploadedVideos]);
  const middleExploreVideos = useMemo(() => uploadedVideos.slice(5, 9), [uploadedVideos]);
  const remainingExploreVideos = useMemo(() => uploadedVideos.slice(9), [uploadedVideos]);

  return {
    allIndexedVideos,
    trendingItems,
    enhancedRecommendedForYou,
    firstExploreVideos,
    middleExploreVideos,
    remainingExploreVideos,
  };
}
