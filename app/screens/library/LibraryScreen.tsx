import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getResponsiveBorderRadius,
  getResponsiveShadow,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../../utils/responsive";
import BottomNavOverlay from "../../components/layout/BottomNavOverlay";
import Music from "../../categories/music";
import { useFastPerformance } from "../../utils/fastPerformance";
import { navigateMainTab } from "../../utils/navigation";
import AllLibrary from "./AllLibrary";
import PlaylistsLibrary from "./PlaylistsLibrary";

const categories = ["ALL", "SERMON", "MUSIC", "E-BOOKS", "VIDEO", "PLAYLISTS"];

export default function LibraryScreen() {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("Library");
  const { fastPress } = useFastPerformance();
  const scrollViewRef = useRef<ScrollView>(null);
  const buttonLayouts = useRef<{ [key: string]: { x: number; width: number } }>(
    {}
  );

  useEffect(() => {
    if (selectedCategory && scrollViewRef.current) {
      setTimeout(() => {
        const selectedIndex = categories.indexOf(selectedCategory);
        if (selectedIndex !== -1 && scrollViewRef.current) {
          const scrollView = scrollViewRef.current;
          const screenWidth = Dimensions.get("window").width;
          const parentPadding = getResponsiveSpacing(16, 20, 24, 32);
          const scrollViewWidth = screenWidth - parentPadding * 2;

          if (buttonLayouts.current[selectedCategory]) {
            const buttonLayout = buttonLayouts.current[selectedCategory];
            const buttonCenter = buttonLayout.x + buttonLayout.width / 2;
            const viewportCenter = scrollViewWidth / 2;
            const scrollPosition = buttonCenter - viewportCenter;

            scrollView.scrollTo({
              x: Math.max(0, scrollPosition),
              animated: true,
            });
          } else {
            const buttonWidth = 100;
            const buttonMargin = getResponsiveSpacing(4, 6, 8, 10) * 2;
            let accumulatedWidth = 0;
            for (let i = 0; i < selectedIndex; i++) {
              accumulatedWidth += buttonWidth + buttonMargin;
            }
            const scrollPosition =
              accumulatedWidth -
              scrollViewWidth / 2 +
              buttonWidth / 2 -
              parentPadding;

            scrollView.scrollTo({
              x: Math.max(0, scrollPosition),
              animated: true,
            });
          }
        }
      }, 200);
    }
  }, [selectedCategory]);

  const handleCategoryPress = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const renderContent = () => {
    switch (selectedCategory) {
      case "ALL":
        return <AllLibrary contentType="ALL" />;
      case "SERMON":
        return <AllLibrary contentType="SERMON" />;
      case "MUSIC":
        return <Music />;
      case "E-BOOKS":
        return <AllLibrary contentType="E-BOOKS" />;
      case "VIDEO":
        return <AllLibrary contentType="VIDEO" />;
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

      {selectedCategory === "PLAYLISTS" ? (
        <View className="flex-1 mt-2">{renderContent()}</View>
      ) : (
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
