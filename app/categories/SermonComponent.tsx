import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CommentIcon from "../components/CommentIcon";
import { useCommentModal } from "../context/CommentModalContext";
import { useDownloadStore } from "../store/useDownloadStore";
import { useGlobalMediaStore } from "../store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useInteractionStore } from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaStore } from "../store/useUploadStore";
import {
  convertToDownloadableItem,
  useDownloadHandler,
} from "../utils/downloadUtils";
import { persistStats, toggleFavorite } from "../utils/persistentStorage";
import {
  getDisplayName,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
} from "../utils/userValidation";

interface SermonCard {
  fileUrl: string;
  title: string;
  speaker: string;
  uploadedBy?: string;
  timeAgo: string;
  speakerAvatar: any;
  favorite: number;
  views: number;
  saved: number;
  sheared: number;
  comment: number;
  imageUrl?: any;
  onPress?: () => void;
  createdAt?: string;
}

interface RecommendedItem {
  fileUrl: string;
  imageUrl: any;
  title: string;
  subTitle: string;
  views: number;
  onPress?: () => void;
  isHot?: boolean;
  isRising?: boolean;
  trendingScore?: number;
}

function getTimeAgo(createdAt: string): string {
  const now = new Date();
  const posted = new Date(createdAt);
  const diff = now.getTime() - posted.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}MIN AGO`;
  if (hours < 24) return `${hours}HRS AGO`;
  return `${days}DAYS AGO`;
}

export default function SermonComponent() {
  const router = useRouter();
  const mediaStore = useMediaStore();
  const globalVideoStore = useGlobalVideoStore();
  const globalMediaStore = useGlobalMediaStore();
  const libraryStore = useLibraryStore();

  // ✅ Use global comment modal and interaction store
  const { showCommentModal } = useCommentModal();
  const { comments } = useInteractionStore();

  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();

  useFocusEffect(
    useCallback(() => {
      mediaStore.refreshUserDataForExistingMedia();
      loadDownloadedItems();
    }, [])
  );

  // Filter sermon content (both music and videos with sermon contentType)
  const sermonContent = useMemo(
    () => mediaStore.mediaList.filter((item) => item.contentType === "sermon"),
    [mediaStore.mediaList]
  );

  // Organize content by sections
  const recentSermons = useMemo(
    () => sermonContent.slice(0, 1), // Most recent sermon
    [sermonContent]
  );

  const exploreMoreSermons = useMemo(
    () => sermonContent.slice(1, 5), // Next 4 sermons
    [sermonContent]
  );

  const trendingSermons = useMemo(
    () => sermonContent.slice(5, 9), // Next 4 sermons for trending
    [sermonContent]
  );

  const recommendedSermons = useMemo(
    () => sermonContent.slice(9, 12), // Next 3 sermons for recommended
    [sermonContent]
  );

  // Mock previously viewed data (in real app, this would come from user's viewing history)
  const previouslyViewed: RecommendedItem[] = useMemo(
    () =>
      sermonContent.slice(0, 3).map((item, index) => ({
        key: `previously-viewed-${item._id || index}`,
        fileUrl: item.fileUrl,
        title: item.title,
        imageUrl: item.imageUrl || { uri: item.fileUrl },
        subTitle: getDisplayName(item.speaker, item.uploadedBy),
        views: (item as any).views || 0,
        onPress: () => console.log("Viewing", item.title),
      })),
    [sermonContent]
  );

  // State management
  const [isMuted, setIsMuted] = useState(true);
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [pvModalIndex, setPvModalIndex] = useState<number | null>(null);
  const [rsModalIndex, setRsModalIndex] = useState<number | null>(null);
  const [trendingModalIndex, setTrendingModalIndex] = useState<number | null>(
    null
  );
  const [recommendedModalIndex, setRecommendedModalIndex] = useState<
    number | null
  >(null);

  // Video and audio state
  const [videoVolume, setVideoVolume] = useState<number>(1.0);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [soundMap, setSoundMap] = useState<Record<string, Audio.Sound>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [pausedAudioMap, setPausedAudioMap] = useState<Record<string, number>>(
    {}
  );
  const [audioProgressMap, setAudioProgressMap] = useState<
    Record<string, number>
  >({});
  const [audioDurationMap, setAudioDurationMap] = useState<
    Record<string, number>
  >({});
  const [audioMuteMap, setAudioMuteMap] = useState<Record<string, boolean>>({});

  // Stats and interactions
  const [contentStats, setContentStats] = useState<Record<string, any>>({});
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>(
    {}
  );
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<
    Record<string, number>
  >({});

  // Video refs
  const videoRefs = useRef<Record<string, any>>({});
  const [viewCounted, setViewCounted] = useState<Record<string, boolean>>({});

  // Helper functions
  const getContentKey = (item: any) =>
    `${item.contentType}-${
      item._id || item.fileUrl || Math.random().toString(36).substring(2)
    }`;

  const handleVideoTap = (key: string, video: any, index: number) => {
    const isCurrentlyPlaying = globalVideoStore.playingVideos[key] ?? false;
    if (isCurrentlyPlaying) {
      globalVideoStore.pauseVideo(key);
    } else {
      globalVideoStore.playVideo(key);
    }
  };

  const handleComment = (key: string, audio: any) => {
    // Get the content ID for this audio
    const contentId = audio._id || key;

    // Get existing comments for this audio
    const currentComments = comments[contentId] || [];
    const formattedComments = currentComments.map((comment: any) => ({
      id: comment.id,
      userName: comment.username || "Anonymous",
      avatar: comment.userAvatar || "",
      timestamp: comment.timestamp,
      comment: comment.comment,
      likes: comment.likes || 0,
      isLiked: comment.isLiked || false,
    }));

    // Show the global comment modal
    showCommentModal(formattedComments, contentId);
  };

  const handleShare = async (key: string, item: any) => {
    try {
      const result = await Share.share({
        title: item.title,
        message: `Check this out: ${item.title}\n${item.fileUrl}`,
        url: item.fileUrl,
      });

      if (result.action === Share.sharedAction) {
        setContentStats((prev) => {
          const updated = {
            ...prev,
            [key]: {
              ...prev[key],
              sheared: (prev[key]?.sheared || item.sheared || 0) + 1,
            },
          };
          persistStats(updated);
          return updated;
        });
      }
      setModalVisible(null);
    } catch (err) {
      console.warn("❌ Share error:", err);
      setModalVisible(null);
    }
  };

  const handleSave = async (key: string, item: any) => {
    const isSaved = contentStats[key]?.saved === 1;

    if (!isSaved) {
      const libraryItem = {
        id: key,
        contentType: item.contentType || "sermon",
        fileUrl: item.fileUrl,
        title: item.title,
        speaker: item.speaker,
        uploadedBy: item.uploadedBy,
        description: item.description,
        createdAt: item.createdAt || new Date().toISOString(),
        speakerAvatar: item.speakerAvatar,
        views: contentStats[key]?.views || item.views || 0,
        sheared: contentStats[key]?.sheared || item.sheared || 0,
        favorite: contentStats[key]?.favorite || item.favorite || 0,
        comment: contentStats[key]?.comment || item.comment || 0,
        saved: 1,
        imageUrl: item.imageUrl,
        thumbnailUrl:
          item.contentType === "sermon"
            ? item.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg"
            : item.imageUrl || item.fileUrl,
        originalKey: key,
      };

      await libraryStore.addToLibrary(libraryItem);
    } else {
      await libraryStore.removeFromLibrary(key);
    }

    setContentStats((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          saved: isSaved ? 0 : 1,
        },
      };
      persistStats(updated);
      return updated;
    });

    setModalVisible(null);
  };

  const handleFavorite = async (key: string, item: any) => {
    try {
      const { isUserFavorite, globalCount } = await toggleFavorite(key);
      setUserFavorites((prev) => ({ ...prev, [key]: isUserFavorite }));
      setGlobalFavoriteCounts((prev) => ({ ...prev, [key]: globalCount }));
    } catch (error) {
      console.error(`❌ Failed to toggle favorite for ${item.title}:`, error);
    }
  };

  const incrementView = (key: string, item: any) => {
    setContentStats((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          views: (prev[key]?.views || 0) + 1,
          sheared: prev[key]?.sheared || item.sheared || 0,
          favorite: prev[key]?.favorite || item.favorite || 0,
          saved: prev[key]?.saved || item.saved || 0,
          comment: prev[key]?.comment || item.comment || 0,
        },
      };
      persistStats(updated);
      return updated;
    });
  };

  // Audio playback functions
  const playAudio = async (uri: string, id: string) => {
    if (!uri) return;
    if (isLoadingAudio) return;
    setIsLoadingAudio(true);
    try {
      // Pause currently playing if different
      if (playingAudioId && playingAudioId !== id && soundMap[playingAudioId]) {
        try {
          await soundMap[playingAudioId].pauseAsync();
          const status = await soundMap[playingAudioId].getStatusAsync();
          if (status.isLoaded) {
            setPausedAudioMap((prev) => ({
              ...prev,
              [playingAudioId]: status.positionMillis ?? 0,
            }));
          }
        } catch {}
      }

      const existing = soundMap[id];
      if (existing) {
        const status = await existing.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            const pos = status.positionMillis ?? 0;
            await existing.pauseAsync();
            setPausedAudioMap((prev) => ({ ...prev, [id]: pos }));
            setPlayingAudioId(null);
          } else {
            const resumePos = pausedAudioMap[id] ?? 0;
            await existing.playFromPositionAsync(resumePos);
            setPlayingAudioId(id);

            let duration = audioDurationMap[id];
            if (!duration) {
              const updated = await existing.getStatusAsync();
              if (updated.isLoaded && updated.durationMillis) {
                duration = updated.durationMillis;
                setAudioDurationMap((prev) => ({ ...prev, [id]: duration! }));
              }
            }
            setAudioProgressMap((prev) => ({
              ...prev,
              [id]: (resumePos || 0) / Math.max(duration || 1, 1),
            }));
          }
          setIsLoadingAudio(false);
          return;
        } else {
          setSoundMap((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        }
      }

      const resumePos = pausedAudioMap[id] ?? 0;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          isMuted: audioMuteMap[id] ?? false,
          positionMillis: resumePos,
        }
      );
      setSoundMap((prev) => ({ ...prev, [id]: sound }));
      setPlayingAudioId(id);

      const initial = await sound.getStatusAsync();
      if (initial.isLoaded && typeof initial.durationMillis === "number") {
        const safeDur = initial.durationMillis || 1;
        setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));
        setAudioProgressMap((prev) => ({
          ...prev,
          [id]: (resumePos || 0) / safeDur,
        }));
      }

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded || typeof status.durationMillis !== "number")
          return;
        const safeDur = status.durationMillis || 1;
        setAudioProgressMap((prev) => ({
          ...prev,
          [id]: (status.positionMillis || 0) / safeDur,
        }));
        setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));
        if (status.didJustFinish) {
          try {
            await sound.unloadAsync();
          } catch {}
          setSoundMap((prev) => {
            const u = { ...prev };
            delete u[id];
            return u;
          });
          setPlayingAudioId((curr) => (curr === id ? null : curr));
          setPausedAudioMap((prev) => ({ ...prev, [id]: 0 }));
          setAudioProgressMap((prev) => ({ ...prev, [id]: 0 }));
        }
      });
    } catch (err) {
      console.error("❌ Audio playback error:", err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const renderAudioCard = (
    audio: any,
    index: number,
    sectionId: string,
    playType: "progress" | "center" = "center"
  ) => {
    const modalKey = `${sectionId}-${index}`;
    const key = getContentKey(audio);
    const stats = contentStats[key] || {};
    const thumbnailSource = audio?.imageUrl
      ? typeof audio.imageUrl === "string"
        ? { uri: audio.imageUrl }
        : (audio.imageUrl as any)
      : audio?.thumbnailUrl
      ? { uri: audio.thumbnailUrl }
      : { uri: audio.fileUrl };
    const isPlaying = playingAudioId === modalKey;
    const currentProgress = audioProgressMap[modalKey] || 0;
    const speakerName = getDisplayName(audio.speaker, audio.uploadedBy);
    const speakerAvatar =
      typeof audio.speakerAvatar === "string" &&
      audio.speakerAvatar.startsWith("http")
        ? { uri: audio.speakerAvatar }
        : audio.speakerAvatar || require("../../assets/images/Avatar-1.png");

    // Get existing comments for this audio
    const contentId = audio._id || modalKey;
    const currentComments = comments[contentId] || [];

    // If no comments exist, add some sample comments for testing
    const sampleComments = [
      {
        id: "1",
        userName: "Joseph Eluwa",
        avatar: "",
        timestamp: "3HRS AGO",
        comment: "Wow!! My Faith has just been renewed.",
        likes: 193,
        isLiked: false,
      },
      {
        id: "2",
        userName: "Liz Elizabeth",
        avatar: "",
        timestamp: "24HRS",
        comment: "This sermon really touched my heart. God is working!",
        likes: 45,
        isLiked: false,
      },
      {
        id: "3",
        userName: "Chris Evans",
        avatar: "",
        timestamp: "3 DAYS AGO",
        comment: "Amazing message! Thank you for sharing this.",
        likes: 23,
        isLiked: false,
      },
    ];

    const formattedComments =
      currentComments.length > 0
        ? currentComments.map((comment: any) => ({
            id: comment.id,
            userName: comment.username || "Anonymous",
            avatar: comment.userAvatar || "",
            timestamp: comment.timestamp,
            comment: comment.comment,
            likes: comment.likes || 0,
            isLiked: comment.isLiked || false,
          }))
        : sampleComments;

    return (
      <View className="flex flex-col">
        <View className="w-full h-[393px] overflow-hidden relative">
          <Image
            source={thumbnailSource}
            className="w-full h-full absolute"
            resizeMode="cover"
          />

          {/* Center Play/Pause button */}
          <View className="absolute inset-0 justify-center items-center">
            <TouchableOpacity
              onPress={() => playAudio(audio.fileUrl, modalKey)}
              className="bg-white/70 p-2 rounded-full"
              activeOpacity={0.9}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={32}
                color="#FEA74E"
              />
            </TouchableOpacity>
          </View>

          {/* Right side actions */}
          <View className="flex-col absolute mt-[170px] right-4">
            <TouchableOpacity
              onPress={() => handleFavorite(key, audio)}
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
            <View className="flex-col justify-center items-center mt-6">
              <CommentIcon
                comments={formattedComments}
                size={30}
                color="white"
                showCount={true}
                count={
                  stats.comment === 1
                    ? (audio.comment ?? 0) + 1
                    : audio.comment ?? 0
                }
                layout="vertical"
              />
            </View>
            <TouchableOpacity
              onPress={() => handleSave(key, audio)}
              className="flex-col justify-center items-center mt-6"
            >
              <MaterialIcons
                name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                size={30}
                color={stats.saved === 1 ? "#FEA74E" : "#FFFFFF"}
              />
              <Text className="text-[10px] text-white font-rubik-semibold">
                {stats.saved === 1 ? (audio.saved ?? 0) + 1 : audio.saved ?? 0}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Controls: progress and mute, styled similar to video */}
          <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
            <TouchableOpacity
              onPress={() => playAudio(audio.fileUrl, modalKey)}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color="#FEA74E"
              />
            </TouchableOpacity>
            <View className="flex-1 h-1 bg-white/30 rounded-full relative">
              <View
                className="h-full bg-[#FEA74E] rounded-full"
                style={{ width: `${currentProgress * 100}%` }}
              />
              <View
                style={{
                  position: "absolute",
                  left: `${currentProgress * 100}%`,
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
              onPress={async () => {
                const contentType = audio.fileUrl?.includes(".mp4")
                  ? "video"
                  : "audio";
                const downloadableItem = convertToDownloadableItem(
                  audio,
                  contentType
                );
                const result = await handleDownload(downloadableItem);
                if (result.success) {
                  setModalVisible(null);
                }
              }}
            >
              <Ionicons
                name={
                  checkIfDownloaded(audio._id || audio.fileUrl)
                    ? "checkmark-circle"
                    : "download-outline"
                }
                size={20}
                color="#FEA74E"
              />
            </TouchableOpacity>
          </View>

          {/* Title overlay above controls */}
          <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
            <Text
              className="text-white font-semibold text-[14px]"
              numberOfLines={2}
            >
              {audio.title}
            </Text>
          </View>
        </View>

        {/* Footer under the card: avatar, time and share */}
        <View className="flex-row items-center justify-between mt-1 px-3 mb-4">
          <View className="flex flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
              <Image
                source={getUserAvatarFromContent(audio)}
                style={{ width: 30, height: 30, borderRadius: 999 }}
                resizeMode="cover"
              />
            </View>
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                  {getUserDisplayNameFromContent(audio)}
                </Text>
                <View className="flex flex-row mt-2 ml-2">
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {getTimeAgo(audio.createdAt)}
                  </Text>
                </View>
              </View>
              <View className="flex-row mt-2">
                <View className="flex-row items-center">
                  <AntDesign name="eye" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
                    {stats.views ?? audio.views ?? 0}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleShare(key, audio)}
                  className="flex-row items-center ml-4"
                >
                  <Feather name="send" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.sheared ?? audio.sheared ?? 0}
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

        {/* Vertical pop modal, same behavior as video cards */}
        {modalVisible === modalKey && (
          <>
            <TouchableWithoutFeedback onPress={() => setModalVisible(null)}>
              <View className="absolute inset-0 z-40" />
            </TouchableWithoutFeedback>
            <View className="absolute bottom-24 right-16 bg-white shadow-md rounded-lg p-3 z-50 w-[200px] h-[180]">
              <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                <Text className="text-[#1D2939] font-rubik ml-2">
                  View Details
                </Text>
                <Ionicons name="eye-outline" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleShare(key, audio)}
                className="py-2 border-b border-gray-200 flex-row items-center justify-between"
              >
                <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
                <Feather name="send" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center justify-between mt-6"
                onPress={() => handleSave(key, audio)}
              >
                <Text className="text-[#1D2939] font-rubik ml-2">
                  {stats.saved === 1
                    ? "Remove from Library"
                    : "Save to Library"}
                </Text>
                <MaterialIcons
                  name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                  size={22}
                  color="#1D2939"
                />
              </TouchableOpacity>
              <TouchableOpacity className="py-2 flex-row items-center justify-between border-t border-gray-200 mt-2">
                <Text className="text-[#1D2939] font-rubik ml-2">Download</Text>
                <Ionicons name="download-outline" size={24} color="#090E24" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  // Function to determine if content is video or audio and render appropriately
  const renderSermonCard = (
    item: any,
    index: number,
    sectionId: string,
    playType: "progress" | "center" = "center"
  ) => {
    // Check if it's a video based on file extension or mime type
    const fileUrlString = typeof item.fileUrl === "string" ? item.fileUrl : "";
    const isVideo =
      fileUrlString.includes(".mp4") ||
      fileUrlString.includes(".mov") ||
      fileUrlString.includes(".avi");

    if (isVideo) {
      return renderVideoCard(item, index, sectionId, playType);
    } else {
      return renderAudioCard(item, index, sectionId, playType);
    }
  };

  const renderVideoCard = (
    video: any,
    index: number,
    sectionId: string,
    playType: "progress" | "center" = "center"
  ) => {
    const modalKey = `${sectionId}-${index}`;
    const imageSource = video.imageUrl || { uri: video.fileUrl };
    const speakerName = getDisplayName(video.speaker, video.uploadedBy);
    const speakerAvatar =
      typeof video.speakerAvatar === "string" &&
      video.speakerAvatar.startsWith("http")
        ? { uri: video.speakerAvatar }
        : video.speakerAvatar || require("../../assets/images/Avatar-1.png");
    const key = `${video.contentType}-${video._id || video.fileUrl || index}`;
    const stats = contentStats[key] || {};
    const isItemSaved = libraryStore.isItemSaved(key);

    const isValidUri = (u: any) =>
      typeof u === "string" &&
      u.trim().length > 0 &&
      /^https?:\/\//.test(u.trim());
    const safeVideoUri = isValidUri(video.fileUrl)
      ? String(video.fileUrl).trim()
      : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

    return (
      <View className="flex flex-col">
        <TouchableOpacity
          key={modalKey}
          onPress={video.onPress}
          className="mr-4 w-full h-[436px]"
          activeOpacity={0.9}
        >
          <View className="w-full h-[393px] overflow-hidden relative">
            <Video
              ref={(ref) => {
                if (ref) {
                  videoRefs.current[modalKey] = ref;
                } else {
                  delete videoRefs.current[modalKey];
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
                globalVideoStore.pauseVideo(modalKey);
              }}
              onPlaybackStatusUpdate={(status) => {
                if (!status.isLoaded) return;
                const pct = status.durationMillis
                  ? (status.positionMillis / status.durationMillis) * 100
                  : 0;
                globalVideoStore.setVideoProgress(modalKey, pct);
                const ref = videoRefs.current[modalKey];
                if (status.didJustFinish) {
                  if (!viewCounted[modalKey]) {
                    incrementView(key, video);
                    setViewCounted((prev) => ({ ...prev, [modalKey]: true }));
                  }
                  ref?.setPositionAsync(0);
                  globalVideoStore.pauseVideo(modalKey);
                  globalVideoStore.setVideoCompleted(modalKey, true);
                }
              }}
            />

            {/* Right side interaction buttons */}
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
              <TouchableOpacity className="flex-col justify-center items-center mt-6">
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

            {/* Centered Play/Pause Button */}
            <View className="absolute inset-0 justify-center items-center">
              <TouchableOpacity
                onPress={() => handleVideoTap(modalKey, video, index)}
              >
                <View
                  className={`${
                    globalVideoStore.playingVideos[modalKey]
                      ? "bg-black/30"
                      : "bg-white/70"
                  } p-3 rounded-full`}
                >
                  <Ionicons
                    name={
                      globalVideoStore.playingVideos[modalKey]
                        ? "pause"
                        : "play"
                    }
                    size={32}
                    color={
                      globalVideoStore.playingVideos[modalKey]
                        ? "#FFFFFF"
                        : "#FEA74E"
                    }
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Video Title - show when paused */}
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

            {/* Bottom Controls */}
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

          {/* Footer */}
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

          {/* Modal */}
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
        </TouchableOpacity>
      </View>
    );
  };

  const renderMiniCards = (
    title: string,
    items: RecommendedItem[],
    modalIndex: number | null,
    setModalIndex: any
  ) => (
    <View className="mt-9 mb-3">
      <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-3 ">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {items.map((item, index) => (
          <View
            key={`${title}-${item.title}-${index}`}
            className="mr-4 w-[154px] flex-col items-center"
          >
            <TouchableOpacity
              onPress={item.onPress}
              className="w-full h-[232px] rounded-2xl overflow-hidden relative"
              activeOpacity={0.9}
            >
              <Image
                source={item.imageUrl}
                className="w-full h-full absolute"
                resizeMode="cover"
              />
              <View className="absolute inset-0 justify-center items-center">
                <View className="bg-white/70 p-2 rounded-full">
                  <Ionicons name="play" size={24} color="#FEA74E" />
                </View>
              </View>
              <View className="absolute bottom-2 left-2 right-2">
                <Text
                  className="text-white text-start text-[14px] ml-1 mb-6 font-rubik"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
            {modalIndex === index && (
              <>
                <TouchableWithoutFeedback onPress={() => setModalIndex(null)}>
                  <View className="absolute inset-0 z-40" />
                </TouchableWithoutFeedback>
                <View className="absolute mt-[26px] left-1 bg-white shadow-md rounded-lg p-3 z-50 w-30">
                  <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                    <Text className="text-[#1D2939] font-rubik ml-2">
                      View Details
                    </Text>
                    <Ionicons name="eye-outline" size={16} color="##3A3E50" />
                  </TouchableOpacity>
                  <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                    <Text className="text-sm text-[#1D2939] font-rubik ml-2">
                      Share
                    </Text>
                    <AntDesign name="share-alt" size={16} color="#3A3E50" />
                  </TouchableOpacity>
                  <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                    <Text className="text-[#1D2939] font-rubik mr-2">
                      Save to Library
                    </Text>
                    <MaterialIcons
                      name="library-add"
                      size={18}
                      color="#3A3E50"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="py-2 flex-row items-center justify-between"
                    onPress={async () => {
                      const contentType = item.fileUrl?.includes(".mp4")
                        ? "video"
                        : "audio";
                      const downloadableItem = convertToDownloadableItem(
                        item,
                        contentType
                      );
                      const result = await handleDownload(downloadableItem);
                      if (result.success) {
                        setModalIndex(null);
                        // Force re-render to update download status
                        await loadDownloadedItems();
                      }
                    }}
                  >
                    <Text className="text-[#1D2939] font-rubik ml-2">
                      {checkIfDownloaded((item as any)._id || item.fileUrl)
                        ? "Downloaded"
                        : "Download"}
                    </Text>
                    <Ionicons
                      name={
                        checkIfDownloaded((item as any)._id || item.fileUrl)
                          ? "checkmark-circle"
                          : "download-outline"
                      }
                      size={16}
                      color={
                        checkIfDownloaded((item as any)._id || item.fileUrl)
                          ? "#256E63"
                          : "#3A3E50"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
            <View className="mt-2 flex flex-col w-full">
              <View className="flex flex-row justify-between items-center">
                <Text
                  className="text-[12px] text-[#1D2939] font-rubik font-medium"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.subTitle?.split(" ").slice(0, 4).join(" ") + " ..."}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setModalIndex(modalIndex === index ? null : index)
                  }
                  className="mr-2"
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={14}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center">
                <Feather name="eye" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik">
                  {item.views}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScrollView
      className="flex-1"
      onScrollBeginDrag={() => {
        setModalVisible(null);
        setPvModalIndex(null);
        setRsModalIndex(null);
        setTrendingModalIndex(null);
        setRecommendedModalIndex(null);
      }}
      onTouchStart={() => {
        setModalVisible(null);
        setPvModalIndex(null);
        setRsModalIndex(null);
        setTrendingModalIndex(null);
        setRecommendedModalIndex(null);
      }}
    >
      {/* 1. Most Recent Upload */}
      {recentSermons.length > 0 && (
        <View className="mt-4">
          <Text className="text-[#344054] text-[16px] font-rubik-semibold mb-4 ml-2">
            Most Recent
          </Text>
          {recentSermons.map((item, index) =>
            renderSermonCard(
              {
                ...item,
                views: (item as any).views || 0,
                favorite: item.favorite || 0,
                saved: item.saved || 0,
                sheared: item.sheared || 0,
                onPress: item.onPress,
              },
              index,
              "recent",
              "progress"
            )
          )}
        </View>
      )}

      {/* 2. Previously Viewed */}
      {previouslyViewed.length > 0 &&
        renderMiniCards(
          "Previously Viewed",
          previouslyViewed,
          pvModalIndex,
          setPvModalIndex
        )}

      {/* 3. First 4 Explore More Sermon */}
      {exploreMoreSermons.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            Explore More Sermon
          </Text>
          <View className="gap-12">
            {exploreMoreSermons.map((video, index) => (
              <View key={`ExploreMoreFirst-${video._id}-${index}`}>
                {renderSermonCard(video, index, "explore", "center")}
              </View>
            ))}
          </View>
        </>
      )}

      {/* 4. Trending Now */}
      {trendingSermons.length > 0 &&
        renderMiniCards(
          "Trending Now",
          trendingSermons.map((item, index) => ({
            key: `trending-sermon-${(item as any)._id || index}`,
            fileUrl: item.fileUrl,
            title: item.title,
            imageUrl: item.imageUrl || { uri: item.fileUrl },
            subTitle: getDisplayName(item.speaker, item.uploadedBy),
            views: (item as any).views || 0,
            onPress: () => console.log("Viewing", item.title),
          })),
          trendingModalIndex,
          setTrendingModalIndex
        )}

      {/* 5. Second 4 Explore More Sermon */}
      {sermonContent.length > 5 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            Explore More Sermon
          </Text>
          <View className="gap-12">
            {sermonContent.slice(5, 9).map((video, index) => (
              <View key={`ExploreMoreSecond-${video._id}-${index}`}>
                {renderSermonCard(video, index, "exploreSecond", "center")}
              </View>
            ))}
          </View>
        </>
      )}

      {/* 6. Recommended For You */}
      {recommendedSermons.length > 0 &&
        renderMiniCards(
          "Recommended for you",
          recommendedSermons.map((item, index) => ({
            key: `recommended-sermon-${(item as any)._id || index}`,
            fileUrl: item.fileUrl,
            title: item.title,
            imageUrl: item.imageUrl || { uri: item.fileUrl },
            subTitle: getDisplayName(item.speaker, item.uploadedBy),
            views: (item as any).views || 0,
            onPress: () => console.log("Viewing", item.title),
          })),
          recommendedModalIndex,
          setRecommendedModalIndex
        )}

      {/* 7. Remaining Explore More Sermon */}
      {sermonContent.length > 9 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            Explore More Sermon
          </Text>
          <View className="gap-12">
            {sermonContent.slice(9).map((video, index) => (
              <View key={`ExploreMoreRest-${video._id}-${index}`}>
                {renderSermonCard(video, index, "exploreRest", "center")}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Empty State */}
      {sermonContent.length === 0 && (
        <View className="flex-1 justify-center items-center mt-20">
          <Text className="text-gray-500 text-center text-lg font-rubik">
            No sermon content available yet.
          </Text>
          <Text className="text-gray-400 text-center text-sm font-rubik mt-2">
            Upload sermon content to see it here.
          </Text>
        </View>
      )}

      {/* Bottom spacing to ensure last card footer is fully visible */}
      <View className="h-20" />
    </ScrollView>
  );
}
