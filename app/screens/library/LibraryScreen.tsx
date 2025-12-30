import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
    getResponsiveBorderRadius,
    getResponsiveShadow,
    getResponsiveSpacing,
    getResponsiveTextStyle,
} from "../../../utils/responsive";
import CopyrightFreeSongs from "../../components/CopyrightFreeSongs";
import BottomNavOverlay from "../../components/layout/BottomNavOverlay";
import { useFastPerformance } from "../../utils/fastPerformance";
import { navigateMainTab } from "../../utils/navigation";
import { AllLibraryWithSuspense } from "../../utils/lazyImports";
import PlaylistsLibrary from "./PlaylistsLibrary";
import Music from "../../categories/music";
import { Suspense } from "react";

// Loading fallback for lazy-loaded content
const ContentLoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", minHeight: 200 }}>
    <ActivityIndicator size="large" color="#000" />
  </View>
);

const categories = ["ALL", "SERMON", "MUSIC", "E-BOOKS", "VIDEO", "PLAYLISTS"];

export default function LibraryScreen() {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("Library");
  const router = useRouter();
  const { fastPress } = useFastPerformance();
  const scrollViewRef = useRef<ScrollView>(null);
  const buttonLayouts = useRef<{ [key: string]: { x: number; width: number } }>({});

  // Scroll to selected category button when category changes
  useEffect(() => {
    if (selectedCategory && scrollViewRef.current) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        const selectedIndex = categories.indexOf(selectedCategory);
        if (selectedIndex !== -1 && scrollViewRef.current) {
          const scrollView = scrollViewRef.current;
          const screenWidth = Dimensions.get('window').width;
          const parentPadding = getResponsiveSpacing(16, 20, 24, 32);
          const scrollViewWidth = screenWidth - parentPadding * 2;
          
          // Try to use stored position if available
          if (buttonLayouts.current[selectedCategory]) {
            const buttonLayout = buttonLayouts.current[selectedCategory];
            // Calculate scroll position to center the button in the viewport
            const buttonCenter = buttonLayout.x + (buttonLayout.width / 2);
            const viewportCenter = scrollViewWidth / 2;
            const scrollPosition = buttonCenter - viewportCenter;
            
            scrollView.scrollTo({
              x: Math.max(0, scrollPosition),
              animated: true,
            });
          } else {
            // Fallback: scroll based on approximate position
            const buttonWidth = 100; // Approximate button width including padding
            const buttonMargin = getResponsiveSpacing(4, 6, 8, 10) * 2; // Left + right margin
            
            // Calculate approximate button position
            let accumulatedWidth = 0;
            for (let i = 0; i < selectedIndex; i++) {
              accumulatedWidth += buttonWidth + buttonMargin;
            }
            
            // Center the button
            const scrollPosition = accumulatedWidth - (scrollViewWidth / 2) + (buttonWidth / 2) - parentPadding;
            
            scrollView.scrollTo({
              x: Math.max(0, scrollPosition),
              animated: true,
            });
          }
        }
      }, 200);
    }
  }, [selectedCategory]);

  const handleCategoryPress = useCallback(
    (category: string) => {
      // Immediate visual feedback
      setSelectedCategory(category);
    },
    []
  );

  const renderContent = () => {
    switch (selectedCategory) {
      case "ALL":
        return (
          <Suspense fallback={<ContentLoadingFallback />}>
            <AllLibraryWithSuspense contentType="ALL" />
          </Suspense>
        );
      case "SERMON":
        return (
          <Suspense fallback={<ContentLoadingFallback />}>
            <AllLibraryWithSuspense contentType="SERMON" />
          </Suspense>
        );
      case "MUSIC":
        return <Music />;
      case "E-BOOKS":
        return (
          <Suspense fallback={<ContentLoadingFallback />}>
            <AllLibraryWithSuspense contentType="E-BOOKS" />
          </Suspense>
        );
      case "VIDEO":
        return (
          <Suspense fallback={<ContentLoadingFallback />}>
            <AllLibraryWithSuspense contentType="VIDEO" />
          </Suspense>
        );
      case "PLAYLISTS":
        return <PlaylistsLibrary />;
      default:
        return null;
    }
  };

  return (
    <View className="flex-col bg-white flex-1">
      <Text className="mt-12 text-[24px] font-rubik-semibold ml-7 text-[#344054]">
        My Library
      </Text>
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

      {/* Category tabs - matching AllContent style exactly */}
      <View
        style={{
          paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
          backgroundColor: "#FCFCFD",
        }}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            paddingVertical: getResponsiveSpacing(12, 16, 20, 24),
            marginTop: getResponsiveSpacing(20, 24, 28, 32),
          }}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={fastPress(() => handleCategoryPress(category), {
                key: `category_${category}`,
                priority: "high",
              })}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                buttonLayouts.current[category] = { x, width };
              }}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                marginHorizontal: getResponsiveSpacing(4, 6, 8, 10),
                borderRadius: getResponsiveBorderRadius("medium"),
                backgroundColor:
                  selectedCategory === category ? "black" : "white",
                borderWidth: selectedCategory === category ? 0 : 1,
                borderColor:
                  selectedCategory === category ? "transparent" : "#6B6E7C",
                ...getResponsiveShadow(),
                minWidth: 48,
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <View style={{ position: "relative" }}>
                <Text
                  style={[
                    getResponsiveTextStyle("button"),
                    {
                      color:
                        selectedCategory === category ? "white" : "#1D2939",
                    },
                  ]}
                >
                  {category}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content area - conditional rendering to avoid VirtualizedList nesting */}
      {selectedCategory === "PLAYLISTS" ? (
        // PlaylistsLibrary handles its own scrolling with FlatList
        <View className="flex-1 mt-2">{renderContent()}</View>
      ) : (
        // Other categories can use ScrollView
        <View style={{ flex: 1, width: "100%", backgroundColor: "#FCFCFD" }}>
          {renderContent()}
        </View>
      )}
      <BottomNavOverlay
        selectedTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          navigateMainTab(tab as any);
        }}
      />
    </View>
  );
}
