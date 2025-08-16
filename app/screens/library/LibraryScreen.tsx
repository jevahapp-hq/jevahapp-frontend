// 



// CommunityScreen.tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import BottomNav from "../../components/BottomNav";


import { Ionicons } from "@expo/vector-icons";
import AllLibrary from "./AllLibrary";
import EbooksLibrary from "./EbooksLibrary";
import LiveLibrary from "./LiveLibrary";
import MusicLibrary from "./MusicLibrary";
import SermonLibrary from "./SermonLibrary";
import VideoLibrary from "./VideoLibrary";


const categories = ["ALL", "LIVE", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];

export default function LibraryScreen() {
  const [selectedCategoryA, setSelectedCategorA] = useState("ALL");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("Library");
  const router = useRouter();

  const renderContent = () => {
    switch (selectedCategoryA) {
      case "ALL":
        return <AllLibrary />;
      case "LIVE":
        return <LiveLibrary />;
      case "SERMON":
        return <SermonLibrary />;
      case "MUSIC":
        return <MusicLibrary />;
      case "E-BOOKS":
        return <EbooksLibrary />;
      case "VIDEO":
        return <VideoLibrary />;
      default:
        return null;
    }
  };

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
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => setSelectedCategorA(category)}
            className={`px-3 py-1.5 mx-1 rounded-[10px] ${
              selectedCategoryA === category
                ? "bg-black"
                : "bg-white border border-[#6B6E7C]"
            }`}
          >
            <Text
              className={`${
                selectedCategoryA === category
                  ? "text-white"
                  : "text-[#1D2939]"
              } font-rubik`}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

     <View className="flex-1 mb-24">{renderContent()}</View>
 
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
