import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AllContentTikTok as ModularAllContentTikTok } from "../../src/features/media/AllContentTikTok";
import type { ContentType } from "../../src/shared/types";
import {
  getResponsiveBorderRadius,
  getResponsiveShadow,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";
import Hymns from "./hymns";
import LiveComponent from "./LiveComponent";
import Music from "./music";

const categories = ["ALL", "SERMON", "MUSIC", "E-BOOKS", "VIDEO", "HYMNS", "LIVE"];

// Map category labels to the ContentType expected by AllContentTikTok
const mapCategoryToContentType = (
  category: string
): "ALL" | ContentType => {
  switch (category.toUpperCase()) {
    case "VIDEO":
      return "video";
    case "SERMON":
      return "sermon";
    case "E-BOOKS":
      return "e-books";
    case "HYMNS":
      return "hymns";
    case "LIVE":
      return "live";
    case "MUSIC":
      return "music";
    case "ALL":
    default:
      return "ALL";
  }
};

type Props = {
  contentType?: "ALL" | ContentType;
  useAuthFeed?: boolean;
};

export default function AllContentTikTokWrapper({
  contentType = "ALL",
  useAuthFeed = false,
}: Props) {
  // Derive the initial category label from the incoming contentType prop
  const getInitialCategory = () => {
    if (!contentType || contentType === "ALL") return "ALL";
    const entry = categories.find(
      (c) => mapCategoryToContentType(c) === contentType
    );
    return entry || "ALL";
  };

  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory);
  const scrollViewRef = useRef<ScrollView>(null);
  const buttonLayouts = useRef<{ [key: string]: { x: number; width: number } }>(
    {}
  );

  // Auto-scroll the active tab button into view
  useEffect(() => {
    if (selectedCategory && scrollViewRef.current) {
      setTimeout(() => {
        const selectedIndex = categories.indexOf(selectedCategory);
        if (selectedIndex !== -1 && scrollViewRef.current) {
          const screenWidth = Dimensions.get("window").width;
          const parentPadding = getResponsiveSpacing(16, 20, 24, 32);
          const scrollViewWidth = screenWidth - parentPadding * 2;
          if (buttonLayouts.current[selectedCategory]) {
            const { x, width } = buttonLayouts.current[selectedCategory];
            const scrollPosition = x + width / 2 - scrollViewWidth / 2;
            scrollViewRef.current.scrollTo({
              x: Math.max(0, scrollPosition),
              animated: true,
            });
          }
        }
      }, 200);
    }
  }, [selectedCategory]);

  const blinkAnim = useRef(new Animated.Value(1)).current;

  // Blinking animation for LIVE dot
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [blinkAnim]);

  const handleCategoryPress = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const renderContent = () => {
    if (selectedCategory === "MUSIC") return <Music />;
    if (selectedCategory === "HYMNS") return <Hymns />;
    if (selectedCategory === "LIVE") return <LiveComponent />;

    return (
      <ModularAllContentTikTok
        contentType={mapCategoryToContentType(selectedCategory)}
        useAuthFeed={useAuthFeed}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FCFCFD" }}>
      {/* Category tabs — same style as LibraryScreen */}
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
            paddingVertical: getResponsiveSpacing(8, 10, 12, 16),
            marginTop: 0,
          }}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => handleCategoryPress(category)}
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
                {category === "LIVE" && (
                  <Animated.View
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -2,
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: "red",
                      opacity: blinkAnim,
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content area */}
      <View style={{ flex: 1 }}>{renderContent()}</View>
    </View>
  );
}
