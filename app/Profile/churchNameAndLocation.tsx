import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ✅ CORRECT
import axios from "axios";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthHeader from "../components/AuthHeader";
import ProgressBar from "../components/ProgressBar";
import { environmentManager } from "../utils/environmentManager";

type Suggestion = {
  id: string;
  name: string;
  type: "church" | "location";
};

function ChurchNameAndLocation() {
  const [search, setSearch] = useState("");
  const API_BASE_URL = environmentManager.getCurrentUrl();
  const [churches, setChurches] = useState<Suggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>(
    []
  );
  const [selectedItem, setSelectedItem] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Debug log for filtered suggestions
  useEffect(() => {
    console.log("Filtered suggestions updated:", filteredSuggestions.length, filteredSuggestions);
  }, [filteredSuggestions]);

  useEffect(() => {
    const fetchLocationAndChurches = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Permission denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        setCoords({ lat, lng });

        // Get nearby churches using Mapbox reverse geocoding first
        try {
          const reverseGeoRes = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=pk.eyJ1IjoiamV2YWgtYXBwIiwiYSI6ImNtZXVienJlcjA1ZmMybXIweWY4Zmp4eXQifQ.N5dmx2NazRcN83YhhoXa4w&types=place&limit=1`
          );
          const reverseGeoData = await reverseGeoRes.json();
        } catch (error) {
          console.warn("Mapbox reverse geocoding failed:", error);
        }

        try {
          console.log("🌐 Fetching churches from:", `${API_BASE_URL}/api/churches?lat=${lat}&lng=${lng}`);
          const res = await fetch(
            `${API_BASE_URL}/api/churches?lat=${lat}&lng=${lng}`
          );
          
          if (!res.ok) {
            console.error("Church API error:", res.status, res.statusText);
            return;
          }
          
          const data = await res.json();

          const churchSuggestions = data.map((church: any) => ({
            id: church.id,
            name: church.name,
            type: "church" as const,
          }));

          setChurches(churchSuggestions);
        } catch (error) {
          console.error("Error fetching churches:", error);
        }
      } catch (error) {
        console.error("Error in fetchLocationAndChurches:", error);
      }
    };

    fetchLocationAndChurches();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const fetchSuggestions = async () => {
        if (search.trim().length === 0) {
          setFilteredSuggestions([]);
          return;
        }

        try {
          // Mapbox Geocoding API for location search
          const proximity = coords
            ? `&proximity=${coords.lng},${coords.lat}&autocomplete=true`
            : "";
          
          console.log("🌐 Fetching location suggestions for:", search);
          const locRes = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
              search
            )}.json?access_token=pk.eyJ1IjoiamV2YWgtYXBwIiwiYSI6ImNtZXVienJlcjA1ZmMybXIweWY4Zmp4eXQifQ.N5dmx2NazRcN83YhhoXa4w&types=place,address,poi&limit=10${proximity}`
          );

          if (!locRes.ok) {
            console.error("Mapbox API error:", locRes.status, locRes.statusText);
            return;
          }

          const locData = await locRes.json();

          if (!locData.features || !Array.isArray(locData.features)) {
            console.error("No features returned:", locData);
            return;
          }

          const locationSuggestions: Suggestion[] = locData.features.map(
            (feature: any) => ({
              id: feature.id,
              name: feature.place_name,
              type: "location",
            })
          );

          console.log("Setting suggestions:", locationSuggestions);
          setFilteredSuggestions(locationSuggestions);
        } catch (err) {
          console.error("Error fetching suggestions:", err);
          setFilteredSuggestions([]);
        }
      };

      fetchSuggestions();
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  const selectSuggestion = async (item: Suggestion) => {
    setSearch(item.name);
    setSelectedItem(item);
    setFilteredSuggestions([]);

    if (item.type === "location") {
      try {
        // For Mapbox, we can get coordinates directly from the feature
        // We'll need to make another call to get the full feature details
        const geoRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            item.name
          )}.json?access_token=pk.eyJ1IjoiamV2YWgtYXBwIiwiYSI6ImNtZXVienJlcjA1ZmMybXIweWY4Zmp4eXQifQ.N5dmx2NazRcN83YhhoXa4w&types=place,address,poi&limit=1`
        );
        const geoData = await geoRes.json();
        
        if (geoData.features && geoData.features.length > 0) {
          const feature = geoData.features[0];
          const [lng, lat] = feature.center; // Mapbox returns [longitude, latitude]

          const res = await fetch(
            `${API_BASE_URL}/api/churches?lat=${lat}&lng=${lng}`
          );
          const churchData = await res.json();

          const churchSuggestions = churchData.map((church: any) => ({
            id: church.id,
            name: church.name,
            type: "church" as const,
          }));

          setChurches(churchSuggestions);
        }
      } catch (error) {
        console.error("Error processing location:", error);
      }
    }
  };

  const handleNext = async () => {
    if (!selectedItem?.name) {
      Alert.alert("Please select a valid church or location");
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      // Replace with your actual auth token logic

      // Create axios instance with timeout configuration
      const axiosInstance = axios.create({
        timeout: 15000, // 15 seconds timeout
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const response = await axiosInstance.post(
        `${API_BASE_URL}/api/auth/complete-profile`,
        {
          location: selectedItem.name,
        }
      );

      if (response.data.success) {
        router.push("/avatars/indexAvatar");
      } else {
        Alert.alert("Error", response.data.message || "An error occurred");
      }
    } catch (error: any) {
      // console.error("Location submission error:", error);
      
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="w-full items-center">

        <View className="px-4 mt-6">
        <AuthHeader title="Profile Setup" />
      </View>
         
            <ProgressBar currentStep={3} totalSteps={4} />
            <Text className="text-[#1D2939] font-semibold mt-3 ml-1">
              Let&apos;s make this feel like home
            </Text>
          </View>
      

        <View className="flex-1 w-full items-center mt-2 bg-[#FCFCFD]">
          <View className="flex-1 w-[333px]">
            <Text className="font-rubik-semibold text-[32px] text-[#1D2939]">
              What’s the name of your church?
            </Text>

            <View className="flex flex-row items-center justify-between h-[72px] w-full mt-5 border rounded-3xl bg-white px-4 mb-2">
              <TextInput
                className="flex-1 h-full text-base text-gray-800"
                placeholder="Search church or location"
                onChangeText={(text) => {
                  setSearch(text);
                  setSelectedItem(null);
                }}
                value={search}
                returnKeyType="search"
                numberOfLines={1}
                multiline={false}
                style={{ 
                  flex: 1, 
                  height: '100%',
                  fontSize: 16,
                  color: '#1F2937',
                  textAlignVertical: 'center'
                }}
              />
              <Ionicons name="search" size={32} color="#6B7280" />
            </View>

            <View className="flex-1 mt-2">
              <FlatList
                data={filteredSuggestions}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 200 }}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    onPress={() => selectSuggestion(item)}
                    className="bg-white border-b border-gray-200"
                  >
                    <Text 
                      className="p-3 text-gray-800"
                      numberOfLines={1}
                      style={{ fontSize: 16 }}
                    >
                      {item.name}
                      {item.type === "location" ? " (Location)" : ""}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  search.trim().length > 0 ? (
                    <Text className="text-center text-gray-500 mt-4">
                      No matches found
                    </Text>
                  ) : null
                }
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            </View>
          </View>
        </View>

        {selectedItem && (
          <View className="absolute left-0 right-0 bottom-6 items-center">
            <TouchableOpacity
              onPress={handleNext}
              className={`bg-[#090E24] rounded-full w-[333px] h-[48px] items-center justify-center ${
                loading ? "opacity-50" : ""
              }`}
              disabled={loading}
            >
              <Text className="text-white text-center text-base font-semibold">
                {loading ? "Submitting..." : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ChurchNameAndLocation;
