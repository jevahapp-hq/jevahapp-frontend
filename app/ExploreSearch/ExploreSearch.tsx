import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
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
import allMediaAPI, { AllMediaItem } from "../utils/allMediaAPI";

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
  const [searchResults, setSearchResults] = useState<AllMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const removePastSearch = (item: string) => {
    setPastSearches(pastSearches.filter((keyword) => keyword !== item));
  };

  const closeModal = () => {
    setModalIndex(null);
  };

  // Search function
  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await allMediaAPI.searchAllMedia(searchTerm, 50);
      setSearchResults(response.media || []);
      setHasSearched(true);
      
      // Add to past searches if not already there
      if (!pastSearches.includes(searchTerm)) {
        setPastSearches([searchTerm, ...pastSearches.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setSearchResults([]);
        setHasSearched(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle past search selection
  const handlePastSearchSelect = (keyword: string) => {
    setQuery(keyword);
    performSearch(keyword);
  };

  const getThumbnailSource = (item: AllMediaItem) => {
    if (item.thumbnailUrl) {
      return { uri: item.thumbnailUrl };
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

  const renderMediaCard = ({ item, index }: { item: AllMediaItem; index: number }) => (
    <View className="w-[48%] mb-4 h-[232px] rounded-xl overflow-hidden bg-gray-100">
      <Image
        source={getThumbnailSource(item)}
        className="h-full w-full rounded-xl"
        resizeMode="cover"
      />
      
      
   
      <View className="absolute top-2 left-2 bg-black/50 rounded-full p-1">
        <Ionicons 
          name={getContentTypeIcon(item.contentType) as any} 
          size={16} 
          color="white" 
        />
      </View>

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
          <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-[#1D2939] font-rubik text-sm">Download</Text>
            <Ionicons name="download-outline" size={16} color="#3A3E50" />
          </TouchableOpacity>
          <TouchableOpacity className="py-2 flex-row items-center justify-between">
            <Text className="text-[#1D2939] font-rubik text-sm">Save</Text>
            <Ionicons name="bookmark-outline" size={16} color="#3A3E50" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-20">
      {isLoading ? (
        <View className="items-center">
          <Ionicons name="search" size={48} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-lg font-rubik-semibold mt-4">
            Searching...
          </Text>
        </View>
      ) : hasSearched ? (
        <View className="items-center">
          <Ionicons name="search-outline" size={48} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-lg font-rubik-semibold mt-4">
            No results found
          </Text>
          <Text className="text-[#9CA3AF] text-sm font-rubik text-center mt-2 px-8">
            Try searching with different keywords
          </Text>
        </View>
      ) : (
        <View className="items-center">
          <Ionicons name="search-outline" size={48} color="#9CA3AF" />
          <Text className="text-[#9CA3AF] text-lg font-rubik-semibold mt-4">
            Search for content
          </Text>
          <Text className="text-[#9CA3AF] text-sm font-rubik text-center mt-2 px-8">
            Search across all videos, music, books, and live content
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Top Content */}
      <View className="px-6">
        <AuthHeader title="Explore" />

        {/* Search Bar */}
        <View className="flex flex-row w-[360px] justify-between">
          <View className="flex-row items-center px-4 bg-gray-100 w-[320px] rounded-xl  h-[42px] mb-3">
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

          <TouchableOpacity onPress={() => router.push("/ExploreSearch/FilterScreen")} className="ml-3">
            <Ionicons name="options" size={36} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content with matching px-6 */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 50 }}
        onScroll={closeModal}
        scrollEventThrottle={16}
      >
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

        {/* Search Results */}
        {hasSearched && (
          <View className="mb-4">
            <Text className="text-gray-700 text-base font-rubik-semibold mb-2">
              Search Results ({searchResults.length})
            </Text>
          </View>
        )}

        {/* Media Cards */}
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={closeModal}
          className="flex-1"
        >
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderMediaCard}
              keyExtractor={(item) => item._id}
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
