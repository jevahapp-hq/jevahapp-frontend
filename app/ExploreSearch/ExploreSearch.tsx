import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthHeader from "../components/AuthHeader";
import { useDownloadStore } from "../store/useDownloadStore";
import { MediaItem, useMediaStore } from "../store/useUploadStore";
import { convertToDownloadableItem, useDownloadHandler } from "../utils/downloadUtils";
import { getDisplayName } from "../utils/userValidation";

const pastSearchesInitial = [
  "Miracles",
  "Spiritual growth",
  "Mega worship",
  "Soaking worship",
  "Love and Light",
];

export default function ExploreSearch() {
  const [query, setQuery] = useState("");
  const [pastSearches, setPastSearches] = useState(pastSearchesInitial);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const [audioPosition, setAudioPosition] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, Audio.Sound>>({});
  
  // Get all media from store
  const { mediaList } = useMediaStore();
  
  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();
  
  // Load downloaded items on component mount
  useEffect(() => {
    loadDownloadedItems();
  }, [loadDownloadedItems]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(sound => {
        sound.unloadAsync();
      });
    };
  }, []);

  // Display all content or filtered content based on search
  const displayResults = useMemo(() => {
    if (!query.trim()) {
      // Show all content when no search query
      return mediaList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    
    // Filter content when there's a search query
    const searchTerm = query.toLowerCase().trim();
    const filteredMedia = mediaList.filter((item) => {
      // Search in title
      if (item.title.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search in description
      if (item.description && item.description.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search in speaker/uploadedBy
      if (item.speaker && item.speaker.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      if (item.uploadedBy && item.uploadedBy.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
      // Search in category
      if (item.category && Array.isArray(item.category)) {
        if (item.category.some(cat => cat.toLowerCase().includes(searchTerm))) {
          return true;
        }
      }
      
      // Search in topics
      if (item.topics && Array.isArray(item.topics)) {
        if (item.topics.some(topic => topic.toLowerCase().includes(searchTerm))) {
          return true;
        }
      }
      
      return false;
    });
    
    return filteredMedia.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [query, mediaList]);

  // Test download function for debugging
  const testDownloadFromSearch = async () => {
    if (displayResults.length > 0) {
      const testItem = displayResults[0];
      console.log('🧪 Testing download with first search result:', testItem);
      
      const contentType = testItem.contentType === 'music' ? 'audio' : 
                        testItem.contentType === 'videos' ? 'video' : 
                        testItem.contentType === 'books' ? 'ebook' : 
                        testItem.contentType === 'live' ? 'live' : 'video';
      
      const downloadableItem = convertToDownloadableItem(testItem, contentType as any);
      console.log('🧪 Converted test item:', downloadableItem);
      
      const result = await handleDownload(downloadableItem);
      console.log('🧪 Test download result:', result);
      
      if (result.success) {
        Alert.alert('Test Success', 'Test download successful!');
      } else {
        Alert.alert('Test Failed', result.message || 'Test download failed');
      }
    } else {
      Alert.alert('No Items', 'No search results to test with');
    }
  };

  const removePastSearch = (item: string) => {
    setPastSearches(pastSearches.filter((keyword) => keyword !== item));
  };

  const closeModal = () => {
    setModalIndex(null);
  };

  // Handle search query changes
  useEffect(() => {
    if (query.trim()) {
      setHasSearched(true);
      // Add to past searches if not already there
      if (!pastSearches.includes(query)) {
        setPastSearches([query, ...pastSearches.slice(0, 4)]);
      }
    } else {
      setHasSearched(false);
    }
  }, [query, pastSearches]);

  // Handle past search selection
  const handlePastSearchSelect = (keyword: string) => {
    setQuery(keyword);
  };

  // Audio playback functions
  const toggleAudioPlayback = async (itemId: string, fileUrl: string) => {
    try {
      if (playingAudio === itemId) {
        // Stop current audio
        if (audioRefs.current[itemId]) {
          await audioRefs.current[itemId].pauseAsync();
        }
        setPlayingAudio(null);
      } else {
        // Stop any other playing audio first
        if (playingAudio && audioRefs.current[playingAudio]) {
          await audioRefs.current[playingAudio].pauseAsync();
        }
        
        // Start new audio
        if (!audioRefs.current[itemId]) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: fileUrl },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded && status.durationMillis && status.positionMillis) {
                const duration = status.durationMillis;
                const position = status.positionMillis;
                setAudioProgress(prev => ({ ...prev, [itemId]: position / duration }));
                setAudioPosition(prev => ({ ...prev, [itemId]: position }));
                setAudioDuration(prev => ({ ...prev, [itemId]: duration }));
                
                if (status.didJustFinish) {
                  setPlayingAudio(null);
                  setAudioProgress(prev => ({ ...prev, [itemId]: 0 }));
                  setAudioPosition(prev => ({ ...prev, [itemId]: 0 }));
                }
              }
            }
          );
          audioRefs.current[itemId] = sound;
        } else {
          await audioRefs.current[itemId].playAsync();
        }
        setPlayingAudio(itemId);
      }
    } catch (error) {
      console.error('Error toggling audio playback:', error);
    }
  };

  // Video navigation function
  const navigateToReels = (item: MediaItem, index: number) => {
    const videoListForNavigation = displayResults
      .filter(result => result.contentType === 'videos')
      .map((v, idx) => ({
        title: v.title,
        speaker: v.speaker || v.uploadedBy || getDisplayName(v.speaker, v.uploadedBy),
        timeAgo: v.timeAgo || new Date(v.createdAt).toLocaleDateString(),
        views: v.viewCount || 0,
        sheared: v.sheared || 0,
        saved: v.saved || 0,
        favorite: v.favorite || 0,
        imageUrl: v.fileUrl,
        speakerAvatar: typeof v.speakerAvatar === "string" 
          ? v.speakerAvatar 
          : require("../../assets/images/Avatar-1.png").toString(),
      }));

    router.push({
      pathname: "/reels/Reelsviewscroll",
      params: {
        title: item.title,
        speaker: item.speaker || item.uploadedBy || getDisplayName(item.speaker, item.uploadedBy),
        timeAgo: item.timeAgo || new Date(item.createdAt).toLocaleDateString(),
        views: String(item.viewCount || 0),
        sheared: String(item.sheared || 0),
        saved: String(item.saved || 0),
        favorite: String(item.favorite || 0),
        imageUrl: item.fileUrl,
        speakerAvatar: typeof item.speakerAvatar === "string" 
          ? item.speakerAvatar 
          : require("../../assets/images/Avatar-1.png").toString(),
        category: item.contentType,
        videoList: JSON.stringify(videoListForNavigation),
        currentIndex: String(index),
      },
    });
  };

  const getThumbnailSource = (item: MediaItem) => {
    if (item.thumbnailUrl) {
      return { uri: item.thumbnailUrl };
    }
    if (item.imageUrl && typeof item.imageUrl === 'object' && item.imageUrl.uri) {
      return item.imageUrl;
    }
    // Fallback to default image based on content type
    switch (item.contentType) {
      case 'videos':
        return require("../../assets/images/image (10).png");
      case 'music':
        return require("../../assets/images/image (12).png");
      case 'books':
        return require("../../assets/images/image (13).png");
      case 'live':
        return require("../../assets/images/image (14).png");
      default:
        return require("../../assets/images/image (10).png");
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'videos':
        return 'play-circle-outline';
      case 'music':
        return 'musical-notes-outline';
      case 'books':
        return 'book-outline';
      case 'live':
        return 'radio-outline';
      default:
        return 'play-circle-outline';
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderMediaCard = ({ item, index }: { item: MediaItem; index: number }) => {
    const isVideo = item.contentType === 'videos';
    const isMusic = item.contentType === 'music';
    const itemId = item._id || item.fileUrl || `item-${index}`;
    const isAudioPlaying = playingAudio === itemId;

    return (
      <View className="w-[48%] mb-4 h-[232px] rounded-xl overflow-hidden bg-gray-100">
        {isVideo ? (
          // Video content - show video thumbnail with play overlay
          <TouchableOpacity
            onPress={() => navigateToReels(item, index)}
            className="w-full h-full"
            activeOpacity={0.9}
          >
            <Image
              source={getThumbnailSource(item)}
              className="h-full w-full rounded-xl"
              resizeMode="cover"
            />
            
            {/* Play overlay for videos */}
            <View className="absolute inset-0 justify-center items-center">
              <View className="bg-black/50 rounded-full p-3">
                <Ionicons name="play" size={24} color="white" />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          // Non-video content (music, books, etc.) - show thumbnail
          <Image
            source={getThumbnailSource(item)}
            className="h-full w-full rounded-xl"
            resizeMode="cover"
          />
        )}
        
        {/* Content type icon */}
        <View className="absolute top-2 left-2 bg-black/50 rounded-full p-1">
          <Ionicons 
            name={getContentTypeIcon(item.contentType) as any} 
            size={16} 
            color="white" 
          />
        </View>

        {/* Audio controls for music */}
        {isMusic && (
          <View className="absolute bottom-2 left-2 right-2">
            <View className="bg-black/70 rounded-lg p-2">
              <View className="flex-row items-center justify-between mb-1">
                <TouchableOpacity
                  onPress={() => toggleAudioPlayback(itemId, item.fileUrl)}
                  className="bg-white/20 rounded-full p-1"
                >
                  <Ionicons 
                    name={isAudioPlaying ? "pause" : "play"} 
                    size={16} 
                    color="white" 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => setModalIndex(modalIndex === index ? null : index)}
                  className="p-1"
                >
                  <Ionicons name="ellipsis-vertical" size={16} color="white" />
                </TouchableOpacity>
              </View>
              
              {/* Progress bar for audio */}
              {audioDuration[itemId] && (
                <View className="w-full">
                  <View className="w-full h-1 bg-white/30 rounded-full">
                    <View 
                      className="h-1 bg-white rounded-full" 
                      style={{ width: `${(audioProgress[itemId] || 0) * 100}%` }}
                    />
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-white text-xs font-rubik">
                      {formatTime(audioPosition[itemId] || 0)}
                    </Text>
                    <Text className="text-white text-xs font-rubik">
                      {formatTime(audioDuration[itemId] || 0)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Title overlay for non-music content */}
        {!isMusic && (
          <View className="absolute bottom-2 left-2 right-2">
            <View className="flex flex-row justify-between items-center">
              <Text className="text-white font-rubik-bold text-sm flex-1 mr-2" numberOfLines={2}>
                {item.title}
              </Text>
              <TouchableOpacity
                onPress={() => setModalIndex(modalIndex === index ? null : index)}
                className="p-1"
              >
                <Ionicons name="ellipsis-vertical" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Modal for card actions */}
        {modalIndex === index && (
          <View className="absolute top-2 right-2 bg-white shadow-md rounded-lg p-2 z-50 w-32">
            <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-[#1D2939] font-rubik text-sm">View Details</Text>
              <Ionicons name="eye-outline" size={16} color="#3A3E50" />
            </TouchableOpacity>
            <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-sm text-[#1D2939] font-rubik">Share</Text>
              <Ionicons name="share-outline" size={16} color="#3A3E50" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="py-2 border-b border-gray-200 flex-row items-center justify-between"
              onPress={async () => {
                try {
                  console.log('🔍 Download button pressed for item:', JSON.stringify(item, null, 2));
                  console.log('🔍 Item structure:', {
                    _id: item._id,
                    title: item.title,
                    description: item.description,
                    contentType: item.contentType,
                    fileUrl: item.fileUrl,
                    thumbnailUrl: item.thumbnailUrl,
                    uploadedBy: item.uploadedBy
                  });
                  
                  const contentType = item.contentType === 'music' ? 'audio' : 
                                    item.contentType === 'videos' ? 'video' : 
                                    item.contentType === 'books' ? 'ebook' : 
                                    item.contentType === 'live' ? 'live' : 'video';
                  console.log('📱 Content type determined:', contentType);
                  const downloadableItem = convertToDownloadableItem(item, contentType as any);
                  console.log('📦 Converted downloadable item:', JSON.stringify(downloadableItem, null, 2));
                  const result = await handleDownload(downloadableItem);
                  console.log('📥 Download result:', result);
                  
                  if (result.success) {
                    console.log('✅ Download successful, closing modal');
                    Alert.alert('Success', 'Item downloaded successfully!');
                    setModalIndex(null);
                    // Force a re-render to update the download status
                    setTimeout(() => {
                      console.log('🔄 Forcing re-render');
                      // Force reload downloads
                      loadDownloadedItems();
                    }, 100);
                  } else {
                    console.log('❌ Download failed:', result.message);
                    Alert.alert('Info', result.message || 'Download failed');
                  }
                } catch (error) {
                  console.error('💥 Download error:', error);
                }
              }}
            >
              <Text className="text-[#1D2939] font-rubik text-sm">
                {checkIfDownloaded(item._id || item.fileUrl) ? "Downloaded" : "Download"}
              </Text>
              <Ionicons 
                name={checkIfDownloaded(item._id || item.fileUrl) ? "checkmark-circle" : "download-outline"} 
                size={16} 
                color={checkIfDownloaded(item._id || item.fileUrl) ? "#256E63" : "#3A3E50"} 
              />
            </TouchableOpacity>
            <TouchableOpacity className="py-2 flex-row items-center justify-between">
              <Text className="text-[#1D2939] font-rubik text-sm">Save</Text>
              <Ionicons name="bookmark-outline" size={16} color="#3A3E50" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-20">
      {hasSearched ? (
        <View className="items-center">
          <Ionicons name="search-outline" size={48} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-lg font-rubik-semibold mt-4">
            No results found
          </Text>
          <Text className="text-[#9CA3AF] text-sm font-rubik text-center mt-2 px-8">
            Try searching with different keywords
          </Text>
        </View>
      ) : mediaList.length === 0 ? (
        <View className="items-center">
          <Ionicons name="folder-outline" size={48} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-lg font-rubik-semibold mt-4">
            No content available
          </Text>
          <Text className="text-[#9CA3AF] text-sm font-rubik text-center mt-2 px-8">
            Upload some content to see it here
          </Text>
        </View>
      ) : (
        <View className="items-center">
          <Ionicons name="search-outline" size={48} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-lg font-rubik-semibold mt-4">
            All Content
          </Text>
          <Text className="text-[#9CA3AF] text-sm font-rubik text-center mt-2 px-8">
            Browse all available content or search for specific items
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <AuthHeader title="Search and Filter" />

      {/* Main Scrollable Content */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        className="px-4 bg-[#FCFCFD]"
        showsVerticalScrollIndicator={false}
        onScroll={closeModal}
        scrollEventThrottle={16}
      >
        {/* Search */}
        <View className="flex flex-row items-center mt-3 w-full">
          <View className="flex-row items-center px-2 bg-gray-100 w-[315px] rounded-xl h-[42px] mb-3 flex-1">
            <View className="ml-2">
              <Ionicons name="search" size={20} color="#666" />
            </View>
            <TextInput
              placeholder="Search for anything..."
              className="ml-3 flex-1 text-base font-rubik items-center"
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <TouchableOpacity 
            onPress={() => router.push("/ExploreSearch/FilterScreen")}
            className="ml-3 mb-2 w-6 h-6 items-center justify-center"
          >
            <Ionicons name="options-outline" size={24} color="#3B3B3B" />
          </TouchableOpacity>
        </View>

        {/* Test Download Button */}
        {displayResults.length > 0 && (
          <TouchableOpacity 
            onPress={testDownloadFromSearch}
            className="bg-green-500 px-4 py-2 rounded-lg mb-4"
          >
            <Text className="text-white font-rubik">Test Download First Result</Text>
          </TouchableOpacity>
        )}


        {/* Past Search Keywords - only show when no search is active */}
        {!hasSearched && pastSearches.length > 0 && (
          <View className="mb-4">
            <Text className="text-gray-700 text-base font-rubik-semibold mb-2">
              Recent Searches
            </Text>
            {pastSearches.map((keyword, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handlePastSearchSelect(keyword)}
                className="flex-row items-center justify-between px-2 py-2 bg-gray-50 rounded-lg mb-1"
              >
                <Text className="text-gray-700 text-base">{keyword}</Text>
                <TouchableOpacity onPress={() => removePastSearch(keyword)}>
                  <Ionicons name="close" size={18} color="gray" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content Header */}
        <View className="mb-4">
          <Text className="text-gray-700 text-base font-rubik-semibold mb-2">
            {hasSearched ? `Search Results (${displayResults.length})` : `All Content (${displayResults.length})`}
          </Text>
        </View>

        {/* Media Cards */}
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={closeModal}
          className="flex-1"
        >
          {displayResults.length > 0 ? (
            <FlatList
              data={displayResults}
              renderItem={renderMediaCard}
              keyExtractor={(item, index) => item._id || `search-${index}`}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: "space-between" }}
              scrollEnabled={false}
            />
          ) : (
            renderEmptyState()
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
