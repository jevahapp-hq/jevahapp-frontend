import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ✅ CORRECT
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
import { apiAxios } from "../utils/api";

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

  //   const handleNext = async () => {

  //     try {
  //       setLoading(true);

  //       const token = await AsyncStorage.getItem("token");
  //  // replace with real token retrieval

  //       const response = await axios.post(
  //         "http://192.168.43.62:4000/api/auth/complete-profile",
  //         {
  //           interests: selectedInterests,
  //         },
  //         {
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       );

  //       if (response.data.success) {
  //         router.push("/Profile/age-input");
  //       } else {
  //         Alert.alert("Error", response.data.message || "An error occurred");
  //       }
  //     } catch (error: any) {
  //       console.error("Profile update failed:", error);
  //       Alert.alert("Error", error.response?.data?.message || "Something went wrong");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  const handleNext = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      // 👇 Add this log before sending the request
      console.log("🚀 Sending interests:", selectedInterests);
      console.log("🌐 API Base URL:", apiAxios.defaults.baseURL);
      console.log("🔑 Token present:", !!token);

      const response = await apiAxios.post(
        `/api/auth/complete-profile`,
        {
          interests: selectedInterests,
        }
      );

      if (response.data.success) {
        router.push("/Profile/age-input");
      } else {
        Alert.alert("Error", response.data.message || "An error occurred");
      }
    } catch (error: any) {
      console.error("Profile update failed:", error);
      console.error("🌐 Full error details:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      });
      
      // Provide more specific error messages
      let errorMessage = "Something went wrong";
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please check your internet connection and try again.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
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
                      isSelected ? "bg-[#FEA74E]" : "border border-[#FEA74E]"
                    }`}
                  >
                    {isSelected && (
                      <MaterialIcons name="check" size={20} color="#FFFFFF" />
                    )}
                  </Pressable>

                  <TouchableOpacity 
                    onPress={() => toggleInterest(interest)}
                    className="flex-1 ml-3"
                  >
                    <Text className="text-[16px] font-bold text-[#1D2939]">
                      {interest}
                    </Text>
                  </TouchableOpacity>
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
