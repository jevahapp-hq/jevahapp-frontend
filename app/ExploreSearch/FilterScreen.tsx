import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthHeader from "../components/AuthHeader";

const creators = [
  "Dunsin Oyekan",
  "Joseph Elijah",
  "The Elevation Church",
  "The Harvesters",
  "The Faith Family",
  "Pastor Godman Akinlabi",
  "House on the Rock",
  "Nathaniel Bassey",
  "MFM",
  "RCCG",
];

const pastSearchesInitial = [
  "Miracles",
  "Spiritual growth",
  "Mega worship",
  "Soaking worship",
  "Love and Light",
];

export default function FilterScreen() {
  const [selectedCreators, setSelectedCreators] = React.useState<string[]>([]);

  const [query, setQuery] = useState("");
  const [pastSearches, setPastSearches] = useState(pastSearchesInitial);

  const toggleCreator = (name: string) => {
    if (selectedCreators.includes(name)) {
      setSelectedCreators(selectedCreators.filter((c) => c !== name));
    } else {
      setSelectedCreators([...selectedCreators, name]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <AuthHeader title="Search and Filter" />

      {/* Main Scrollable Content */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        className="px-4 bg-[#FCFCFD]"
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View className="flex flex-row items-center mt-3 w-full">
          <View className="flex-row items-center px-2 bg-gray-100 w-[308px] rounded-xl h-[42px] mb-3 flex-1">
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

          <Text className="text-[#3B3B3B] font-rubik-bold ml-3 mb-2">
            clear
          </Text>
        </View>

        {/* Sections */}
        {[
          {
            title: "Content type",
            options: [
              "Devotionals",
              "Videos",
              "Music",
              "Sermons",
              "Books",
              "Podcasts",
            ],
          },
          {
            title: "Category",
            options: [
              "Worship",
              "Inspiration",
              "Youth",
              "Teachings",
              "Marriage",
              "Counselling",
            ],
          },
          {
            title: "Date published",
            options: ["Most recent", "Trending", "Specific date range."],
          },
          {
            title: "Topics",
            options: [
              "Faith",
              "Healing",
              "Grace",
              "Prayer",
              "Maturity",
              "Spiritual growth",
            ],
          },
          { title: "Duration", options: ["short", "Medium", "Long"] },
        ].map((section, index) => (
          <View key={index} className="mt-6">
            <Text className="font-rubik-semibold text-[#1D2939] mb-2">
              {section.title}
            </Text>
            <View className="flex-row flex-wrap gap-2 ">
              {section.options.map((option, idx) => (
                <TouchableOpacity
                  key={idx}
                  className="border border-gray-400  px-3 py-1 h-[38px] rounded-[10px] "
                >
                  <Text className="mt-1 font-rubik text-[12px]">{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Creator (Scrollable) */}
        <View className="mt-6">
          <Text className="font-rubik-semibold text-[#1D2939] mb-2">
            Creator
          </Text>

          {/* Scrollable area with gesture support */}
          <ScrollView
            className="h-56 "
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true} // Enable gesture propagation on Android
          >
            {creators.map((item) => {
              const isSelected = selectedCreators.includes(item);
              return (
                <TouchableOpacity
                  key={item}
                  className="flex-row items-center py-2"
                  onPress={() => toggleCreator(item)}
                >
                  <View
                    className={`w-[24px] h-[24px] mr-3 items-center justify-center border rounded-[5px] ${
                      isSelected
                        ? "border-[#256E63] bg-[#256E63]"
                        : "border-gray-400"
                    }`}
                  >
                    {isSelected && (
                      <Text className="text-white text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="font-rubik text-[#1D2939]">{item}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Footer Buttons (fixed) */}
      <View className="absolute bottom-0 mb-16 left-0 right-0 bg-white px-4 py-3 border-t border-gray-200 flex-row justify-between">
        <TouchableOpacity className="flex-1 mr-2 border border-gray-400 rounded-full py-3 items-center">
          <Text>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 ml-2 bg-black rounded-full py-3 items-center">
          <Text className="text-white font-semibold">Apply</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
