import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { MutableRefObject } from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useVideoNavigation } from "../../../hooks/useVideoNavigation";
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
  handleComment: (key: string, item: any) => void;
}

export default function SermonVideoCard({
  video,
  index,
  sectionId,
  contentStats,
  userFavorites,
  globalFavoriteCounts,
  modalVisible,
  handleFavorite,
  handleSave,
  handleShare,
  setModalVisible,
  handleComment,
}: SermonVideoCardProps) {
  const { navigateToReels } = useVideoNavigation();
  const modalKey = `${sectionId}-${index}`;
  const key = `${video.contentType}-${video._id || video.fileUrl || index}`;
  const stats = contentStats[key] || {};

  const poster =
    typeof video.thumbnailUrl === "string" && video.thumbnailUrl
      ? { uri: video.thumbnailUrl }
      : typeof video.imageUrl === "string" && video.imageUrl
        ? { uri: video.imageUrl }
        : require("../../../../assets/images/image (10).png");

  const openReels = () => {
    navigateToReels({
      video,
      index: 0,
      allVideos: [video],
      contentStats,
      globalFavoriteCounts,
      getContentKey: (v: any) => String(v._id || v.id || ""),
      getTimeAgo,
      getDisplayName: () => getUserDisplayNameFromContent(video),
      source: "SermonComponent",
      category: "sermon",
    });
  };

  return (
    <View className="flex flex-col">
      <View key={modalKey} className="mr-4 w-full h-[436px]">
        <View className="w-full h-[393px] overflow-hidden relative bg-black">
          <Image
            source={poster}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode="cover"
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
              onPress={() => handleComment(key, video)}
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
            <TouchableOpacity onPress={openReels}>
              <View className="bg-white/70 p-4 rounded-full">
                <Ionicons name="play" size={40} color="#FEA74E" />
              </View>
            </TouchableOpacity>
          </View>

          <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
            <Text
              className="text-white font-semibold text-[14px]"
              numberOfLines={2}
            >
              {video.title}
            </Text>
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
                <MaterialIcons name="bookmark-border" size={22} color="#1D2939" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
