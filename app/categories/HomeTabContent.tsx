import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { useLocalSearchParams } from "expo-router";
import {
  getResponsiveBorderRadius,
  getResponsiveShadow,
  getResponsiveSpacing,
  getResponsiveTextStyle
} from "../../utils/responsive";
import Header from "../components/Header";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useMediaStore } from "../store/useUploadStore";
import AllContent from "./Allcontent";
import EbookComponent from "./EbookComponent";
import LiveComponent from "./LiveComponent";
import Music from "./music";
import SermonComponent from "./SermonComponent";
import VideoComponent from "./VideoComponent";

const categories = ["ALL", "LIVE", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];

export default function HomeTabContent() {
  const { defaultCategory } = useLocalSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(
    (defaultCategory as string) || "ALL"
  );

  const renderContent = () => {
    switch (selectedCategory) {
      case "ALL":
        return <AllContent />;
      case "LIVE":
        return <LiveComponent />;
      case "SERMON":
        return <SermonComponent />;
      case "MUSIC":
        return <Music />;

      //
      case "E-BOOKS":
        return <EbookComponent />;
      case "VIDEO":
        return <VideoComponent />;
      default:
        return null;
    }

    // switch (selectedCategory) {
    //   case "ALL":
    //     return <FilteredMediaList tag="All" />;
    //   case "LIVE":
    //     return <FilteredMediaList tag="Live" />;
    //   case "SERMON":
    //     return <FilteredMediaList tag="Sermons" />;
    //   case "MUSIC":
    //     return <FilteredMediaList tag="Music" />;
    //   case "E-BOOKS":
    //     return <FilteredMediaList tag="Books" />;
    //   case "VIDEO":
    //     return <FilteredMediaList tag="Videos" />;
    //   default:
    //     return null;
    // }
  };


  // const renderContent = () => {
   
  // };


  return (
    <View style={{ flex: 1, width: '100%' }}>
      <Header />
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#FCFCFD' }}
      >
        {/* Category Buttons with Padding */}
        <View style={{ paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32) }}>
          <ScrollView
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
                onPress={() => {
                  // Stop any active audio and pause all videos when switching categories
                  try {
                    useMediaStore.getState().stopAudioFn?.();
                  } catch (e) {
                    // no-op
                  }
                  try {
                    useGlobalVideoStore.getState().pauseAllVideos();
                  } catch (e) {
                    // no-op
                  }
                  setSelectedCategory(category);
                }}
                style={{
                  paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                  paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                  marginHorizontal: getResponsiveSpacing(4, 6, 8, 10),
                  borderRadius: getResponsiveBorderRadius('medium'),
                  backgroundColor: selectedCategory === category ? 'black' : 'white',
                  borderWidth: selectedCategory === category ? 0 : 1,
                  borderColor: selectedCategory === category ? 'transparent' : '#6B6E7C',
                  ...getResponsiveShadow(),
                }}
              >
                <View style={{ position: 'relative' }}>
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    {
                      color: selectedCategory === category ? 'white' : '#1D2939',
                    }
                  ]}>
                    {category}
                  </Text>
                  {category === "LIVE" && (
                    <View
                      style={{
                        position: "absolute",
                        top: -getResponsiveSpacing(4, 6, 8, 10),
                        right: getResponsiveSpacing(4, 6, 8, 10),
                        width: getResponsiveSpacing(4, 5, 6, 7),
                        height: getResponsiveSpacing(4, 5, 6, 7),
                        borderRadius: getResponsiveSpacing(2, 3, 4, 5),
                        backgroundColor: "red",
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* Content without Padding */}
        <View style={{ flex: 1, width: '100%', paddingBottom: 100 }}>
          {renderContent()}
        </View>
      </ScrollView>
    </View>
  );
}
