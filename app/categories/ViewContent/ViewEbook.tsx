import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Share from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useMediaStore } from '../../store/useUploadStore';
import { convertToDownloadableItem, useDownloadHandler } from '../../utils/downloadUtils';

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
  isHot?: boolean;
  isRising?: boolean;
  trendingScore?: number;
  personalScore?: number;
}

export default function ViewEbook() {
  const router = useRouter();
  const mediaStore = useMediaStore();
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [pvModalIndex, setPvModalIndex] = useState<number | null>(null);
  const [trendingModalIndex, setTrendingModalIndex] = useState<number | null>(null);
  const [recommendedModalIndex, setRecommendedModalIndex] = useState<number | null>(null);
  
  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();

  useFocusEffect(
    useCallback(() => {
      mediaStore.refreshUserDataForExistingMedia();
    }, [])
  );

  // Filter ebooks from media store
  const ebookItems = mediaStore.mediaList.filter(item => 
    item.contentType === "ebook" || item.contentType === "books"
  );

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
  const processedEbooks: EbookItem[] = ebookItems.map(item => ({
    ...item,
    timeAgo: getTimeAgo(item.createdAt),
    speakerAvatar: item.speakerAvatar || require("../../../assets/images/Avatar-1.png"),
    imageUrl: item.imageUrl || require("../../../assets/images/image (12).png"),
  }));

  // Categorize ebooks for different sections with enhanced logic
  const previouslyViewed = processedEbooks.slice(0, 4);
  const trendingEbooks = processedEbooks.slice(4, 8).map(ebook => ({
    ...ebook,
    isHot: Math.random() > 0.7,
    isRising: Math.random() > 0.8,
    trendingScore: Math.floor(Math.random() * 1000) + 100
  }));
  const recommendedEbooks = processedEbooks.slice(8, 12).map(ebook => ({
    ...ebook,
    personalScore: Math.floor(Math.random() * 500) + 50
  }));

  const closeAllMenus = () => {
    setModalVisible(null);
    setPvModalIndex(null);
    setTrendingModalIndex(null);
    setRecommendedModalIndex(null);
  };

  const handleEbookPress = (ebook: EbookItem) => {
    router.push({
      pathname: "/categories/ViewContent/ViewEbook",
      params: {
        title: ebook.title,
        speaker: ebook.speaker || ebook.uploadedBy || "Unknown Author",
        timeAgo: ebook.timeAgo || "Recent",
        views: String(ebook.views || 0),
        imageUrl: typeof ebook.imageUrl === 'string' ? ebook.imageUrl : '',
        fileUrl: ebook.fileUrl || '',
        category: "ebooks",
      },
    });
  };

  const handleShare = async (ebook: EbookItem) => {
    try {
      await Share.shareAsync(ebook.fileUrl || '', {
        mimeType: 'application/pdf',
        dialogTitle: `Share: ${ebook.title}`,
      });
    } catch (error) {
      console.warn("Share error:", error);
    }
  };

  const renderMiniCards = (
    title: string,
    items: EbookItem[],
    modalIndex: number | null,
    setModalIndex: (val: number | null) => void
  ) => (
    <View className="mb-6">
      <Text className="text-[16px] mb-3 font-rubik-semibold text-[#344054] mt-4">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {items.map((item, index) => {
          const key = `${title}-${item._id || index}`;
          
          return (
            <View key={key} className="mr-4 w-[154px] flex-col items-center">
              <TouchableOpacity
                onPress={() => handleEbookPress(item)}
                className="w-full h-[232px] rounded-2xl overflow-hidden relative"
                activeOpacity={0.9}
              >
                <Image
                  source={item.imageUrl}
                  className="w-full h-full absolute"
                  resizeMode="cover"
                />
                
                {/* Content type indicator */}
                <View className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                  <Ionicons 
                    name="document-text-outline"
                    size={16} 
                    color="#FFFFFF" 
                  />
                </View>


                
                {/* Gradient overlay for better text readability */}
                <View className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                
                <View className="absolute bottom-2 left-2 right-2">
                  <Text
                    className="text-white text-start text-[14px] font-rubik-semibold"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {modalIndex === index && (
                <>
                  <TouchableWithoutFeedback onPress={closeAllMenus}>
                    <View className="absolute inset-0 z-40" />
                  </TouchableWithoutFeedback>
                  
                  {/* Modal content positioned over the ebook area */}
                  <View className="absolute bottom-14 right-3 bg-white shadow-lg rounded-lg p-3 z-50 w-[160px] h-[180px] border border-gray-100">
                    <TouchableOpacity 
                      onPress={() => handleEbookPress(item)}
                      className="py-2 border-b border-gray-200 flex-row items-center justify-between"
                    >
                      <Text className="text-[#1D2939] font-rubik-medium ml-2">View Details</Text>
                      <MaterialIcons name="visibility" size={22} color="#1D2939" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare(item)}
                      className="py-2 border-b border-gray-200 flex-row items-center justify-between"
                    >
                      <Text className="text-[#1D2939] font-rubik-medium ml-2">Share</Text>
                      <Feather name="send" size={22} color="#1D2939" />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center justify-between mt-6">
                      <Text className="text-[#1D2939] font-rubik-medium ml-2">Save to Library</Text>
                      <MaterialIcons name="bookmark-border" size={22} color="#1D2939" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="py-2 flex-row items-center justify-between mt-2"
                      onPress={async () => {
                        const downloadableItem = convertToDownloadableItem(item, 'ebook');
                        const result = await handleDownload(downloadableItem);
                        if (result.success) {
                          closeAllMenus();
                        }
                      }}
                    >
                      <Text className="text-[#1D2939] font-rubik-medium ml-2">
                        {checkIfDownloaded(item._id || item.fileUrl) ? "Downloaded" : "Download"}
                      </Text>
                      <Ionicons 
                        name={checkIfDownloaded(item._id || item.fileUrl) ? "checkmark-circle" : "download-outline"} 
                        size={24} 
                        color={checkIfDownloaded(item._id || item.fileUrl) ? "#256E63" : "#090E24"} 
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              <View className="mt-2 flex flex-col w-full">
                <View className="flex flex-row justify-between items-center">
                  <Text
                    className="text-[12px] text-[#98A2B3] font-rubik-medium flex-1"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.speaker || item.uploadedBy || "Unknown Author"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { closeAllMenus(); setModalIndex(modalIndex === index ? null : index); }}
                    className="ml-2"
                  >
                    <Ionicons name="ellipsis-vertical" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center mt-1">
                  <MaterialIcons name="visibility" size={16} color="#98A2B3" />
                  <Text className="text-[10px] text-[#98A2B3] ml-2 font-rubik">
                    {item.views || 0} views
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // Show empty state if no ebooks
  if (processedEbooks.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
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
      className="flex-1 bg-white"
      onScrollBeginDrag={closeAllMenus}
      onTouchStart={closeAllMenus}
    >
      {/* Previously Viewed */}
      {previouslyViewed.length > 0 && 
        renderMiniCards(
          "Previously Viewed",
          previouslyViewed,
          pvModalIndex,
          setPvModalIndex
        )
      }

      {/* Trending */}
      {trendingEbooks.length > 0 && 
        renderMiniCards(
          "Trending",
          trendingEbooks,
          trendingModalIndex,
          setTrendingModalIndex
        )
      }

      {/* Recommended for You */}
      {recommendedEbooks.length > 0 && 
        renderMiniCards(
          "Recommended for You",
          recommendedEbooks,
          recommendedModalIndex,
          setRecommendedModalIndex
        )
      }
    </ScrollView>
  );
}
