import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
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
import SuccessCard from "../components/SuccessCard";
import unifiedSearchAPI, { UnifiedSearchItem } from "../services/unifiedSearchAPI";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import { useDownloadStore } from "../store/useDownloadStore";
import { MediaItem, useMediaStore } from "../store/useUploadStore";
import { playOrToggleTrack } from "../../src/shared/audio/playOrToggleTrack";
import { convertToDownloadableItem, useDownloadHandler } from "../utils/downloadUtils";
import {
    addToSearchHistory,
    getSearchHistory,
    getTrendingSearches,
    removeFromSearchHistory
} from "../utils/searchHistoryUtils";
import { getDisplayName } from "../utils/userValidation";

export default function ExploreSearch() {
  const [query, setQuery] = useState("");
  const [pastSearches, setPastSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<Array<{query: string, count: number, category?: string}>>([]);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Search results state
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Success card state
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  const currentTrackId = useGlobalAudioPlayerStore((s) => s.currentTrack?.id);
  const sessionPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const sessionProgress = useGlobalAudioPlayerStore((s) => s.progress);
  const sessionDuration = useGlobalAudioPlayerStore((s) => s.duration);
  const sessionPosition = useGlobalAudioPlayerStore((s) => s.position);
  const playingAudio =
    currentTrackId && sessionPlaying ? currentTrackId : null;
  
  // Get all media from store
  const { mediaList } = useMediaStore();
  
  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();
  
  // Load downloaded items and search history on component mount
  useEffect(() => {
    loadDownloadedItems();
    loadSearchHistory();
  }, [loadDownloadedItems]);

  // Load search history from storage
  const loadSearchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const [history, trending] = await Promise.all([
        getSearchHistory(),
        getTrendingSearches()
      ]);
      
      setPastSearches(history.map(item => item.query));
      setTrendingSearches(trending);
    } catch (error) {
      console.error("Failed to load search history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Transform unified search item to MediaItem format
  const transformSearchItem = (item: UnifiedSearchItem): MediaItem => {
    return {
      _id: item._id || item.id,
      title: item.title,
      description: item.description || "",
      speaker: item.speaker || item.artist || "",
      uploadedBy: item.uploadedBy || "",
      category: item.category ? [item.category] : [],
      topics: [],
      thumbnailUrl: item.thumbnailUrl || "",
      fileUrl: item.fileUrl || item.audioUrl || "",
      contentType: item.contentType || (item.type === "copyright-free" ? "copyright-free-music" : "audio"),
      duration: item.duration || 0,
      viewCount: item.viewCount || item.views || 0,
      listenCount: item.listenCount || 0,
      readCount: item.readCount || 0,
      likeCount: item.likeCount || item.likes || 0,
      createdAt: item.createdAt,
      updatedAt: item.createdAt,
      year: item.year,
      isLiked: item.isLiked || false,
      isInLibrary: item.isInLibrary || false,
      isPublicDomain: item.isPublicDomain || false,
    };
  };

  // Debounced search effect
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Don't search if query is empty
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      setHasSearched(false);
      return;
    }

    // Set loading state
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    // Debounce: Wait 500ms after user stops typing
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await unifiedSearchAPI.search(query.trim(), {
          contentType: "all",
          limit: 50,
          sort: "relevance",
        });

        if (response.success && response.data) {
          const transformedResults = response.data.results.map(transformSearchItem);
          setSearchResults(transformedResults);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchError("Failed to search. Please try again.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce delay

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  // Display all content or search results
  const displayResults = useMemo(() => {
    if (!query.trim()) {
      // Show all content when no search query
      return mediaList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    
    // Show search results when query exists
    return searchResults;
  }, [query, mediaList, searchResults]);


  const removePastSearch = async (item: string) => {
    try {
      await removeFromSearchHistory(item);
      // Reload search history to show updated list
      await loadSearchHistory();
    } catch (error) {
      console.error("Failed to remove search from history:", error);
    }
  };

  const closeModal = () => {
    setModalIndex(null);
  };

  // Handle search query changes
  useEffect(() => {
    if (query.trim()) {
      setHasSearched(true);
    } else {
      setHasSearched(false);
    }
  }, [query]);

  // Save search to history when user performs a search
  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.trim()) {
      try {
        await addToSearchHistory(searchQuery.trim());
        // Reload search history to show updated list
        await loadSearchHistory();
      } catch (error) {
        console.error("Failed to save search to history:", error);
      }
    }
  };

  // Handle past search selection
  const handlePastSearchSelect = async (keyword: string) => {
    setQuery(keyword);
    // Also save this selection to history
    await handleSearch(keyword);
  };

  const toggleAudioPlayback = async (item: MediaItem) => {
    const itemId = item._id || item.fileUrl;
    const fileUrl = item.fileUrl || (item as any).audioUrl;
    if (!itemId || !fileUrl) return;
    await playOrToggleTrack({
      id: String(itemId),
      title: item.title || "Audio",
      artist: String(item.speaker || item.uploadedBy || ""),
      audioUrl: fileUrl,
      thumbnailUrl:
        typeof item.thumbnailUrl === "string"
          ? item.thumbnailUrl
          : (item as any).imageUrl || "",
      duration: Number(item.duration) || 0,
      source: "feed",
    });
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
        source: "ExploreSearch",
      },
    });
  };

  const getThumbnailSource = (item: MediaItem) => {
    // First try thumbnailUrl
    if (item.thumbnailUrl) {
      return { uri: item.thumbnailUrl };
    }
    
    // Then try imageUrl
    if (item.imageUrl && typeof item.imageUrl === 'object' && item.imageUrl.uri) {
      return item.imageUrl;
    }
    
    // For videos, try using the fileUrl as a last resort (some video URLs might work as thumbnails)
    if (item.contentType === 'videos' && item.fileUrl) {
      return { uri: item.fileUrl };
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
            <View className="p-2">
              <View className="flex-row items-center justify-between mb-1">
                <TouchableOpacity
                  onPress={() => toggleAudioPlayback(item)}
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
              {playingAudio === itemId && sessionDuration > 0 && (
                <View className="w-full">
                  <View className="w-full h-1 bg-white/30 rounded-full">
                    <View 
                      className="h-1 bg-white rounded-full" 
                      style={{ width: `${(sessionProgress || 0) * 100}%` }}
                    />
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-white text-xs font-rubik">
                      {formatTime(sessionPosition || 0)}
                    </Text>
                    <Text className="text-white text-xs font-rubik">
                      {formatTime(sessionDuration || 0)}
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
              <MaterialIcons name="visibility" size={16} color="#3A3E50" />
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
                    setModalIndex(null);
                    setSuccessMessage("Downloaded successfully!");
                    setShowSuccessCard(true);
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
      {isSearching ? (
        <View className="items-center">
          <ActivityIndicator size="large" color="#256E63" />
          <Text className="text-[#9CA3AF] text-lg font-rubik-semibold mt-4">
            Searching...
          </Text>
        </View>
      ) : hasSearched ? (
        <View className="items-center">
          <Ionicons name="search-outline" size={48} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-lg font-rubik-semibold mt-4">
            {searchError || "No results found"}
          </Text>
          <Text className="text-[#9CA3AF] text-sm font-rubik text-center mt-2 px-8">
            {searchError ? "Please try again" : "Try searching with different keywords"}
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
      {showSuccessCard && (
        <SuccessCard
          message={successMessage}
          onClose={() => setShowSuccessCard(false)}
          duration={3000}
        />
      )}
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
              onSubmitEditing={() => handleSearch(query)}
              returnKeyType="search"
            />
            {query.trim().length > 0 && (
              <TouchableOpacity
                onPress={() => handleSearch(query)}
                disabled={isSearching}
                className="mr-2 p-1"
              >
                <Ionicons 
                  name="search" 
                  size={20} 
                  color={isSearching ? "#9CA3AF" : "#256E63"} 
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            onPress={() => router.push("/ExploreSearch/FilterScreen")}
            className="ml-3 mb-2 w-6 h-6 items-center justify-center"
          >
            <Ionicons name="options-outline" size={24} color="#3B3B3B" />
          </TouchableOpacity>
        </View>



        {/* Search Suggestions - only show when no search is active */}
        {!hasSearched && !isLoadingHistory && (
          <View className="mb-4">
            {pastSearches.length > 0 ? (
              <>
            <Text className="text-gray-700 text-base font-rubik-semibold mb-2">
              Recent Searches
            </Text>
                {pastSearches.slice(0, 5).map((keyword, index) => (
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
              </>
            ) : trendingSearches.length > 0 ? (
              <>
                <Text className="text-gray-700 text-base font-rubik-semibold mb-2">
                  Popular Searches
                </Text>
                {trendingSearches.slice(0, 5).map((trendingItem: { query: string; }, index: any) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handlePastSearchSelect(trendingItem.query)}
                    className="flex-row items-center justify-between px-2 py-2 bg-gray-50 rounded-lg mb-1"
                  >
                    <Text className="text-gray-700 text-base">{trendingItem.query}</Text>
                    <Ionicons name="trending-up" size={18} color="#256E63" />
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text className="text-gray-700 text-base font-rubik-semibold mb-2">
                  Suggested Searches
                </Text>
                {["Worship", "Prayer", "Faith", "Healing", "Grace"].map((keyword, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handlePastSearchSelect(keyword)}
                    className="flex-row items-center justify-between px-2 py-2 bg-gray-50 rounded-lg mb-1"
                  >
                    <Text className="text-gray-700 text-base">{keyword}</Text>
                    <Ionicons name="search" size={18} color="#256E63" />
                  </TouchableOpacity>
                ))}
              </>
            )}
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
          {isSearching ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#256E63" />
              <Text className="text-[#9CA3AF] text-sm font-rubik mt-4">
                Searching...
              </Text>
            </View>
          ) : displayResults.length > 0 ? (
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