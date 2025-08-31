import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AuthHeader from "../components/AuthHeader";
import ProgressBar from "../components/ProgressBar";
import { API_BASE_URL } from "../utils/api";

export default function ProfileSetUp() {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => backHandler.remove();
    }, [])
  );

  const handleNext = async () => {
    try {
      setLoading(true);

      // Try to get token from both possible keys
      let token = await AsyncStorage.getItem("userToken");
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }

      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      console.log("🚀 Sending interests:", selectedInterests);
      console.log("🔗 API URL:", API_BASE_URL);

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/complete-profile`,
        {
          interests: selectedInterests,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log("✅ Profile update response:", response.data);

      if (response.data.success) {
        router.push("/Profile/age-input");
      } else {
        Alert.alert("Error", response.data.message || "An error occurred");
      }
    } catch (error: any) {
      console.error("Profile update failed:", error);
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        Alert.alert(
          "Connection Timeout",
          "The request took too long to complete. Please check your internet connection and try again."
        );
      } else if (error.response?.status === 401) {
        Alert.alert(
          "Authentication Error",
          "Your session has expired. Please login again."
        );
      } else {
        Alert.alert(
          "Error",
          error.response?.data?.message || "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };



  const interests = [
    "Gospel playlists",
    "Sermons",
    "Community",
    "Prayer wall & pray for me",
    "Connect with my church members",
    "Kids games",
    "Bible stories for Kids",
    "Christian books",
    "Animated christian videos",
  ];

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };



  return (
    <View className="flex-1 bg-[#FCFCFD]">

<View className="px-4 mt-6">
        <AuthHeader title="Profile Setup" />
      </View>
     
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex flex-col justify-center items-center px-4 py-5 w-full">
          <View className="flex flex-col w-[333px]">
            <ProgressBar currentStep={0} totalSteps={7} />
            <Text className="text-[#1D2939] font-semibold mt-3">
              Let&apos;s make this feel like home
            </Text>
          </View>

          <View className="flex flex-col justify-center items-center w-full mt-4">
            <Text className="font-rubik-semibold text-[32px] text-[#1D2939] text-center">
              What are you most interested in?
            </Text>
            {interests.map((interest, index) => {
              const isSelected = selectedInterests.includes(interest);

              return (
                <View
                  key={index}
                  className="flex flex-row rounded-[15px] w-[333px] h-[56px] items-center justify-start border border-[#CECFD3] mb-3"
                >
                  <Pressable
                    onPress={() => toggleInterest(interest)}
                    className={`w-[24px] h-[24px] rounded-[9px] ml-3 items-center justify-center ${
                      isSelected ? "bg-[#6663FD]" : "border border-[#C2C1FE]"
                    }`}
                  >
                    {isSelected && (
                      <MaterialIcons name="check" size={20} color="#FFFFFF" />
                    )}
                  </Pressable>

                  <Text className="text-[16px] font-bold ml-3 text-[#1D2939]">
                    {interest}
                  </Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={handleNext}
            className={`bg-[#090E24] p-2 rounded-full mt-6 mb-8 w-[333px] h-[45px] ${
              selectedInterests.length === 0 || loading ? "opacity-50" : ""
            }`}
            disabled={selectedInterests.length === 0 || loading}
          >
            <Text className="text-white text-center text-base">
              {loading ? "Submitting..." : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
