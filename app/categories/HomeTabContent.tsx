import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { useLocalSearchParams } from "expo-router";
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
    <View style={{ flex: 1 }} className="w-full">
    <Header />
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="bg-[#98a2b318]"
    >
      {/* Category Buttons with Padding */}
      <View className="px-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="py-3 mt-6 "
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
              className={`px-3 py-1.5 mx-1 rounded-[10px] ${
                selectedCategory === category
                  ? "bg-black"
                  : "bg-white border border-[#6B6E7C]"
              }`}
            >
              <View className="relative">
                <Text
                  className={`font-rubik ${
                    selectedCategory === category
                      ? "text-white"
                      : "text-[#1D2939]"
                  }`}
                >
                  {category}
                </Text>
                {category === "LIVE" && (
                  <View
                    style={{
                      position: "absolute",
                      top: -2,
                      right: 2,
                      width: 5,
                      height: 5,
                      borderRadius: 4,
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
      <View className="flex-1 w-full" style={{ paddingBottom: 100 }}>
        {renderContent()}
      </View>
    </ScrollView>
  </View>
  );
}
