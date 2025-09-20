import {
    AntDesign,
    Fontisto,
    Ionicons,
    MaterialIcons
} from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import CommentIcon from "../components/CommentIcon";
import { useCommentModal } from "../context/CommentModalContext";
import { useDownloadStore } from "../store/useDownloadStore";
import { useInteractionStore } from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaStore } from "../store/useUploadStore";
import { convertToDownloadableItem, useDownloadHandler } from "../utils/downloadUtils";
import { getPersistedStats, toggleFavorite } from "../utils/persistentStorage";
import { getUserAvatarFromContent, getUserDisplayNameFromContent } from "../utils/userValidation";

interface EbookItem {
  _id?: string;
  title: string;
  description?: string;
  speaker?: string;
  uploadedBy?: string;
  createdAt: string;
  timeAgo?: string;
  speakerAvatar?: any;
  views?: number;
  favorite?: number;
  saved?: number;
  sheared?: number;
  imageUrl?: any;
  fileUrl?: string;
  onPress?: () => void;
}

export default function EbookComponent() {
  const mediaStore = useMediaStore();
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [pvModalIndex, setPvModalIndex] = useState<number | null>(null);
  const [rsModalIndex, setRsModalIndex] = useState<number | null>(null);
  
  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();
  
  // Interaction functionality
  const { showCommentModal } = useCommentModal();
  const { userFavorites, globalFavoriteCounts, comments } = useInteractionStore();
  const { addToLibrary, removeFromLibrary, isInLibrary } = useLibraryStore();

  useFocusEffect(
    useCallback(() => {
      mediaStore.refreshUserDataForExistingMedia();
      loadDownloadedItems();
    }, [])
  );

  // Helper functions
  const getContentKey = (item: EbookItem) => item._id || item.fileUrl || item.title;
  
  const handleFavorite = async (key: string, item: EbookItem) => {
    await toggleFavorite(key, item);
  };

  const handleComment = (key: string, item: EbookItem) => {
    const contentId = item._id || key;
    const currentComments = comments[contentId] || [];
    const formattedComments = currentComments.map((comment: any) => ({
      id: comment.id,
      userName: comment.username || 'Anonymous',
      avatar: comment.userAvatar || '',
      timestamp: comment.timestamp,
      comment: comment.comment,
      likes: comment.likes || 0,
      isLiked: comment.isLiked || false,
    }));
    showCommentModal(formattedComments, contentId);
  };

  const handleSave = async (key: string, item: EbookItem) => {
    const contentKey = getContentKey(item);
    if (isInLibrary(contentKey)) {
      removeFromLibrary(contentKey);
    } else {
      addToLibrary({
        id: contentKey,
        title: item.title,
        type: 'ebook',
        fileUrl: item.fileUrl || '',
        imageUrl: item.imageUrl,
        speaker: item.speaker || item.uploadedBy || 'Unknown',
        createdAt: item.createdAt,
      });
    }
  };

  const handleDownloadPress = async (item: EbookItem) => {
    const downloadableItem = convertToDownloadableItem(item, 'ebook');
    const result = await handleDownload(downloadableItem);
    if (result.success) {
      await loadDownloadedItems();
    }
  };

  // Filter ebooks from media store
  const ebookItems = mediaStore.mediaList.filter(item => 
    item.contentType === "ebook" || item.contentType === "books"
  );
  
  console.log("📚 EbookComponent - Total media items:", mediaStore.mediaList.length);
  console.log("📚 EbookComponent - Ebook items found:", ebookItems.length);
  console.log("📚 EbookComponent - Ebook items:", ebookItems.map(e => ({ title: e.title, contentType: e.contentType })));

  // Get time ago for items
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffMs = now.getTime() - posted.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "NOW";
    if (minutes < 60) return `${minutes}MIN AGO`;
    if (hours < 24) return `${hours}HRS AGO`;
    return `${days}DAYS AGO`;
  };

  // Process ebook items with time ago
  const processedEbooks = ebookItems.map(item => ({
    ...item,
    timeAgo: getTimeAgo(item.createdAt),
    speakerAvatar: item.speakerAvatar || require("../../assets/images/Avatar-1.png"),
    imageUrl: item.imageUrl || require("../../assets/images/image (12).png"),
  }));

  // Categorize ebooks
  const recentEbooks = processedEbooks.slice(0, 1);
  const previouslyViewed = processedEbooks.slice(1, 4);
  const exploreMoreEbooks = processedEbooks.slice(4, 8);
  const trendingEbooks = processedEbooks.slice(8, 12);
  const recommendedEbooks = processedEbooks.slice(12, 16);

  const renderEbookCard = (
    ebook: EbookItem,
    index: number,
    sectionId: string
  ) => {
    const modalKey = `${sectionId}-${index}`;
    return (
      <View className="flex flex-col">
        <TouchableOpacity
          key={modalKey}
          onPress={ebook.onPress}
          className="mr-4 w-full h-[436px]"
          activeOpacity={0.9}
        >
          <View className="w-full h-[393px] overflow-hidden relative">
            <Image
              source={ebook.imageUrl}
              className="w-full h-full absolute"
              resizeMode="cover"
            />

            <View className="absolute bottom-3 left-3 right-3">
              <Text
                className="text-white text-base font-bold"
                numberOfLines={2}
              >
                {ebook.title}
              </Text>
            </View>

            {modalVisible === modalKey && (
              <>
                <TouchableWithoutFeedback onPress={() => setModalVisible(null)}>
                  <View className="absolute inset-0 z-40" />
                </TouchableWithoutFeedback>
                <View className="absolute mt-[260px] right-4 bg-white shadow-md rounded-lg p-3 z-50 w-56 h-[180px]">
                <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                  <Text className="text-[#1D2939] font-rubik ml-2">
                    View Details
                  </Text>
                  <MaterialIcons name="visibility" size={16} color="#3A3E50" />
                </TouchableOpacity>
                <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                  <Text className="text-sm text-[#1D2939] font-rubik ml-2">
                    Share
                  </Text>
                  <AntDesign name="sharealt" size={16} color="#3A3E50" />
                </TouchableOpacity>
                <TouchableOpacity className="py-2 flex-row items-center justify-between">
                  <Text className="text-[#1D2939] font-rubik ml-2">
                    Save to Library
                  </Text>
                  <MaterialIcons name="library-add" size={18} color="#3A3E50" />
                </TouchableOpacity>
                <View className="h-px bg-gray-200 my-1" />
                <TouchableOpacity 
                  className="py-2 flex-row items-center justify-between"
                  onPress={async () => {
                    const downloadableItem = convertToDownloadableItem(ebook, 'ebook');
                    const result = await handleDownload(downloadableItem);
                    if (result.success) {
                      setModalVisible(null);
                    }
                  }}
                >
                  <Text className="text-[#1D2939] font-rubik ml-2">
                    {checkIfDownloaded(ebook._id || ebook.fileUrl) ? "Downloaded" : "Download"}
                  </Text>
                  <Ionicons 
                    name={checkIfDownloaded(ebook._id || ebook.fileUrl) ? "checkmark-circle" : "download-outline"} 
                    size={24} 
                    color={checkIfDownloaded(ebook._id || ebook.fileUrl) ? "#256E63" : "#090E24"} 
                  />
                </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Speaker info and stats */}
          <View className="flex-row items-center justify-between mt-1">
            <View className="flex flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
                <Image
                  source={getUserAvatarFromContent(ebook)}
                  style={{ width: 30, height: 30, borderRadius: 999 }}
                  resizeMode="cover"
                />
              </View>
              <View className="ml-3">
                <View className="flex-row items-center">
                  <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                    {getUserDisplayNameFromContent(ebook)}
                  </Text>
                  <View className="flex flex-row mt-2 ml-2">
                    <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {ebook.timeAgo}
                    </Text>
                  </View>
                </View>
                <View className="flex flex-row mt-2">
                  <View className="flex-row items-center">
                    <MaterialIcons name="visibility" size={16} color="#98A2B3" />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {ebook.views || 0}
                    </Text>
                  </View>
                  <View className="flex-row items-center ml-4">
                    <AntDesign name="sharealt" size={16} color="#98A2B3" />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {ebook.sheared || 0}
                    </Text>
                  </View>
                  <View className="flex-row items-center ml-6">
                    <Fontisto name="favorite" size={14} color="#98A2B3" />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {ebook.saved || 0}
                    </Text>
                  </View>
                  <View className="flex-row items-center ml-6">
                    <MaterialIcons
                      name="favorite-border"
                      size={16}
                      color="#98A2B3"
                    />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {ebook.favorite || 0}
                    </Text>
                  </View>
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
        </TouchableOpacity>
      </View>
    );
  };

  const renderMiniCards = (
    title: string,
    items: EbookItem[],
    modalIndex: number | null,
    setModalIndex: any
  ) => (
    <View className="mt-5">
      <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-2 ml-2">
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
              <View className="absolute mt-[26px] left-1 bg-white shadow-md rounded-lg p-3 z-50 w-30">
                <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                  <Text className="text-[#1D2939] font-rubik ml-2">
                    View Details
                  </Text>
                  <MaterialIcons name="visibility" size={16} color="#3A3E50" />
                </TouchableOpacity>
                <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                  <Text className="text-sm text-[#1D2939] font-rubik ml-2">
                    Share
                  </Text>
                  <AntDesign name="sharealt" size={16} color="##3A3E50" />
                </TouchableOpacity>
                <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                  <Text className="text-[#1D2939] font-rubik mr-2">
                    Save to Library
                  </Text>
                  <MaterialIcons name="library-add" size={18} color="#3A3E50" />
                </TouchableOpacity>
                <TouchableOpacity 
                  className="py-2 flex-row items-center justify-between"
                  onPress={async () => {
                    const downloadableItem = convertToDownloadableItem(item, 'ebook');
                    const result = await handleDownload(downloadableItem);
                    if (result.success) {
                      setModalIndex(null);
                      // Force re-render to update download status
                      await loadDownloadedItems();
                    }
                  }}
                >
                  <Text className="text-[#1D2939] font-rubik ml-2">
                    {checkIfDownloaded(item._id || item.fileUrl) ? "Downloaded" : "Download"}
                  </Text>
                  <Ionicons 
                    name={checkIfDownloaded(item._id || item.fileUrl) ? "checkmark-circle" : "download-outline"} 
                    size={16} 
                    color={checkIfDownloaded(item._id || item.fileUrl) ? "#256E63" : "#3A3E50"} 
                  />
                </TouchableOpacity>
              </View>
            )}
            <View className="mt-2 flex flex-col w-full">
              <View className="flex flex-row justify-between items-center">
                <Text
                  className="text-[12px] text-[#1D2939] font-rubik font-medium"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.speaker || item.uploadedBy || "Unknown Author"}
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
              {(() => {
                const key = getContentKey(item);
                const stats = getPersistedStats(key) || {};
                const contentId = item._id || key;
                const currentComments = comments[contentId] || [];
                const formattedComments = currentComments.map((comment: any) => ({
                  id: comment.id,
                  userName: comment.username || 'Anonymous',
                  avatar: comment.userAvatar || '',
                  timestamp: comment.timestamp,
                  comment: comment.comment,
                  likes: comment.likes || 0,
                  isLiked: comment.isLiked || false,
                }));
                return (
                  <View className="flex-row mt-2 items-center justify-between pl-2 pr-8">
                <View className="flex-row items-center mr-6">
                  <MaterialIcons name="visibility" size={28} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {item.views || 0}
                </Text>
              </View>
                <TouchableOpacity onPress={() => handleFavorite(key, item)} className="flex-row items-center mr-6">
                  <MaterialIcons
                    name={userFavorites[key] ? "favorite" : "favorite-border"}
                    size={28}
                    color={userFavorites[key] ? "#D22A2A" : "#98A2B3"}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {globalFavoriteCounts[key] || 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-row items-center mr-6"
                  onPress={() => handleComment(key, item)}
                >
                  <CommentIcon 
                    comments={formattedComments}
                    size={28}
                    color="#98A2B3"
                    showCount={true}
                    count={stats.comment === 1 ? (item.comment ?? 0) + 1 : item.comment ?? 0}
                    layout="horizontal"
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSave(key, item)} className="flex-row items-center mr-6">
                  <MaterialIcons
                    name={isInLibrary(getContentKey(item)) ? "bookmark" : "bookmark-border"}
                    size={28}
                    color={isInLibrary(getContentKey(item)) ? "#FEA74E" : "#98A2B3"}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {(stats as any)?.totalSaves || item.saved || 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-row items-center"
                  onPress={() => handleDownloadPress(item)}
                >
                  <Ionicons 
                    name={checkIfDownloaded(item._id || item.fileUrl) ? "checkmark-circle" : "download-outline"} 
                    size={28} 
                    color={checkIfDownloaded(item._id || item.fileUrl) ? "#256E63" : "#98A2B3"} 
                  />
                </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // Show empty state if no ebooks
  if (processedEbooks.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-[#344054] text-lg font-rubik-semibold mb-2">
          No Ebooks Available
        </Text>
        <Text className="text-[#667085] text-sm font-rubik text-center px-8">
          Upload PDF ebooks through the upload section to see them here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      onScrollBeginDrag={() => {
        setModalVisible(null);
        setPvModalIndex(null);
        setRsModalIndex(null);
      }}
      onTouchStart={() => {
        setModalVisible(null);
        setPvModalIndex(null);
        setRsModalIndex(null);
      }}
    >
      {/* 1. Most Recent */}
      {recentEbooks.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            Most Recent
          </Text>
          {recentEbooks.slice(0, 1).map((ebook, index) => (
            <View key={`recent-${ebook._id}-${index}`}>
              {renderEbookCard(ebook, index, "recent")}
            </View>
          ))}
        </>
      )}

      {/* 2. Previously Viewed */}
      {renderMiniCards(
        "Previously Viewed",
        previouslyViewed,
        pvModalIndex,
        setPvModalIndex
      )}

      {/* 3. Explore More Ebooks */}
      {recentEbooks.length > 1 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-3">
            Explore More Ebooks
          </Text>
          <View className="gap-8">
            {recentEbooks.slice(1, 5).map((ebook, index) => (
              <View key={`explore-${ebook._id}-${index}`}>
                {renderEbookCard(ebook, index, "explore")}
              </View>
            ))}
          </View>
        </>
      )}

      {/* 4. Trending Now */}
      {trendingEbooks.length > 0 ? (
        renderMiniCards(
          `Trending Now • ${trendingEbooks.length} ebooks`,
          trendingEbooks,
          rsModalIndex,
          setRsModalIndex
        )
      ) : (
        <View className="mt-5 mb-4">
          <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-2 ml-2">
            Trending Now
          </Text>
          <View className="bg-gray-50 rounded-lg p-6 mx-2 items-center">
            <Text className="text-[32px] mb-2">📈</Text>
            <Text className="text-[14px] font-rubik-medium text-[#98A2B3] text-center">
              No trending ebooks yet
            </Text>
            <Text className="text-[12px] font-rubik text-[#D0D5DD] text-center mt-1">
              Keep engaging with content to see trending ebooks here
            </Text>
          </View>
        </View>
      )}

      {/* 5. Exploring More */}
      {recentEbooks.length > 5 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            Exploring More
          </Text>
          <View className="gap-8">
            {recentEbooks.slice(5, 9).map((ebook, index) => (
              <View key={`explore-more-${ebook._id}-${index}`}>
                {renderEbookCard(ebook, index, "explore-more")}
              </View>
            ))}
          </View>
        </>
      )}

      {/* 6. Recommended for You */}
      {recommendedEbooks.length > 0 && (
        renderMiniCards(
          `Recommended for You • ${recommendedEbooks.length} ebooks`,
          recommendedEbooks,
          rsModalIndex,
          setRsModalIndex
        )
      )}

      {/* 7. More Ebooks */}
      {recentEbooks.length > 9 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            More Ebooks
          </Text>
          <View className="gap-8">
            {recentEbooks.slice(9).map((ebook, index) => (
              <View key={`more-${ebook._id}-${index}`}>
                {renderEbookCard(ebook, index, "more")}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Bottom spacing to ensure last card footer is fully visible */}
      <View className="h-20" />
    </ScrollView>
  );
}
