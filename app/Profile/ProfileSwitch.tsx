import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Lock, Pencil } from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AuthHeader from "../components/AuthHeader";

const ProfileSwitch = () => {
  const router = useRouter();
  const [selected, setSelected] = useState<"ADULTS" | "KIDS">("ADULTS");

  const profiles = [
    {
      key: "ADULTS",
      image: require("../../assets/images/image (4).png"), // Replace with your actual path
      label: "ADULTS",
    },
    {
      key: "KIDS",
      image: require("../../assets/images/Asset 37 (2).png"), // Replace with your actual path
      label: "KIDS",
    },
  ];

  const handleAccountPress = () => {
    router.push("/screens/AccountScreen");
  };

  return (
    <ScrollView className="flex-1 bg-[#FCFCFD] px-6 pt-">
      {/* Header */}
      <AuthHeader title="Profile Switch" />

      {/* Account Button */}
      <TouchableOpacity
        onPress={handleAccountPress}
        className="flex-row items-center justify-center bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100"
      >
        <Ionicons name="person-outline" size={24} color="#256E63" />
        <Text className="text-base font-semibold text-gray-900 ml-3">
          Account & Profile Settings
        </Text>
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#9CA3AF"
          style={{ marginLeft: "auto" }}
        />
      </TouchableOpacity>

      {/* Title */}
      <Text className="text-xl font-bold text-center text-gray-900 mb-6">
        Choose your section
      </Text>

      {/* Profiles */}
      <View className="flex-row justify-between">
        {profiles.map((profile) => (
          <Pressable
            key={profile.key}
            onPress={() => {
              setSelected(profile.key as "ADULTS" | "KIDS");
              // Navigate to home when adult profile is selected
              if (profile.key === "ADULTS") {
                router.replace("/categories/HomeScreen");
              }
            }}
            className={`items-center rounded-xl p-4 w-[48%] ${
              selected === profile.key ? "border-2 border-indigo-500" : ""
            }`}
          >
            <Image
              source={profile.image}
              className="w-24 h-24 rounded-full"
              resizeMode="cover"
            />
            <Text className="text-sm font-semibold mt-2 text-gray-800">
              {profile.label}
            </Text>
            <Text className="text-xs text-gray-400">Name your profile</Text>
            <View className="flex-row space-x-2 mt-2">
              <View className="bg-gray-100 p-2 rounded-full">
                <Lock size={14} />
              </View>
              <View className="bg-gray-100 p-2 rounded-full">
                <Pencil size={14} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Learn more */}
      <Pressable className="mt-16 border border-black py-3 rounded-full items-center">
        <Text className="text-base font-semibold text-black">Learn more</Text>
      </Pressable>
    </ScrollView>
  );
};

export default ProfileSwitch;
