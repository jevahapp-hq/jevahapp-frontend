import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { MutableRefObject } from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  getBestVideoUrl,
  getVideoUrlFromMedia,
} from "../../../../src/shared/utils/videoUrlManager";
import { useGlobalVideoStore } from "../../../store/useGlobalVideoStore";
import { qualifiesPlaybackView } from "../../../utils/contentInteraction/viewQualification";
import {
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
} from "../../../utils/userValidation";
import { getTimeAgo } from "../utils";

export interface SermonVideoCardProps {
  video: any;
  index: number;
  sectionId: string;
  videoRefs: MutableRefObject<Record<string, any>>;
  contentStats: Record<string, any>;
  userFavorites: Record<string, boolean>;
  globalFavoriteCounts: Record<string, number>;
  modalVisible: string | null;
  videoErrors: Record<string, boolean>;
  viewCounted: Record<string, boolean>;
  videoVolume: number;
  handleFavorite: (key: string, item: any) => void;
  handleSave: (key: string, item: any) => void;
  handleShare: (key: string, item: any) => void;
  handleVideoTap: (key: string, video: any, index: number) => void;
  handleVideoReload: (key: string) => void;
  incrementView: (key: string, item: any) => void;
  setModalVisible: (key: string | null) => void;
  setVideoErrors: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  setViewCounted: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  showCommentModal: (comments: any[], contentId: string) => void;
}

export default function SermonVideoCard({
  video,
  index,
  sectionId,
  videoRefs,
  contentStats,
  userFavorites,
  globalFavoriteCounts,
  modalVisible,
  videoErrors,
  viewCounted,
  videoVolume,
  handleFavorite,
  handleSave,
  handleShare,
  handleVideoTap,
  handleVideoReload,
  incrementView,
  setModalVisible,
  setVideoErrors,
  setViewCounted,
  showCommentModal,
}: SermonVideoCardProps) {
  const globalVideoStore = useGlobalVideoStore();

  const modalKey = `${sectionId}-${index}`;
  const key = `${video.contentType}-${video._id || video.fileUrl || index}`;
  const stats = contentStats[key] || {};

  const rawVideoUrl = getVideoUrlFromMedia(video);
  const isValidUri = (u: any) =>
    typeof u === "string" &&
    u.trim().length > 0 &&
    /^https?:\/\//.test(u.trim());
  const safeVideoUri =
    rawVideoUrl && isValidUri(rawVideoUrl)
      ? getBestVideoUrl(rawVideoUrl)
      : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  console.log(`🎬 Sermon video URL for ${video?.title}:`, {
    original: rawVideoUrl?.substring(0, 100),
    processed: safeVideoUri?.substring(0, 100),
  });

  return (
    <View className="flex flex-col">
      <View key={modalKey} className="mr-4 w-full h-[436px]">
        <View className="w-full h-[393px] overflow-hidden relative">
          <Video
            ref={(ref) => {
              if (ref) {
                console.log(
                  `📹 Registering sermon video player for key: ${modalKey}`
                );
                videoRefs.current[modalKey] = ref;
                // ✅ CRITICAL: Register player with global store for imperative control
                globalVideoStore.registerVideoPlayer(modalKey, {
                  pause: async () => {
                    try {
                      console.log(
                        `⏸️ Registered pause called for sermon video: ${modalKey}`
                      );
                      await ref.pauseAsync();
                      globalVideoStore.setOverlayVisible(modalKey, true);
                    } catch (err) {
                      console.warn(`Failed to pause ${modalKey}:`, err);
                    }
                  },
                  play: async () => {
                    try {
                      console.log(
                        `▶️ Registered play function called for sermon video: ${modalKey}`
                      );
                      const status = await ref.getStatusAsync();
                      const isLoaded = status.isLoaded;
                      console.log(`📊 Sermon video ${modalKey} status:`, {
                        isLoaded,
                        isPlaying: isLoaded ? status.isPlaying : false,
                      });
                      if (isLoaded) {
                        console.log(
                          `✅ Sermon video ${modalKey} is loaded, calling playAsync`
                        );
                        const result = await ref.playAsync();
                        console.log(
                          `🎉 Sermon video ${modalKey} playAsync result:`,
                          result
                        );
                      } else {
                        console.log(
                          `⏳ Sermon video ${modalKey} not loaded yet, waiting...`
                        );
                        await new Promise<void>((resolve, reject) => {
                          let attempts = 0;
                          const maxAttempts = 40;
                          const checkStatus = async () => {
                            attempts++;
                            const s = await ref.getStatusAsync();
                            console.log(
                              `🔄 Check ${attempts}: Sermon video ${modalKey} status - isLoaded: ${s?.isLoaded}`
                            );
                            if (s?.isLoaded) {
                              console.log(
                                `✅ Sermon video ${modalKey} loaded after ${attempts} attempts, playing now`
                              );
                              try {
                                await ref.playAsync();
                                resolve();
                              } catch (e) {
                                reject(e);
                              }
                            } else if (attempts < maxAttempts) {
                              setTimeout(checkStatus, 50);
                            } else {
                              console.warn(
                                `⚠️ Sermon video ${modalKey} failed to load after ${maxAttempts} attempts`
                              );
                              reject(
                                new Error(
                                  `Video ${modalKey} failed to load after ${maxAttempts} attempts`
                                )
                              );
                            }
                          };
                          checkStatus();
                        });
                      }
                    } catch (err) {
                      console.error(
                        `❌ Registered play function failed for sermon video ${modalKey}:`,
                        err
                      );
                      throw err;
                    }
                  },
                  showOverlay: () => {
                    globalVideoStore.setOverlayVisible(modalKey, true);
                  },
                  key: modalKey,
                });
                console.log(
                  `✅ Sermon video player registered successfully for key: ${modalKey}`
                );
              } else {
                console.log(
                  `🗑️ Unregistering sermon video player for key: ${modalKey}`
                );
                delete videoRefs.current[modalKey];
                globalVideoStore.unregisterVideoPlayer(modalKey);
              }
            }}
            source={{ uri: safeVideoUri }}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode={ResizeMode.COVER}
            isMuted={globalVideoStore.mutedVideos[modalKey] ?? false}
            volume={
              globalVideoStore.mutedVideos[modalKey] ? 0.0 : videoVolume
            }
            shouldPlay={globalVideoStore.playingVideos[modalKey] ?? false}
            useNativeControls={false}
            onError={(e) => {
              console.warn(
                "Video failed to load in SermonComponent:",
                video?.title,
                e
              );
              setVideoErrors((prev) => ({ ...prev, [modalKey]: true }));
              globalVideoStore.pauseVideo(modalKey);
            }}
            onLoad={() => {
              console.log(
                `✅ Sermon video loaded successfully: ${video?.title}`
              );
              setVideoErrors((prev) => ({ ...prev, [modalKey]: false }));
            }}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded) return;
              const positionMs = status.positionMillis || 0;
              const durationMs = status.durationMillis || 0;
              const progress =
                durationMs > 0 ? positionMs / durationMs : 0;
              const pct = progress * 100;
              globalVideoStore.setVideoProgress(modalKey, pct);
              const ref = videoRefs.current[modalKey];

              if (
                status.isPlaying &&
                !viewCounted[modalKey] &&
                durationMs > 0
              ) {
                const { qualifies, finished } = qualifiesPlaybackView({
                  family: "video",
                  isPlaying: true,
                  positionMs,
                  progress,
                  durationMs,
                });
                if (qualifies || finished || status.didJustFinish) {
                  void incrementView(modalKey, video, {
                    durationMs: finished || status.didJustFinish
                      ? durationMs
                      : positionMs,
                    progressPct: Math.round(pct),
                    isComplete: Boolean(finished || status.didJustFinish),
                  });
                }
              }

              if (status.didJustFinish) {
                ref?.setPositionAsync(0);
                globalVideoStore.pauseVideo(modalKey);
                globalVideoStore.setVideoCompleted(modalKey, true);
              }
            }}
          />

          <View className="flex-col absolute mt-[170px] right-4">
            <TouchableOpacity
              onPress={() => handleFavorite(key, video)}
              className="flex-col justify-center items-center"
            >
              <MaterialIcons
                name={userFavorites[key] ? "favorite" : "favorite-border"}
                size={30}
                color={userFavorites[key] ? "#D22A2A" : "#FFFFFF"}
              />
              <Text className="text-[10px] text-white font-rubik-semibold">
                {globalFavoriteCounts[key] || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                console.log(
                  "🔄 Comment button clicked for sermon:",
                  video.title
                );
                const contentId = video._id || key;
                showCommentModal([], contentId);
              }}
              className="flex-col justify-center items-center mt-6"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-sharp" size={30} color="white" />
              <Text className="text-[10px] text-white font-rubik-semibold">
                {stats.comment === 1
                  ? (video.comment ?? 0) + 1
                  : video.comment ?? 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSave(key, video)}
              className="flex-col justify-center items-center mt-6"
            >
              <MaterialIcons
                name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                size={30}
                color={stats.saved === 1 ? "#FEA74E" : "#FFFFFF"}
              />
              <Text className="text-[10px] text-white font-rubik-semibold">
                {stats.saved === 1
                  ? (video.saved ?? 0) + 1
                  : video.saved ?? 0}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="absolute inset-0 justify-center items-center">
            {videoErrors[modalKey] ? (
              <TouchableOpacity onPress={() => handleVideoReload(modalKey)}>
                <View className="bg-red-500/80 p-4 rounded-full">
                  <Ionicons name="refresh" size={40} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => handleVideoTap(modalKey, video, index)}
              >
                <View
                  className={`${
                    globalVideoStore.playingVideos[modalKey]
                      ? "bg-black/30"
                      : "bg-white/70"
                  } p-4 rounded-full`}
                >
                  <Ionicons
                    name={
                      globalVideoStore.playingVideos[modalKey]
                        ? "pause"
                        : "play"
                    }
                    size={40}
                    color={
                      globalVideoStore.playingVideos[modalKey]
                        ? "#FFFFFF"
                        : "#FEA74E"
                    }
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {!globalVideoStore.playingVideos[modalKey] && (
            <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
              <Text
                className="text-white font-semibold text-[14px]"
                numberOfLines={2}
              >
                {video.title}
              </Text>
            </View>
          )}

          <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
            <View className="flex-1 h-1 bg-white/30 rounded-full relative">
              <View
                className="h-full bg-[#FEA74E] rounded-full"
                style={{
                  width: `${globalVideoStore.progresses[modalKey] ?? 0}%`,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: `${globalVideoStore.progresses[modalKey] ?? 0}%`,
                  transform: [{ translateX: -6 }],
                  top: -5,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#FEA74E",
                }}
              />
            </View>
            <TouchableOpacity
              onPress={() => globalVideoStore.toggleVideoMute(modalKey)}
            >
              <Ionicons
                name={
                  globalVideoStore.mutedVideos[modalKey]
                    ? "volume-mute"
                    : "volume-high"
                }
                size={20}
                color="#FEA74E"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-1 px-3 mb-4">
          <View className="flex flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
              <Image
                source={getUserAvatarFromContent(video)}
                style={{ width: 30, height: 30, borderRadius: 999 }}
                resizeMode="cover"
              />
            </View>
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                  {getUserDisplayNameFromContent(video)}
                </Text>
                <View className="flex flex-row mt-2 ml-2">
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {getTimeAgo(video.createdAt)}
                  </Text>
                </View>
              </View>
              <View className="flex-row mt-2">
                <View className="flex-row items-center">
                  <AntDesign name="eye" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
                    {stats.views ?? video.views ?? 0}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleShare(key, video)}
                  className="flex-row items-center ml-4"
                >
                  <Feather name="send" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.sheared ?? video.sheared ?? 0}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() =>
              setModalVisible(modalVisible === modalKey ? null : modalKey)
            }
            className="mr-2"
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {modalVisible === modalKey && (
          <>
            <TouchableWithoutFeedback onPress={() => setModalVisible(null)}>
              <View className="absolute inset-0 z-40" />
            </TouchableWithoutFeedback>
            <View className="absolute bottom-24 right-16 bg-white shadow-md rounded-lg p-3 z-50 w-[170px] h-[140]">
              <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                <Text className="text-[#1D2939] font-rubik ml-2">
                  View Details
                </Text>
                <Ionicons name="eye-outline" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleShare(modalKey, video)}
                className="py-2 border-b border-gray-200 flex-row items-center justify-between"
              >
                <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
                <Feather name="send" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center justify-between mt-6"
                onPress={() => handleSave(modalKey, video)}
              >
                <Text className="text-[#1D2939] font-rubik ml-2">
                  Save to Library
                </Text>
                <MaterialIcons
                  name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                  size={22}
                  color={stats.saved === 1 ? "#1D2939" : "#1D2939"}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
