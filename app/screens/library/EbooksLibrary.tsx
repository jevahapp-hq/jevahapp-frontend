import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    FlatList,
    Image,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLibraryStore } from "../../store/useLibraryStore";
import { convertToDownloadableItem, useDownloadHandler } from "../../utils/downloadUtils";



const sampleMedia = [
  {
    id: "1",
    title: "2 Hours time with God with Dunsin Oy...",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "2",
    title: "Living with the Holy Spirit",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "3",
    title: "The power of confidence",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "4",
    title: "30 minutes songs of worship",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "5",
    title: "The Prophetic",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "6",
    title: "Lagos open field praise",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "7",
    title: "Jesus preaches",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "8",
    title: "AI Jams in Lekki Lagos Stadium",
    image: require("../../../assets/images/image (10).png"),
  },
];

const pastSearchesInitial = [
  "Miracles",
  "Spiritual growth",
  "Mega worship",
  "Soaking worship",
  "Love and Light",
];

export default function EbooksLibrary () {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const libraryStore = useLibraryStore();
  const [savedEbooks, setSavedEbooks] = useState<any[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();

  useEffect(() => {
    const loadSavedEbooks = async () => {
      if (!libraryStore.isLoaded) {
        await libraryStore.loadSavedItems();
      }
      
      const ebooks = libraryStore.getSavedItemsByType("e-books");
      setSavedEbooks(ebooks);
      console.log(`📖 Loaded ${ebooks.length} saved e-books`);
    };

    loadSavedEbooks();
  }, [libraryStore.savedItems, libraryStore.isLoaded]);



  const handleRemoveFromLibrary = async (item: any) => {
    await libraryStore.removeFromLibrary(item.id);
    console.log(`🗑️ Removed ${item.title} from library`);
    setMenuOpenId(null);
  };

  const handleShare = async (item: any) => {
    try {
      await Share.share({
        title: item.title,
        message: `Check out this e-book: ${item.title}`,
        url: typeof item.imageUrl === 'string' ? item.imageUrl : (item.fileUrl || ''),
      });
      setMenuOpenId(null);
    } catch (error) {
      console.warn("Share error:", error);
      setMenuOpenId(null);
    }
  };

  const renderMediaCard = ({ item }: any) => (
    <View className="w-[48%] mb-6 h-[232px] rounded-xl overflow-hidden bg-[#E5E5EA]">
      <TouchableOpacity
        onPress={() => {
          // Open book in PDF viewer (same as EbookCard and AllLibrary)
          try {
            const pdfUrl = item.mediaUrl || item.fileUrl || "";
            if (typeof pdfUrl === "string" && /^https?:\/\//.test(pdfUrl)) {
              router.push({
                pathname: "/reader/PdfViewer",
                params: {
                  url: pdfUrl,
                  title: item.title || "Untitled",
                  desc: item.description || "",
                },
              });
            }
          } catch (error) {
            console.error("Error opening book:", error);
          }
        }}
        activeOpacity={0.9}
        className="w-full h-full"
      >
        <Image
          source={
            item.thumbnailUrl 
              ? { uri: item.thumbnailUrl }
              : item.imageUrl 
              ? (typeof item.imageUrl === 'string' ? { uri: item.imageUrl } : item.imageUrl)
              : require("../../../assets/images/image (10).png")
          }
          className="h-full w-full rounded-xl"
          resizeMode="cover"
        />
        <View className="absolute bottom-2 left-2 right-2">
          <Text className="text-white font-rubik-bold text-sm" numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
      {/* Ellipsis Menu Trigger */}
      <TouchableOpacity 
        className="absolute bottom-2 right-2 bg-white rounded-full p-1"
        onPress={() => setMenuOpenId((prev) => (prev === item.id ? null : item.id))}
      >
        <Ionicons name="ellipsis-vertical" size={14} color="#3A3E50" />
      </TouchableOpacity>

      {/* Ellipsis Menu */}
      {menuOpenId === item.id && (
        <>
          <TouchableOpacity
            className="absolute inset-0 z-40"
            activeOpacity={1}
            onPress={() => setMenuOpenId(null)}
          />
          <View className="absolute bottom-10 right-2 bg-white shadow-md rounded-lg p-3 z-50 w-[180px]">
            <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between"
              onPress={() => setMenuOpenId(null)}
            >
              <Text className="text-[#1D2939] font-rubik ml-2">View Details</Text>
              <MaterialIcons name="visibility" size={20} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between"
              onPress={() => handleShare(item)}
            >
              <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
              <Feather name="send" size={20} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between mt-2"
              onPress={() => handleRemoveFromLibrary(item)}
            >
              <Text className="text-[#1D2939] font-rubik ml-2">Remove from Library</Text>
              <MaterialIcons name="bookmark" size={20} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="py-2 flex-row items-center justify-between border-t border-gray-200 mt-2"
              onPress={async () => {
                const downloadableItem = convertToDownloadableItem(item, 'ebook');
                const result = await handleDownload(downloadableItem);
                if (result.success) {
                  setMenuOpenId(null);
                }
              }}
            >
              <Text className="text-[#1D2939] font-rubik ml-2">
                {checkIfDownloaded(item.id) ? "Downloaded" : "Download"}
              </Text>
              <Ionicons 
                name={checkIfDownloaded(item.id) ? "checkmark-circle" : "download-outline"} 
                size={20} 
                color={checkIfDownloaded(item.id) ? "#256E63" : "#090E24"} 
              />
            </TouchableOpacity>
          </View>
        </>
      )}
      {item.speaker && (
        <View className="absolute top-2 left-2 bg-black/50 rounded px-2 py-1">
          <Text className="text-white text-xs font-rubik">{item.speaker}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1  bg-[#98a2b318]">
   

      {/* Scrollable Content with matching px-6 */}
      <ScrollView
        className="flex-1 px-3"
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Past Search Keywords */}
       

        {/* Media Cards */}
        {savedEbooks.length > 0 ? (
          <FlatList
            data={savedEbooks}
            renderItem={renderMediaCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            scrollEnabled={false}
          />
        ) : (
          <View className="flex-1 justify-center items-center py-10">
            <Ionicons name="library-outline" size={48} color="#98A2B3" />
            <Text className="text-[#98A2B3] text-lg font-rubik-medium mt-4">
              No saved e-books yet
            </Text>
            <Text className="text-[#D0D5DD] text-sm font-rubik text-center mt-2 px-6">
              E-books you save will appear here for easy access
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}