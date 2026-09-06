import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import {
  Image,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CommentIcon from "../../../../src/shared/components/CommentIcon";
import {
  convertToDownloadableItem,
  useDownloadHandler,
} from "../../../utils/downloadUtils";
import {
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
} from "../../../utils/userValidation";
import { getContentKey, getTimeAgo } from "../utils";

export interface SermonAudioCardProps {
  audio: any;
  index: number;
  sectionId: string;
  playingAudioId: string | null;
  audioProgressMap: Record<string, number>;
  contentStats: Record<string, any>;
  userFavorites: Record<string, boolean>;
  globalFavoriteCounts: Record<string, number>;
  modalVisible: string | null;
  comments: Record<string, any[]>;
  playAudio: (uri: string, id: string, title?: string) => void;
  handleFavorite: (key: string, item: any) => void;
  handleSave: (key: string, item: any) => void;
  handleShare: (key: string, item: any) => void;
  setModalVisible: (key: string | null) => void;
  onDownloadSuccess: (message: string) => void;
}

export default function SermonAudioCard({
  audio,
  index,
  sectionId,
  playingAudioId,
  audioProgressMap,
  contentStats,
  userFavorites,
  globalFavoriteCounts,
  modalVisible,
  comments,
  playAudio,
  handleFavorite,
  handleSave,
  handleShare,
  setModalVisible,
  onDownloadSuccess,
}: SermonAudioCardProps) {
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();

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
  const sermonId = audio._id || modalKey;
  const isPlaying = playingAudioId === sermonId;
  const currentProgress = audioProgressMap[sermonId] || 0;

  const contentId = audio._id || modalKey;
  const currentComments = comments[contentId] || [];

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

        <View className="absolute inset-0 justify-center items-center">
          <TouchableOpacity
            onPress={() =>
              playAudio(audio.fileUrl, audio._id || modalKey, audio.title)
            }
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

        <View className="flex-col absolute mt-[180px] right-4">
          <TouchableOpacity
            onPress={() => handleFavorite(key, audio)}
            className="flex-col justify-center items-center"
          >
            <MaterialIcons
              name={userFavorites[key] ? "favorite" : "favorite-border"}
              size={30}
              color={userFavorites[key] ? "#D22A2A" : "#FFFFFF"}
            />
            <Text className="text-[10px] text-white font-jakarta-semibold">
              {globalFavoriteCounts[key] || 0}
            </Text>
          </TouchableOpacity>
          <View
            className="flex-col justify-center items-center mt-8"
            style={{
              minHeight: 60,
              minWidth: 60,
              zIndex: 2,
            }}
          >
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
              contentId={contentId}
            />
          </View>
          <TouchableOpacity
            onPress={() => handleSave(key, audio)}
            className="flex-col justify-center items-center mt-8"
          >
            <MaterialIcons
              name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
              size={30}
              color={stats.saved === 1 ? "#FEA74E" : "#FFFFFF"}
            />
            <Text className="text-[10px] text-white font-jakarta-semibold">
              {stats.saved === 1 ? (audio.saved ?? 0) + 1 : audio.saved ?? 0}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
          <TouchableOpacity
            onPress={() =>
              playAudio(audio.fileUrl, audio._id || modalKey, audio.title)
            }
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
                onDownloadSuccess("Downloaded successfully!");
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

        <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
          <Text
            className="text-white font-semibold text-[14px]"
            numberOfLines={2}
          >
            {audio.title}
          </Text>
        </View>
      </View>

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
              <Text className="ml-1 text-[13px] font-jakarta-semibold text-[#344054] mt-1">
                {getUserDisplayNameFromContent(audio)}
              </Text>
              <View className="flex flex-row mt-2 ml-2">
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text className="text-[10px] text-gray-500 ml-1 font-jakarta">
                  {getTimeAgo(audio.createdAt)}
                </Text>
              </View>
            </View>
            <View className="flex-row mt-2">
              <View className="flex-row items-center">
                <AntDesign name="eye" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-jakarta">
                  {stats.views ?? audio.views ?? 0}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleShare(key, audio)}
                className="flex-row items-center ml-4"
              >
                <Feather name="send" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 font-jakarta">
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

      {modalVisible === modalKey && (
        <>
          <TouchableWithoutFeedback onPress={() => setModalVisible(null)}>
            <View className="absolute inset-0 z-40" />
          </TouchableWithoutFeedback>
          <View className="absolute bottom-24 right-16 bg-white shadow-md rounded-lg p-3 z-50 w-[200px] h-[180]">
            <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-[#1D2939] font-jakarta ml-2">
                View Details
              </Text>
              <Ionicons name="eye-outline" size={22} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleShare(key, audio)}
              className="py-2 border-b border-gray-200 flex-row items-center justify-between"
            >
              <Text className="text-[#1D2939] font-jakarta ml-2">Share</Text>
              <Feather name="send" size={22} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-between mt-6"
              onPress={() => handleSave(key, audio)}
            >
              <Text className="text-[#1D2939] font-jakarta ml-2">
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
              <Text className="text-[#1D2939] font-jakarta ml-2">Download</Text>
              <Ionicons name="download-outline" size={24} color="#090E24" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
