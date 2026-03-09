import {
  AntDesign,
  Fontisto,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";


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
  likes: number;
  views: number;
  saved: number;
  shares: number;
  isLive?: string;
  _id?: string;
  fileUrl?: string;
}


const videos: VideoCard[] = [
  {
    imageUrl: require("../../assets/images/Background #22.jpeg"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Pius Tagbas",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 550,
    likes: 600,
    saved: 480,
    shares: 900,
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
    likes: 600,
    saved: 400,
    shares: 540,
  },
  {
    imageUrl: require("../../assets/images/image (9).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    likes: 600,
    saved: 400,
    shares: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    likes: 600,
    saved: 400,
    shares: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    likes: 600,
    saved: 400,
    shares: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    likes: 600,
    saved: 400,
    shares: 540,
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
    likes: 600,
    saved: 400,
    shares: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    likes: 600,
    saved: 400,
    shares: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    likes: 600,
    saved: 400,
    shares: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    likes: 600,
    saved: 400,
    shares: 540,
  },
  {
    imageUrl: require("../../assets/images/image (10).png"),
    title: "2 Hours time with God with Dunsin Oyekan & Pastor Godman Akinlabi",
    speaker: "Minister Joseph Eluwa",
    timeAgo: "3HRS AGO",
    speakerAvatar: require("../../assets/images/Avatar-1.png"),
    views: 500,
    likes: 600,
    saved: 400,
    shares: 540,
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
              likes: video.likes.toString(),
              saved: video.saved.toString(),
              shares: video.shares.toString(),
              isLive: "true",
              imageUrl:
                typeof video.imageUrl === "number"
                  ? Image.resolveAssetSource(video.imageUrl).uri
                  : (typeof video.imageUrl === "object" && video.imageUrl && "uri" in video.imageUrl)
                    ? (video.imageUrl as any).uri
                    : (video.imageUrl as string),
              speakerAvatar:
                typeof video.speakerAvatar === "number"
                  ? Image.resolveAssetSource(video.speakerAvatar).uri
                  : (typeof video.speakerAvatar === "object" && video.speakerAvatar && "uri" in video.speakerAvatar)
                    ? (video.speakerAvatar as any).uri
                    : (video.speakerAvatar as string),
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
                    {video.shares}
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
                    {video.likes}
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
                <Text className="text-[#1D2939] ml-2">Share</Text>
                <AntDesign name="share-alt" size={16} color="#3A3E50" />
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
                  {checkIfDownloaded((video._id || video.fileUrl) as string) ? "Downloaded" : "Download"}
                </Text>
                <Ionicons
                  name={checkIfDownloaded((video._id || video.fileUrl) as string) ? "checkmark-circle" : "download-outline"}
                  size={24}
                  color={checkIfDownloaded((video._id || video.fileUrl) as string) ? "#256E63" : "#090E24"}
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

  // Enhanced Render for Live Stage Anticipation
  const renderLiveStage = () => (
    <View className="flex-1 w-full" style={{ backgroundColor: "#090E24" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Immersive Header Section */}
        <View className="pt-12 pb-8 px-6 relative overflow-hidden">
          {/* Subtle Ambient Background elements */}
          <View
            style={{
              position: "absolute",
              top: -100,
              right: -50,
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: "rgba(254, 167, 78, 0.05)",
            }}
          />

          <View className="flex-row items-center mb-2">
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#EF4444",
                marginRight: 8,
                shadowColor: "#EF4444",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 4,
              }}
            />
            <Text
              className="text-[#9CA3AF] font-rubik-semibold tracking-widest text-[12px]"
              style={{ letterSpacing: 2 }}
            >
              LIVE STAGE
            </Text>
          </View>

          <Text className="text-white text-4xl font-rubik-bold leading-tight">
            Immersive{"\n"}Worship Experience
          </Text>
          <Text className="text-[#9CA3AF] font-rubik mt-4 text-[16px] leading-6">
            Connecting you to global sounds of revival. Stay tuned for live encounters.
          </Text>
        </View>

        {/* Anticipation Cards */}
        <View className="px-6 mb-10">
          <View
            className="rounded-3xl overflow-hidden relative"
            style={{
              height: 480,
              backgroundColor: "#111827",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <Image
              source={require("../../assets/images/Background #22.jpeg")}
              className="w-full h-full absolute opacity-40"
              resizeMode="cover"
            />
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "rgba(9, 14, 36, 0.4)",
              }}
            />


            <View className="flex-1 justify-end p-8">
              <View
                className="self-start px-3 py-1 rounded-full mb-4"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
              >
                <Text className="text-white font-rubik-semibold text-[10px]">COMING SOON</Text>
              </View>

              <Text className="text-white text-3xl font-rubik-bold mb-3">
                Global Revival Night
              </Text>

              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={16} color="#FEA74E" />
                <Text className="text-[#D1D5DB] font-rubik ml-2 text-sm">Stay Tuned for Announcements</Text>
              </View>
            </View>

          </View>
        </View>

        {/* Feature Teasers */}
        <View className="px-6">
          <Text className="text-white font-rubik-semibold text-lg mb-6">What to expect</Text>

          <View className="flex-row justify-between mb-8">
            <View className="items-center w-[28%]">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" }}
              >
                <Ionicons name="videocam" size={28} color="#FEA74E" />
              </View>
              <Text className="text-white font-rubik text-center text-[12px]">4K HDR Streaming</Text>
            </View>

            <View className="items-center w-[28%]">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" }}
              >
                <Ionicons name="headset" size={28} color="#FEA74E" />
              </View>
              <Text className="text-white font-rubik text-center text-[12px]">Spatial Audio Experience</Text>
            </View>

            <View className="items-center w-[28%]">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" }}
              >
                <Ionicons name="chatbubbles" size={28} color="#FEA74E" />
              </View>
              <Text className="text-white font-rubik text-center text-[12px]">Interactive Fellowships</Text>
            </View>
          </View>

          {/* Premium Footer Plate */}
          <View
            className="p-6 rounded-3xl"
            style={{
              backgroundColor: "rgba(254, 167, 78, 0.1)",
              borderWidth: 1,
              borderColor: "rgba(254, 167, 78, 0.2)"
            }}
          >
            <View className="flex-row items-center mb-2">
              <Ionicons name="sparkles" size={20} color="#FEA74E" />
              <Text className="text-[#FEA74E] font-rubik-semibold ml-2">Premium Experience</Text>
            </View>
            <Text className="text-[#9CA3AF] font-rubik text-[13px] leading-5">
              Live Stage is being crafted to bring you the highest quality spiritual encounters. We are building something extraordinary.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#090E24" }}>
      {showSuccessCard && (
        <SuccessCard
          message={successMessage}
          onClose={() => setShowSuccessCard(false)}
          duration={3000}
        />
      )}
      {renderLiveStage()}
    </View>
  );
}

