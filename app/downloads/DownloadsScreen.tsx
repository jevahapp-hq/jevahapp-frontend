import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio, ResizeMode, Video } from "expo-av";
import { Pause, Play, Search, Volume2 } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  HandlerStateChangeEvent,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import AuthHeader from "../components/AuthHeader";
import { useAudioManager } from "../hooks/useAudioManager";
import { DownloadItem, useDownloadStore } from "../store/useDownloadStore";
import { API_BASE_URL } from "../utils/api";
import { authUtils } from "../utils/authUtils";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

const profileImage = require("../../assets/images/user.png");
const defaultAvatar = require("../../assets/images/image (5).png");

type User = {
  firstName: string;
  lastName: string;
  avatar: string;
  section: string;
};

interface DownloadCardProps {
  item: DownloadItem;
}

const DownloadCard: React.FC<DownloadCardProps> = ({ item }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const videoRef = useRef<Video>(null);
  const audioRef = useRef<Audio.Sound>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Use advanced audio manager
  const { audioState, toggleMute, isMuted } = useAudioManager();

  const isVideo = item.contentType === "video" || item.contentType === "videos";
  const isAudio = item.contentType === "audio" || item.contentType === "music";

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, []);

  const togglePlay = async () => {
    try {
      if (isVideo) {
        if (isPlaying) {
          await videoRef.current?.pauseAsync();
        } else {
          await videoRef.current?.playAsync();
        }
        setIsPlaying(!isPlaying);
      } else if (isAudio) {
        if (isPlaying) {
          await audioRef.current?.pauseAsync();
        } else {
          if (!audioRef.current) {
            const { sound } = await Audio.Sound.createAsync(
              { uri: item.fileUrl },
              { shouldPlay: true }
            );
            audioRef.current = sound;
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded) {
                setProgress(status.positionMillis / status.durationMillis);
                setPosition(status.positionMillis);
                setDuration(status.durationMillis);
                if (status.didJustFinish) {
                  setIsPlaying(false);
                  setProgress(0);
                  setPosition(0);
                }
              }
            });
          } else {
            await audioRef.current.playAsync();
          }
        }
        setIsPlaying(!isPlaying);
      }
    } catch (error) {
      console.error("Error toggling playback:", error);
    }
  };

  const handleToggleMute = async () => {
    try {
      // Use advanced audio manager
      await toggleMute();
      const muted = isMuted();

      if (isVideo) {
        await videoRef.current?.setIsMutedAsync(muted);
      } else if (isAudio) {
        await audioRef.current?.setVolumeAsync(muted ? 0 : audioState.volume);
      }

      console.log(`🔇 Download mute ${muted ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  };

  const seekTo = async (seekPosition: number) => {
    try {
      if (isVideo) {
        await videoRef.current?.setPositionAsync(seekPosition);
      } else if (isAudio) {
        await audioRef.current?.setPositionAsync(seekPosition);
      }
    } catch (error) {
      console.error("Error seeking:", error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleVideoStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis / status.durationMillis);
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setProgress(0);
        setPosition(0);
      }
    }
  };

  return (
    <View className="mb-5 flex-row w-[362px] gap-6 justify-between">
      {/* Thumbnail/Video/Audio Display */}
      <View className="w-[60px] h-[72px] rounded-xl overflow-hidden">
        {isVideo ? (
          <Video
            ref={videoRef}
            source={{ uri: item.fileUrl || "" }}
            style={{ width: "100%", height: "100%" }}
            resizeMode={ResizeMode.COVER}
            useNativeControls={false}
            isMuted={isMuted()}
            volume={audioState.volume}
            onPlaybackStatusUpdate={handleVideoStatusUpdate}
          />
        ) : (
          <Image
            source={
              item.thumbnailUrl
                ? { uri: item.thumbnailUrl }
                : require("../../assets/images/1.png")
            }
            className="w-full h-full"
            resizeMode="cover"
          />
        )}
      </View>

      <View className="flex-col w-[268px]">
        <Text className="mt-2 font-rubik-semibold text-[16px] text-[#1D2939]">
          {item.title}
        </Text>
        <Text
          className="text-[#667085] text-sm mt-2 font-rubik"
          numberOfLines={2}
        >
          {item.description}
        </Text>

        {/* Playback Controls */}
        <View className="flex-row items-center mt-3">
          <TouchableOpacity className="mr-3" onPress={togglePlay}>
            {isPlaying ? (
              <Pause size={18} color="black" />
            ) : (
              <Play size={18} color="black" />
            )}
          </TouchableOpacity>

          {/* Progress Bar */}
          <View className="flex-1 mr-3">
            <TouchableOpacity
              onPress={(event) => {
                const { locationX } = event.nativeEvent;
                const progressBarWidth = 200; // Approximate width
                const seekRatio = locationX / progressBarWidth;
                const seekPosition = seekRatio * duration;
                seekTo(seekPosition);
              }}
            >
              <View className="w-[200px] h-1 bg-gray-300 rounded-full">
                <View
                  className="h-1 bg-black rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </View>
            </TouchableOpacity>
            {duration > 0 && (
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-gray-500 font-rubik">
                  {formatTime(position)}
                </Text>
                <Text className="text-xs text-gray-500 font-rubik">
                  {formatTime(duration)}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={handleToggleMute}>
            <View className="relative">
              <Volume2 size={18} color={isMuted() ? "#FF6B6B" : "black"} />
              {/* Global Mute Indicator */}
              {audioState.globalMuteEnabled && (
                <View className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Author & Metadata */}
        <View className="flex-row items-center justify-between mt-3">
          <Image source={profileImage} className="w-6 h-6 rounded-full" />
          <View className="flex-row items-center flex-wrap">
            <Text className="ml-2 text-[14px] font-rubik-semibold text-[#344054]">
              {item.author}
            </Text>
            <View className="flex-row items-center mt-2">
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={12} color="#667085" />
                <Text className="ml-1 text-xs text-[#667085] font-rubik">
                  {new Date(item.downloadedAt).toLocaleDateString()}
                </Text>
              </View>
              <View className="w-1 h-1 bg-orange-300 mx-2 rounded-sm" />
              <View className="flex-row items-center">
                <Ionicons name="document-outline" size={12} color="#667085" />
                <Text className="ml-1 text-xs text-[#667085] font-rubik">
                  {item.size || "Unknown"}
                </Text>
              </View>
              <View className="w-1 h-1 bg-orange-300 mx-2 rounded-sm" />
              <View className="flex-row items-center">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={12}
                  color="#256E63"
                />
                <Text className="ml-1 text-xs text-[#256E63] font-rubik-semibold">
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const DownloadScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [
    isAutomaticDownloadsModalVisible,
    setIsAutomaticDownloadsModalVisible,
  ] = useState(false);

  // Use the download store
  const {
    downloadedItems,
    isLoaded,
    loadDownloadedItems,
    removeFromDownloads,
  } = useDownloadStore();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await authUtils.getStoredToken();
        if (!token) {
          console.error("❌ No authentication token found");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("👤 User API response:", data);

        if (data.data && data.data.firstName && data.data.lastName) {
          setUser(data.data);
          await AsyncStorage.setItem("user", JSON.stringify(data.data));
          console.log("✅ Updated AsyncStorage with complete API user data:", {
            firstName: data.data.firstName,
            lastName: data.data.lastName,
            hasAvatar: !!data.data.avatar,
          });
        } else {
          console.warn("⚠️ API returned incomplete user data:", data.data);
          setUser(data.data);
        }
      } catch (error) {
        console.error("❌ Failed to fetch user:", error);
      }
    };

    fetchUser();
    loadDownloadedItems();
  }, []);

  // Filter downloads based on search query
  const filterDownloads = (downloads: DownloadItem[]) => {
    if (!searchQuery.trim()) return downloads;

    const query = searchQuery.toLowerCase();
    return downloads.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query)
    );
  };

  const filteredDownloads = filterDownloads(downloadedItems);

  // Group downloads by type
  const videoDownloads = downloadedItems.filter(
    (item) => item.contentType === "video"
  );
  const audioDownloads = downloadedItems.filter(
    (item) => item.contentType === "audio"
  );
  const ebookDownloads = downloadedItems.filter(
    (item) => item.contentType === "ebook"
  );
  const liveDownloads = downloadedItems.filter(
    (item) => item.contentType === "live"
  );

  return (
    <SafeAreaView className="flex-1 w-full bg-white">
      <View className="px-4 mt-6">
        <AuthHeader title="Downloads" />
      </View>

      <View className="flex-col justify-between bg-[#F3F3F4] w-full ">
        <View className="flex-col justify-between w-full items-center">
          {/* Search Bar */}
          <View className="flex-row items-center bg-[#E5E5EA] w-[362px] rounded-xl mx-4 mt-4 px-2 py-3 border border-[rgb(229,229,234)]">
            <Search size={22} color="#8E8E93" />
            <TextInput
              className="ml-2 flex-1 font-rubik-regular text-[#090E24]"
              placeholder="Search for downloads..."
              placeholderTextColor="#98A2B3"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text className="text-blue-500 font-semibold">Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Profile */}
          <View className="flex-row items-center px-4 mt-4 self-start ml-3">
            <Image
              source={
                typeof user?.avatar === "string" &&
                user.avatar.trim() &&
                user.avatar.startsWith("http")
                  ? { uri: user.avatar.trim() }
                  : defaultAvatar
              }
              className="w-[40px] h-[38px] rounded-[10px]"
            />
            <View className="flex-col items-start ml-3">
              <Text className="font-semibold text-base">
                {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
              </Text>
              <Text className="text-gray-400">
                {user?.section?.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Smart download */}
          <View className="bg-[#E5E5EA] rounded-xl w-[362px] h-[104px] mx-4 mt-4 px-4 py-4 flex-row justify-between">
            <View className="flex-row items-start flex-1">
              <View className="mr-3 mt-1">
                <Ionicons name="download-outline" size={24} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="font-rubik-semibold text-[14px] text-[#1D2939]">
                  Smart download
                </Text>
                <Text className="text-[#667085] text-sm mt-1 font-rubik">
                  Automatically downloads content for you based on what you
                  watch when connected to a wifi
                </Text>
                <TouchableOpacity className="mt-2">
                  <Text className="text-[#256E63]  font-rubik-semibold text-[10px]">
                    SETUP
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View className="justify-center">
              <TouchableOpacity
                onPress={() => setIsAutomaticDownloadsModalVisible(true)}
              >
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Downloads */}
          <ScrollView
            className="mt-9 px-4"
            showsVerticalScrollIndicator={false}
          >
            {/* All downloads */}
            <Text className="text-[14px] font-rubik-semibold text-[#1D2939] mb-3">
              All Downloads ({downloadedItems.length})
            </Text>

            {!isLoaded ? (
              <View className="flex-1 justify-center items-center mt-20 mb-20">
                <Text className="text-[#667085] text-lg font-rubik">
                  Loading downloads...
                </Text>
              </View>
            ) : downloadedItems.length === 0 ? (
              <View className="flex-1 justify-center items-center mt-20 mb-20">
                <Text className="text-[#667085] text-lg font-rubik">
                  No downloads yet
                </Text>
                <Text className="text-[#667085] text-sm mt-2 font-rubik">
                  Download content from any category to see it here
                </Text>
              </View>
            ) : (
              filteredDownloads.map((item, index) => (
                <DownloadCard key={item.id || index} item={item} />
              ))
            )}

            {/* Show message when no results found */}
            {searchQuery &&
              filteredDownloads.length === 0 &&
              downloadedItems.length > 0 && (
                <View className="flex-1 justify-center items-center mt-20 mb-20">
                  <Text className="text-[#667085] text-lg font-rubik">
                    No downloads found
                  </Text>
                  <Text className="text-[#667085] text-sm mt-2 font-rubik">
                    Try searching with different keywords
                  </Text>
                </View>
              )}
          </ScrollView>
        </View>
      </View>

      {/* Automatic Downloads Modal */}
      <AutomaticDownloadsModal
        isVisible={isAutomaticDownloadsModalVisible}
        onClose={() => setIsAutomaticDownloadsModalVisible(false)}
      />
    </SafeAreaView>
  );
};

// Automatic Downloads Modal Component
const AutomaticDownloadsModal: React.FC<{
  isVisible: boolean;
  onClose: () => void;
}> = ({ isVisible, onClose }) => {
  const [isSmartDownloadEnabled, setIsSmartDownloadEnabled] = useState(false);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const lastTranslateY = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 30 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT);
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    if (translationY > 0) {
      translateY.value = translationY;
      lastTranslateY.value = translationY;
    }
  };

  const onGestureEnd = (
    _event: HandlerStateChangeEvent<Record<string, unknown>>
  ) => {
    if (lastTranslateY.value > 150) {
      translateY.value = withSpring(SCREEN_HEIGHT);
      runOnJS(onClose)();
    } else {
      translateY.value = withSpring(0, { damping: 30 });
    }
  };

  if (!isVisible) return null;

  return (
    <GestureHandlerRootView className="absolute inset-0  z-50 items-center justify-end">
      {/* Background overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="absolute inset-0 bg-black/30" />
      </TouchableWithoutFeedback>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onGestureEnd}
      >
        <Animated.View
          style={[
            animatedStyle,
            {
              position: "absolute",
              bottom: 0,
              width: SCREEN_WIDTH,
            },
          ]}
          className="bg-white rounded-t-3xl p-6"
        >
          {/* Handle */}
          <View className="w-[36px] h-[4px] bg-gray-300 self-center rounded-full mb-6 mt-0" />

          {/* Header */}
          <View className="flex-row justify-between items-center mb-9">
            <Text className="text-[20px] font-rubik-semibold text-[#1D2939]">
              Automatic downloads
            </Text>
            <TouchableOpacity
              onPress={() => {
                translateY.value = withSpring(SCREEN_HEIGHT);
                runOnJS(onClose)();
              }}
              className="w-8 h-8 bg-gray-200 rounded-full justify-center items-center"
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Separator */}

          {/* <View className="h-[1px] bg-gray-200 mb-2" /> */}

          {/* Smart Download Section */}
          <View className="flex-col  w-full items-start mb-14 justify-between h-[133px] ">
            <View className="flex-row items-start flex-1">
              <View className="mr-3 mt-1">
                <Ionicons name="download-outline" size={24} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="font-rubik-semibold text-[14px] text-[#1D2939]">
                  Smart download
                </Text>
                <Text className="text-[#667085] text-sm mt-1 font-rubik">
                  Automatically downloads content for you based on what you
                  watch when connected to a wifi
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center ml-4 w-[340px] h-[24px]">
              <Text className="text-[#1D2939] font-rubik-semibold text-sm mr-3">
                Turn on
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setIsSmartDownloadEnabled(!isSmartDownloadEnabled)
                }
                className={`w-14 h-7 rounded-full ${
                  isSmartDownloadEnabled ? "bg-[#256E63]" : "bg-gray-300"
                } justify-center`}
              >
                <View
                  className={`w-5 h-5 bg-white rounded-full transition-all duration-200 ${
                    isSmartDownloadEnabled ? "ml-7" : "ml-1"
                  }`}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

export default DownloadScreen;
