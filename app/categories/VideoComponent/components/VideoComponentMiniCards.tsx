/**
 * VideoComponent Mini Cards
 * Horizontal carousel of mini video cards with play overlay and options modal
 */

import { AntDesign, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { getBestVideoUrl, getVideoUrlFromMedia } from "../../../../src/shared/utils/videoUrlManager";
import { MiniCardSkeleton } from "../../../../src/shared/components/Skeleton";
import { getVideoKey } from "../utils";
import { RecommendedItem } from "../types";

interface VideoComponentMiniCardsProps {
  title: string;
  items: RecommendedItem[];
  modalIndex: number | null;
  setModalIndex: (val: number | null) => void;
  viewsState: Record<string, number>;
  setViewsState: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  playingState: Record<string, boolean>;
  setPlayingState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  hasPlayed: Record<string, boolean>;
  setHasPlayed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  hasCompleted: Record<string, boolean>;
  setHasCompleted: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onMiniCardPlay: (
    key: string,
    item: RecommendedItem,
    setViews: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    setPlaying: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    setHasPlayed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    setHasCompleted: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) => void;
  onCloseAllMenus: () => void;
  onDownload: (item: RecommendedItem) => Promise<void>;
  checkIfDownloaded: (url: string) => boolean;
  videoVolume: number;
  globalVideoStore: {
    mutedVideos: Record<string, boolean>;
  };
  miniCardRefs: React.MutableRefObject<Record<string, any>>;
  showOverlayMini: Record<string, boolean>;
  setShowOverlayMini: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setVideoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onVideoReload: (key: string) => void;
  videoErrors: Record<string, boolean>;
  isLoading?: boolean;
}

export function VideoComponentMiniCards({
  title,
  items,
  modalIndex,
  setModalIndex,
  viewsState,
  setViewsState,
  playingState,
  setPlayingState,
  hasPlayed,
  setHasPlayed,
  hasCompleted,
  setHasCompleted,
  onMiniCardPlay,
  onCloseAllMenus,
  onDownload,
  checkIfDownloaded,
  videoVolume,
  globalVideoStore,
  miniCardRefs,
  showOverlayMini,
  setShowOverlayMini,
  setVideoErrors,
  onVideoReload,
  videoErrors,
  isLoading = false,
}: VideoComponentMiniCardsProps) {
  const router = useRouter();

  const getVideoSource = (item: RecommendedItem) => {
    const videoUrl = getVideoUrlFromMedia(item);
    const url = videoUrl && videoUrl.trim() !== "https://example.com/placeholder.mp4"
      ? videoUrl.trim()
      : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    return getBestVideoUrl(url);
  };

  const handleShare = async (item: RecommendedItem) => {
    try {
      await Share.share({
        title: item.title,
        message: `Check out this video: ${item.title}\n${item.fileUrl}`,
        url: item.fileUrl,
      });
    } catch (error) {
      console.warn("Share error:", error);
    }
  };

  const handleMiniCardPress = (item: RecommendedItem, index: number) => {
    const videoListForNavigation = items.map((v) => ({
      title: v.title,
      speaker: v.subTitle || "Unknown",
      timeAgo: "Recent",
      views: v.views || 0,
      sheared: 0,
      saved: 0,
      favorite: 0,
      fileUrl: v.fileUrl,
      imageUrl: v.fileUrl,
      speakerAvatar: require("../../../../assets/images/Avatar-1.png").toString(),
    }));
    router.push({
      pathname: "/reels/Reelsviewscroll",
      params: {
        title: item.title,
        speaker: item.subTitle || "Unknown",
        timeAgo: "Recent",
        views: String(item.views || 0),
        sheared: String(0),
        saved: String(0),
        favorite: String(0),
        imageUrl: item.fileUrl,
        speakerAvatar: require("../../../../assets/images/Avatar-1.png").toString(),
        category: "videos",
        videoList: JSON.stringify(videoListForNavigation),
        currentIndex: String(index),
        source: "VideoComponent",
      },
    });
  };

  return (
    <View className="mb-6">
      <Text className="text-[16px] mb-3 font-rubik-semibold text-[#344054] mt-4">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {isLoading || items.length === 0 ? (
          Array.from({ length: 5 }).map((_, index) => (
            <MiniCardSkeleton key={`skeleton-${index}`} dark={false} />
          ))
        ) : (
          items.map((item, index) => {
            const key = getVideoKey(item.fileUrl);
            const isPlaying = playingState[key] ?? false;
            const views = viewsState[key] ?? item.views;

            const togglePlay = () => {
              onMiniCardPlay(key, item, setViewsState, setPlayingState, setHasPlayed, setHasCompleted);
            };

            return (
              <View key={key} className="mr-4 w-[154px] flex-col items-center">
                <TouchableOpacity
                  onPress={() => handleMiniCardPress(item, index)}
                  className="w-full h-[232px] rounded-2xl overflow-hidden relative"
                  activeOpacity={0.9}
                >
                  <Video
                    ref={(ref) => { if (ref) miniCardRefs.current[key] = ref; }}
                    source={{
                      uri: getVideoSource(item),
                      headers: { "User-Agent": "JevahApp/1.0", Accept: "video/*" },
                    }}
                    style={{ width: "100%", height: "100%", position: "absolute" }}
                    resizeMode={ResizeMode.COVER}
                    isMuted={globalVideoStore.mutedVideos[key] ?? false}
                    volume={globalVideoStore.mutedVideos[key] ? 0.0 : videoVolume}
                    shouldPlay={isPlaying}
                    useNativeControls={false}
                    onError={() => {
                      setVideoErrors((prev) => ({ ...prev, [key]: true }));
                      setPlayingState((prev) => ({ ...prev, [key]: false }));
                      setShowOverlayMini((prev) => ({ ...prev, [key]: true }));
                    }}
                    onLoad={() => {
                      setVideoErrors((prev) => ({ ...prev, [key]: false }));
                    }}
                    onPlaybackStatusUpdate={(status) => {
                      if (!status.isLoaded) return;
                      if (status.didJustFinish) {
                        setPlayingState((prev) => ({ ...prev, [key]: false }));
                        setHasCompleted((prev) => ({ ...prev, [key]: true }));
                        setShowOverlayMini((prev) => ({ ...prev, [key]: true }));
                      }
                    }}
                  />
                  {!isPlaying && showOverlayMini[key] && (
                    <>
                      {videoErrors[key] ? (
                        <TouchableOpacity
                          onPress={() => onVideoReload(key)}
                          className="absolute inset-0 justify-center items-center"
                          activeOpacity={0.9}
                        >
                          <View className="bg-red-500/80 p-3 rounded-full">
                            <Ionicons name="refresh" size={32} color="#FFFFFF" />
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={togglePlay}
                          className="absolute inset-0 justify-center items-center"
                          activeOpacity={0.9}
                        >
                          <View className="bg-white/70 p-3 rounded-full">
                            <Ionicons name="play" size={32} color="#FEA74E" />
                          </View>
                        </TouchableOpacity>
                      )}
                      <View className="absolute bottom-2 left-2 right-2">
                        <Text
                          className="text-white text-start text-[14px] ml-1 mb-6 font-rubik"
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
                {modalIndex === index && (
                  <>
                    <TouchableWithoutFeedback onPress={onCloseAllMenus}>
                      <View className="absolute inset-0 z-40" />
                    </TouchableWithoutFeedback>
                    <View className="absolute bottom-14 right-3 bg-white shadow-md rounded-lg p-3 z-50 w-[160px] h-[180]">
                      <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                        <Text className="text-[#1D2939] font-rubik ml-2">View Details</Text>
                        <Ionicons name="eye-outline" size={22} color="#1D2939" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleShare(item)}
                        className="py-2 border-b border-gray-200 flex-row items-center justify-between"
                      >
                        <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
                        <Feather name="send" size={22} color="#1D2939" />
                      </TouchableOpacity>
                      <TouchableOpacity className="flex-row items-center justify-between mt-6">
                        <Text className="text-[#1D2939] font-rubik ml-2">Save to Library</Text>
                        <MaterialIcons name="bookmark-border" size={22} color="#1D2939" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="py-2 flex-row items-center justify-between mt-2"
                        onPress={async () => {
                          await onDownload(item);
                        }}
                      >
                        <Text className="text-[#1D2939] font-rubik ml-2">
                          {checkIfDownloaded(item.fileUrl) ? "Downloaded" : "Download"}
                        </Text>
                        <Ionicons
                          name={checkIfDownloaded(item.fileUrl) ? "checkmark-circle" : "download-outline"}
                          size={24}
                          color={checkIfDownloaded(item.fileUrl) ? "#256E63" : "#090E24"}
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                <View className="mt-2 flex flex-col w-full">
                  <View className="flex flex-row justify-between items-center">
                    <Text
                      className="text-[12px] text-[#98A2B3] font-rubik font-medium"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.subTitle?.split(" ").slice(0, 4).join(" ") + " ..."}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        onCloseAllMenus();
                        setModalIndex(modalIndex === index ? null : index);
                      }}
                      className="mr-2"
                    >
                      <Ionicons name="ellipsis-vertical" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row items-center">
                    <AntDesign name="eye" size={20} color="#98A2B3" />
                    <Text className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik">{views}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
