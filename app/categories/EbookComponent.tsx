import {
    AntDesign,
    Fontisto,
    Ionicons,
    MaterialIcons,
} from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { useDownloadStore } from "../store/useDownloadStore";
import { useMediaStore } from "../store/useUploadStore";
import { convertToDownloadableItem, useDownloadHandler } from "../utils/downloadUtils";

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

  useFocusEffect(
    useCallback(() => {
      mediaStore.refreshUserDataForExistingMedia();
      loadDownloadedItems();
    }, [])
  );

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
                  <Ionicons name="eye-outline" size={16} color="#3A3E50" />
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
                  source={ebook.speakerAvatar}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 999,
                    marginLeft: 26,
                    marginTop: 15,
                  }}
                  resizeMode="cover"
                />
              </View>
              <View className="ml-3">
                <View className="flex-row items center">
                  <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                    {ebook.speaker || ebook.uploadedBy || "Unknown Author"}
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
                    <Image
                      source={require("../../assets/images/Vector1.png")}
                      className="h-[16px] w-[16px] ml-1"
                      resizeMode="contain"
                    />
                    <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
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
                  <Ionicons name="eye-outline" size={16} color="##3A3E50" />
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
              <View className="flex-row items-center">
                <Image
                  source={require("../../assets/images/Vector1.png")}
                  className="h-[16px] w-[16px] ml-1"
                  resizeMode="contain"
                />
                <Text className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik">
                  {item.views || 0}
                </Text>
              </View>
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
      {/* Recent */}
      {recentEbooks.length > 0 && (
      <View className="mt-4">
        <Text className="text-[#344054] text-[16px] font-rubik-semibold mb-4">
            Recent
        </Text>
          {recentEbooks.map((ebook, index) => (
            <View key={`recent-${ebook._id}-${index}`}>
              {renderEbookCard(ebook, index, "recent")}
          </View>
        ))}
      </View>
      )}

      {/* Previously Viewed */}
      {previouslyViewed.length > 0 && 
        renderMiniCards(
        "Previously Viewed",
        previouslyViewed,
        pvModalIndex,
        setPvModalIndex
        )
      }

      {/* Explore More Ebook */}
      {exploreMoreEbooks.length > 0 && 
        renderMiniCards(
          "Explore More Ebook",
          exploreMoreEbooks,
        rsModalIndex,
        setRsModalIndex
        )
      }

      {/* Trending */}
      {trendingEbooks.length > 0 && (
      <View className="mt-9 gap-12">
          {trendingEbooks.map((ebook, index) => (
            <View key={`trending-${ebook._id}-${index}`}>
              {renderEbookCard(ebook, index, "trending")}
          </View>
        ))}
      </View>
      )}

      {/* Recommended for Explore More Ebook */}
      {recommendedEbooks.length > 0 && 
        renderMiniCards(
          "Recommended for Explore More Ebook",
          recommendedEbooks,
          rsModalIndex,
          setRsModalIndex
        )
      }
    </ScrollView>
  );
}
