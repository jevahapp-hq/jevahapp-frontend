// 



// CommunityScreen.tsx
import { useRouter } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import BottomNav from "../../components/BottomNav";


import { Ionicons } from "@expo/vector-icons";
import OptimizedTouchableOpacity from "../../components/OptimizedTouchableOpacity";
import { useFastButton } from "../../hooks/useFastButton";
import { usePerformanceMonitor } from "../../hooks/usePerformanceMonitor";
import AllLibrary from "./AllLibrary";
import EbooksLibrary from "./EbooksLibrary";
import LiveLibrary from "./LiveLibrary";
import MusicLibrary from "./MusicLibrary";
import SermonLibrary from "./SermonLibrary";
import VideoLibrary from "./VideoLibrary";


const categories = ["ALL", "LIVE", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];

// Memoized category button component for better performance
const LibraryCategoryButton = memo(({ 
  category, 
  isSelected, 
  onPress 
}: { 
  category: string; 
  isSelected: boolean; 
  onPress: () => void; 
}) => {
  const buttonHandler = useFastButton(onPress, {
    preventRapidClicks: true,
    rapidClickThreshold: 50, // Faster response
    hapticFeedback: true,
    hapticType: 'light',
  });

  return (
    <OptimizedTouchableOpacity
      onPress={buttonHandler.handlePress}
      activeOpacity={0.7}
      preventRapidClicks={true}
      rapidClickThreshold={50}
      hapticFeedback={true}
      hapticType="light"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 4,
        borderRadius: 10,
        backgroundColor: isSelected ? "black" : "white",
        borderWidth: isSelected ? 0 : 1,
        borderColor: isSelected ? "transparent" : "#6B6E7C",
        minWidth: 48,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: isSelected ? "white" : "#1D2939",
          fontFamily: "Rubik_600SemiBold",
          fontSize: 14,
        }}
      >
        {category}
      </Text>
    </OptimizedTouchableOpacity>
  );
});

LibraryCategoryButton.displayName = 'LibraryCategoryButton';

// Memoized content components for lazy loading
const LazyAllLibrary = memo(() => <AllLibrary />);
const LazyLiveLibrary = memo(() => <LiveLibrary />);
const LazySermonLibrary = memo(() => <SermonLibrary />);
const LazyMusicLibrary = memo(() => <MusicLibrary />);
const LazyEbooksLibrary = memo(() => <EbooksLibrary />);
const LazyVideoLibrary = memo(() => <VideoLibrary />);

LazyAllLibrary.displayName = 'LazyAllLibrary';
LazyLiveLibrary.displayName = 'LazyLiveLibrary';
LazySermonLibrary.displayName = 'LazySermonLibrary';
LazyMusicLibrary.displayName = 'LazyMusicLibrary';
LazyEbooksLibrary.displayName = 'LazyEbooksLibrary';
LazyVideoLibrary.displayName = 'LazyVideoLibrary';

export default function LibraryScreen() {
  const [selectedCategoryA, setSelectedCategorA] = useState("ALL");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("Library");
  const router = useRouter();

  // Performance monitoring
  const performance = usePerformanceMonitor({
    componentName: 'LibraryScreen',
    trackRenders: true,
    trackButtonClicks: true,
    slowButtonThreshold: 50, // Expect faster response
  });

  // Optimized category press handler
  const handleCategoryPress = useCallback((category: string) => {
    setSelectedCategorA(category);
  }, []);

  // Create individual fast button handlers for each category
  const allButtonHandler = useFastButton(() => handleCategoryPress("ALL"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const liveButtonHandler = useFastButton(() => handleCategoryPress("LIVE"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const sermonButtonHandler = useFastButton(() => handleCategoryPress("SERMON"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const musicButtonHandler = useFastButton(() => handleCategoryPress("MUSIC"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const ebookButtonHandler = useFastButton(() => handleCategoryPress("E-BOOKS"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  const videoButtonHandler = useFastButton(() => handleCategoryPress("VIDEO"), {
    preventRapidClicks: true,
    rapidClickThreshold: 50,
    hapticFeedback: true,
    hapticType: 'light',
  });

  // Memoized category button handlers mapping
  const categoryButtonHandlers = useMemo(() => ({
    "ALL": allButtonHandler.handlePress,
    "LIVE": liveButtonHandler.handlePress,
    "SERMON": sermonButtonHandler.handlePress,
    "MUSIC": musicButtonHandler.handlePress,
    "E-BOOKS": ebookButtonHandler.handlePress,
    "VIDEO": videoButtonHandler.handlePress,
  } as Record<string, () => void>), [allButtonHandler, liveButtonHandler, sermonButtonHandler, musicButtonHandler, ebookButtonHandler, videoButtonHandler]);

  // Memoized content renderer
  const renderContent = useMemo(() => {
    switch (selectedCategoryA) {
      case "ALL":
        return <LazyAllLibrary />;
      case "LIVE":
        return <LazyLiveLibrary />;
      case "SERMON":
        return <LazySermonLibrary />;
      case "MUSIC":
        return <LazyMusicLibrary />;
      case "E-BOOKS":
        return <LazyEbooksLibrary />;
      case "VIDEO":
        return <LazyVideoLibrary />;
      default:
        return <LazyAllLibrary />;
    }
  }, [selectedCategoryA]);

  // Memoized category buttons
  const categoryButtons = useMemo(() => (
    categories.map((category) => (
      <LibraryCategoryButton
        key={category}
        category={category}
        isSelected={selectedCategoryA === category}
        onPress={categoryButtonHandlers[category]}
      />
    ))
  ), [selectedCategoryA, categoryButtonHandlers]);

  return (
    <View className="flex-col bg-white flex-1">

      <Text className="mt-12 text-[24px] font-rubik-semibold ml-7 text-[#344054]">My Library</Text>
       <View className="flex-row items-center  mx-auto px-2 bg-[#E5E5EA] w-[360px] rounded-xl  h-[42px] mt-3">
           <View className="ml-2 ">
           <Ionicons name="search" size={20} color="#666" />
           </View>
            <TextInput
              placeholder="Search for anything..."
              className="ml-3 flex-1 text-base font-rubik items-center"
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 50,
      
      }}
      showsVerticalScrollIndicator={false}
    className="bg-[#98a2b318] mt-6"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-2 py-2 mt-6 "
      >
        {categoryButtons}
      </ScrollView>

     <View className="flex-1 mb-24">{renderContent}</View>
 
    </ScrollView>
      {/* Bottom Nav overlay */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: "transparent",
        }}
      >
        <BottomNav
          selectedTab={activeTab}
          setSelectedTab={(tab) => {
            setActiveTab(tab);
            switch (tab) {
              case "Home":
                router.replace({ pathname: "/categories/HomeScreen" });
                break;
              case "Community":
                router.replace({ pathname: "/screens/CommunityScreen" });
                break;
              case "Library":
                router.replace({ pathname: "/screens/library/LibraryScreen" });
                break;
              case "Account":
                router.replace({ pathname: "/screens/AccountScreen" });
                break;
              default:
                break;
            }
          }}
        />
      </View>
    </View>
    
  );
}
