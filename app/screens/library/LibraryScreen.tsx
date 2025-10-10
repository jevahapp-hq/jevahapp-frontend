//

// CommunityScreen.tsx
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNavOverlay from "../../components/layout/BottomNavOverlay";
import { navigateMainTab } from "../../utils/navigation";

import { Ionicons } from "@expo/vector-icons";
import AllLibrary from "./AllLibrary";

const categories = ["ALL", "LIVE", "SERMON", "MUSIC", "E-BOOKS", "VIDEO"];

export default function LibraryScreen() {
  const [selectedCategoryA, setSelectedCategorA] = useState("ALL");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("Library");
  const router = useRouter();

  const renderContent = () => {
    switch (selectedCategoryA) {
      case "ALL":
        return <AllLibrary contentType="ALL" />;
      case "LIVE":
        return <AllLibrary contentType="LIVE" />;
      case "SERMON":
        return <AllLibrary contentType="SERMON" />;
      case "MUSIC":
        return <AllLibrary contentType="MUSIC" />;
      case "E-BOOKS":
        return <AllLibrary contentType="E-BOOKS" />;
      case "VIDEO":
        return <AllLibrary contentType="VIDEO" />;
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
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                marginHorizontal: 4,
                borderRadius: 10,
                backgroundColor:
                  selectedCategoryA === category ? "black" : "white",
                borderWidth: selectedCategoryA === category ? 0 : 1,
                borderColor:
                  selectedCategoryA === category ? "transparent" : "#6B6E7C",
                minWidth: 48,
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: selectedCategoryA === category ? "white" : "#1D2939",
                  fontFamily: "Rubik_600SemiBold",
                  fontSize: 14,
                }}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="flex-1 mb-24">{renderContent()}</View>
      </ScrollView>
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
