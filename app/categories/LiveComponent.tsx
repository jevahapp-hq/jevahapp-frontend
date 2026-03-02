import {
    AntDesign,
    Fontisto,
    Ionicons,
    MaterialIcons,
} from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Image, ImageSourcePropType, ScrollView, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

import { router, useFocusEffect, useRouter } from "expo-router";
import SuccessCard from "../components/SuccessCard";
import { useMediaStore } from "../store/useUploadStore";
import { convertToDownloadableItem, useDownloadHandler } from "../utils/downloadUtils";


interface VideoCard {
  imageUrl: ImageSourcePropType | string;
  title: string;
  speaker: string;
  timeAgo: string;
  speakerAvatar: ImageSourcePropType | string;
  favorite: number;
  views: number;
  saved: number;
  sheared: number;
  isLive?: string;
}

const videos: VideoCard[] = [
  {
    imageUrl: require("../../assets/images/bg (1).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Pius Tagbas",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 550,
    favorite: 600,
    saved: 480,
    sheared: 900,
  },
];

const videosA: VideoCard[] = [
  {
    imageUrl: require("../../assets/images/image (8).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    imageUrl: require("../../assets/images/image (9).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
];

const videosB: VideoCard[] = [
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    favorite: 600,
    saved: 400,
    sheared: 540,
  },
];



// Live recommendation items
const recommendedItems = [
  {
    title: "The elevation Chu",
    imageUrl: require("../../assets/images/image (6).png"),
    speaker: "Minister Joseph Eluwa",
    views: 100,
    onPress: () => console.log("Viewing The Chosen"),
  },
  {
    title: "The Beatitudes: The Path to Blessings",
    imageUrl: require("../../assets/images/image (7).png"),
    speaker: "Minister Joseph Eluwa",
    views: 300,
    onPress: () => console.log("Viewing Revival Nights"),
  },
];

// Favourite Live cards
const favouriteVideos = [
  {
    imageUrl: require("../../assets/images/bilble.png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    onPress: () => console.log("Viewing The Chosen"),
  },
  {
    imageUrl: require("../../assets/images/bilble.png"),
    title: "Praise & Power",
    speaker: "Sis. Grace Ali",
    timeAgo: "2HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 400,
    onPress: () => console.log("Viewing Praise & Power"),
  },
  {
    imageUrl: require("../../assets/images/bilble.png"),
    title: "Deep Worship",
    speaker: "Minister John Mark",
    timeAgo: "1HR AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 700,
    onPress: () => console.log("Viewing Deep Worship"),
  },
];



const renderMiniCards = (
  title: string,
  items: typeof recommendedItems,
  modalIndex: number | null,
  setModalIndex: (index: number | null) => void
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
      {items.map((item, index) => {
        const modalKey = `rec-${index}`;
        const imageUrl =
          typeof item.imageUrl === "number"
            ? Image.resolveAssetSource(item.imageUrl).uri
            : item.imageUrl;

        return (
          <View key={modalKey} className="mr-4 w-[154px] flex-col items-center">
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/reels/Reelsviewscroll",
                  params: {
                    title: item.title,
                    speaker: item.speaker,
                    timeAgo: "3HRS AGO",
                    views: item.views.toString(),
                    favorite: "0",
                    saved: "0",
                    sheared: "0",
                    imageUrl,
                    category: "LIVE",
                    speakerAvatar: Image.resolveAssetSource(
                      require("../../assets/images/Avatar-1.png")
                    ).uri, // Static avatar for now
                    source: "LiveComponent",
                  },
                })
              }
              className="w-full h-[232px] rounded-2xl overflow-hidden relative"
              activeOpacity={0.9}
            >
              <Image
                source={
                  typeof item.imageUrl === "string"
                    ? { uri: item.imageUrl }
                    : item.imageUrl
                }
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
                  <AntDesign name="share-alt" size={16} color="#3A3E50" />
                </TouchableOpacity>
                <TouchableOpacity className="py-2 flex-row items-center justify-between">
                  <Text className="text-[#1D2939] font-rubik mr-2">
                    Save to Library
                  </Text>
                  <MaterialIcons name="library-add" size={18} color="#3A3E50" />
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
                  {item.speaker?.split(" ").slice(0, 4).join(" ") + " ..."}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setModalIndex(modalIndex === index ? null : index)
                  }
                  className="mr-2"
                >
                  <Ionicons name="ellipsis-vertical" size={14} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center">
                <MaterialIcons name="visibility" size={16} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {item.views}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  </View>
);



export default function LiveComponent() {

  const router = useRouter();
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [rsModalIndex, setRsModalIndex] = useState<number | null>(null);
  
  // Success card state
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [favModalIndex, setFavModalIndex] = useState<number | null>(null);
  let globalIndex = 0;

  const mediaStore = useMediaStore();
  
  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  useFocusEffect(
    useCallback(() => {
      mediaStore.refreshUserDataForExistingMedia();
    }, [])
  );
  const liveVideos = mediaStore.mediaList.filter(item => item.contentType === "live");

const renderVideoCard = (video: VideoCard, index: number, p0: string) => {
    const modalKey = `video-${index}`;

    const getImageSource = (src: string | ImageSourcePropType) => {
      if (typeof src === "string") {
        if (!src || !src.trim()) {
          return require("../../assets/images/Avatar-1.png");
        }
        return { uri: src.trim() };
      }
      return src;
    };

    return (
      <TouchableOpacity
        key={index}
        onPress={() =>
          router.push({
            pathname: "/reels/Reelsviewscroll",
            params: {
              title: video.title,
              speaker: video.speaker,
              timeAgo: video.timeAgo,
              views: video.views.toString(),
              favorite: video.favorite.toString(),
              saved: video.saved.toString(),
              sheared: video.sheared.toString(),
              isLive: "true",
              imageUrl:
                typeof video.imageUrl === "number"
                  ? Image.resolveAssetSource(video.imageUrl).uri
                  : video.imageUrl,
              speakerAvatar:
                typeof video.speakerAvatar === "number"
                  ? Image.resolveAssetSource(video.speakerAvatar).uri
                  : video.speakerAvatar,
              category: "LIVE",
              source: "LiveComponent",
            },
          })
        }
        className="mb-5"
        activeOpacity={0.9}
      >
      
      
        <View className="w-full h-[393px] relative">
          <Image source={getImageSource(video.imageUrl)} className="w-full h-full" resizeMode="cover" />
          <View className="absolute top-3 left-4 bg-red-600 px-2 py-0.5 rounded-md flex-row items-center">
            <Text className="text-white text-xs font-bold">LIVE</Text>
            <Image source={require("../../assets/images/Vector.png")} className="h-[10px] w-[10px] ml-2" />
          </View>
          <View className="absolute bottom-3 left-3 right-3">
            <Text className="text-white text-base font-bold" numberOfLines={2}>{video.title}</Text>
          </View>


        </View>



        <View className="flex-row items-center justify-between mt-1">
          <View className="flex flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
              <Image
                source={getImageSource(video.speakerAvatar) as ImageSourcePropType}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 999,
                  marginLeft: 26,
                  marginTop: 15,
                }}
                resizeMode="cover"
                onError={(error) => {
                  console.warn("❌ Failed to load speaker avatar:", error.nativeEvent.error);
                }}
              />
            </View>
            <View className="ml-3">
              <View className="flex-row items center">
                <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                  {video.speaker}
                </Text>
                <View className="flex flex-row mt-2 ml-2">
                  <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {video.timeAgo}
                  </Text>
                </View>
              </View>
              <View className="flex flex-row mt-2">
                <View className="flex-row items-center">
                  <MaterialIcons name="visibility" size={16} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {video.views}
                  </Text>
                </View>
                <View className="flex-row items-center ml-4">
                  <AntDesign name="share-alt" size={16} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {video.sheared}
                  </Text>
                </View>
                <View className="flex-row items-center ml-6">
                  <Fontisto name="favorite" size={14} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {video.saved}
                  </Text>
                </View>
                <View className="flex-row items-center ml-6">
                  <MaterialIcons
                    name="favorite-border"
                    size={16}
                    color="#98A2B3"
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {video.favorite}
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

       
        {modalVisible === modalKey && (
          <>
            <TouchableWithoutFeedback onPress={() => setModalVisible(null)}>
              <View className="absolute inset-0 z-40" />
            </TouchableWithoutFeedback>
            <View className="absolute top-[300px] right-6 bg-white shadow-md rounded-lg p-3 z-50 w-56">
            <TouchableOpacity className="py-2 border-b border-gray-200 flex-row justify-between">
              <Text className="text-[#1D2939] ml-2">View Details</Text>
              <MaterialIcons name="visibility" size={16} color="#3A3E50" />
            </TouchableOpacity>
            <TouchableOpacity className="py-2 border-b border-gray-200 flex-row justify-between">
              <Text className="text-sm text-[#1D2939] ml-2">Share</Text>
              <AntDesign name="sharealt" size={16} color="#3A3E50" />
            </TouchableOpacity>
            <TouchableOpacity className="py-2 flex-row justify-between">
              <Text className="text-[#1D2939] ml-2">Save to Library</Text>
              <MaterialIcons name="library-add" size={18} color="#3A3E50" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="py-2 flex-row justify-between"
              onPress={async () => {
                const downloadableItem = convertToDownloadableItem(video, 'live');
                const result = await handleDownload(downloadableItem);
                if (result.success) {
                  setModalVisible(null);
                  setSuccessMessage("Downloaded successfully!");
                  setShowSuccessCard(true);
                }
              }}
            >
              <Text className="text-[#1D2939] ml-2">
                {checkIfDownloaded(video._id || video.fileUrl) ? "Downloaded" : "Download"}
              </Text>
              <Ionicons 
                name={checkIfDownloaded(video._id || video.fileUrl) ? "checkmark-circle" : "download-outline"} 
                size={24} 
                color={checkIfDownloaded(video._id || video.fileUrl) ? "#256E63" : "#090E24"} 
              />
            </TouchableOpacity>
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };




 
 
  const renderLiveRecommendation = () => (
    <View className="mt-5">
      <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-2 ml-2">
        Live from your favourite speaker
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {favouriteVideos.map((item, index) => {
          const modalKey = `fav-${index}`;
          const imageUrl =
            typeof item.imageUrl === "number"
              ? Image.resolveAssetSource(item.imageUrl).uri
              : item.imageUrl;
  
          const speakerAvatar =
            typeof item.speakerAvatar === "number"
              ? Image.resolveAssetSource(item.speakerAvatar).uri
              : item.speakerAvatar;
  
          return (
            <View
              key={modalKey}
              className="mr-4 w-[150px] flex-col items-center relative"
            >
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/reels/Reelsviewscroll",
                    params: {
                      title: item.title,
                      speaker: item.speaker,
                      timeAgo: item.timeAgo,
                      views: item.views.toString(),
                      favorite: "0",
                      saved: "0",
                      sheared: "0",
                      imageUrl,
                      speakerAvatar,
                      isLive: "false",
                      category: "LIVE",
                      source: "LiveComponent",
                    },
                  })
                }
                className="w-full h-[232px] rounded-2xl overflow-hidden relative"
                activeOpacity={0.9}
              >
                <Image
                  source={
                    typeof item.imageUrl === "string" && item.imageUrl && item.imageUrl.trim()
                      ? { uri: item.imageUrl.trim() }
                      : require("../../assets/images/image (5).png")
                  }
                  className="w-full h-full absolute"
                  resizeMode="cover"
                />
                <View className="absolute top-2 bg-red-600 px-2 py-0.5 rounded-md z-10 flex flex-row items-center h-[23px] mt-3 ml-5">
                  <Image
                    source={require("../../assets/images/Vector.png")}
                    className="h-[10px] w-[10px]"
                    resizeMode="contain"
                  />
                </View>
                <View className="absolute bottom-2 left-2 right-2">
                  <Text
                    className="text-white text-start text-[17px] mb-6 font-rubik-semibold text-sm"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>
              </TouchableOpacity>
  
              {favModalIndex === index && (
                <View className="absolute mt-[30px] left-1 bg-white shadow-md rounded-lg p-3 z-50 w-36">
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
                    <AntDesign name="share-alt" size={16} color="#3A3E50" />
                  </TouchableOpacity>
                  <TouchableOpacity className="py-2 flex-row items-center justify-between">
                    <Text className="text-[#1D2939] font-rubik mr-2">Save</Text>
                    <MaterialIcons name="library-add" size={18} color="#3A3E50" />
                  </TouchableOpacity>
                </View>
              )}
  
              <View className="mt-2 flex flex-col">
                <View className="flex flex-row w-[150px] justify-between">
                  <Text className="text-[11px] text-[#1D2939] font-rubik-semibold">
                    {item.speaker}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setFavModalIndex(favModalIndex === index ? null : index)
                    }
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={14}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
                <View className="flex flex-row">
                  <View className="flex-row items-center">
                    <MaterialIcons name="visibility" size={16} color="#98A2B3" />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {item.views}
                    </Text>
                  </View>
                  <View className="flex flex-row mt-2 ml-2">
                    <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                    <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                      {item.timeAgo}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
  
  // Render Recommended Live component (same as AllContentTikTok)
  const renderRecommendedLiveCards = () => {
    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 32,
          backgroundColor: "#F9FAFB",
          borderRadius: 12,
          marginHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderStyle: "dashed",
          minHeight: 200,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "#256E63",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            position: "relative",
          }}
        >
          <Ionicons name="radio" size={40} color="#FFFFFF" />
          {/* Live indicator dot */}
          <View
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              borderWidth: 2,
              borderColor: "#256E63",
            }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#256E63",
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              marginRight: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#FFFFFF",
                marginRight: 6,
              }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#FFFFFF",
                fontFamily: "Rubik-Bold",
                letterSpacing: 0.5,
              }}
            >
              LIVE
            </Text>
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1D2939",
              textAlign: "center",
              fontFamily: "Rubik-SemiBold",
            }}
          >
            Coming Soon
          </Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            color: "#6B7280",
            textAlign: "center",
            lineHeight: 20,
            paddingHorizontal: 16,
            fontFamily: "Rubik",
          }}
        >
          We're working on bringing you live streaming content. Stay tuned for updates!
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FCFCFD" }}>
      {showSuccessCard && (
        <SuccessCard
          message={successMessage}
          onClose={() => setShowSuccessCard(false)}
          duration={3000}
        />
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 40,
          paddingHorizontal: 0,
        }}
        showsVerticalScrollIndicator={false}
      >
        {renderRecommendedLiveCards()}
      </ScrollView>
    </View>
  );
}
