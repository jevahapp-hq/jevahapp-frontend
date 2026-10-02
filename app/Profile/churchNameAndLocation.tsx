import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthHeader from "../components/AuthHeader";
import ProgressBar from "../components/ProgressBar";
import { useUserProfile } from "../hooks/useUserProfile";
import type { SuggestSource } from "../hooks/useChurchSuggestions";
import { useChurchSuggestions } from "../hooks/useChurchSuggestions";
import { apiAxios } from "../utils/api";
import {
  churchesNearUser,
  churchProfileUpdate,
  isChurchPlaceName,
  manualChurchChoice,
  nearbyChurchBounds,
  type ChurchEntitySource,
} from "../utils/churchProfile";

type Suggestion = {
  id: string;
  name: string;
  type: "church" | "branch";
  source: SuggestSource | ChurchEntitySource;
  distanceMeters?: number;
  location?: { lat?: number; lng?: number } | null;
};

function ChurchNameAndLocation() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const editing = params.mode === "edit";
  const { user, updateUserProfile } = useUserProfile();
  const prefilled = useRef(false);
  const [search, setSearch] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>(
    []
  );
  const [selectedItem, setSelectedItem] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined);
  const [manualOverride, setManualOverride] = useState(false);
  const [mapSettledQuery, setMapSettledQuery] = useState("");

  useEffect(() => {
    const fetchLocation = async () => {
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
        const places = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        const code = places?.[0]?.isoCountryCode;
        if (code) setCountryCode(code);
      } catch (error) {
        console.error("Error getting location:", error);
      }
    };
    fetchLocation();
  }, []);

  const { items: suggestionItems, loading: suggestLoading } =
    useChurchSuggestions(search, {
      near: coords || undefined,
      countryCode,
      source: "combined",
      limit: 10,
    });

  useEffect(() => {
    if (manualOverride || search.trim().length < 2) {
      if (!manualOverride) setFilteredSuggestions([]);
      return;
    }
    const mapped: Suggestion[] = (suggestionItems || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      type: (r.type as "church" | "branch") || "church",
      source: (r.source as SuggestSource) || "internal",
      distanceMeters: r.distanceMeters,
      location: r.location,
    }));
    setFilteredSuggestions(churchesNearUser(mapped, coords));
  }, [suggestionItems, search, manualOverride, coords]);

  useEffect(() => {
    if (!editing || prefilled.current) return;
    const existing = String(user?.location || "").trim();
    if (!existing) return;
    prefilled.current = true;
    setSearch(existing);
  }, [editing, user?.location]);

  const typedName = search.trim();
  const nearbyBackend = churchesNearUser(suggestionItems || [], coords);
  const backendEmpty =
    typedName.length >= 2 && !suggestLoading && nearbyBackend.length === 0;

  // Map search stays inside the user's area. Add manually turns it off.
  useEffect(() => {
    if (manualOverride || !backendEmpty) return;
    if (!coords) {
      setMapSettledQuery(typedName);
      return;
    }
    let cancelled = false;
    const q = typedName;
    const bounds = nearbyChurchBounds(coords);
    const run = async () => {
      try {
        const box = `&bbox=${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`;
        const proximity = `&proximity=${coords.lng},${coords.lat}&autocomplete=true`;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            q
          )}.json?access_token=pk.eyJ1IjoiamV2YWgtYXBwIiwiYSI6ImNtZXVienJlcjA1ZmMybXIweWY4Zmp4eXQifQ.N5dmx2NazRcN83YhhoXa4w&types=poi&limit=8${proximity}${box}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!Array.isArray(data?.features) || cancelled) return;
        const mapboxItems = churchesNearUser(
          data.features
            .map((f: any) => ({
              id: String(f.id || ""),
              name: String(f.place_name || f.text || ""),
              type: "church" as const,
              source: "mapbox" as const,
              center: Array.isArray(f.center) ? f.center : null,
            }))
            .filter((item: { name: string }) => isChurchPlaceName(item.name)),
          coords
        );
        if (!cancelled && mapboxItems.length) {
          setFilteredSuggestions(mapboxItems);
        }
      } catch {
        // No nearby church. The checkbox turns on manual entry.
      } finally {
        if (!cancelled) setMapSettledQuery(q);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [manualOverride, backendEmpty, typedName, coords]);

  const selectSuggestion = async (item: Suggestion) => {
    setManualOverride(false);
    setSearch(item.name);
    setSelectedItem(item);
    setFilteredSuggestions([]);
  };

  const toggleManual = () => {
    setManualOverride((on) => {
      const next = !on;
      if (next) {
        const name = search.trim();
        setFilteredSuggestions([]);
        setSelectedItem(
          name.length >= 2
            ? { id: "", name, type: "church", source: "manual" }
            : null
        );
      } else {
        setSelectedItem(null);
      }
      return next;
    });
  };

  const choice = manualOverride
    ? manualChurchChoice(typedName)
    : selectedItem;
  const searchFinished =
    typedName.length >= 2 &&
    !manualOverride &&
    !suggestLoading &&
    (nearbyBackend.length > 0 || mapSettledQuery === typedName);
  const noChurchFound =
    searchFinished && filteredSuggestions.length === 0 && !selectedItem;

  const handleNext = async () => {
    const body = churchProfileUpdate(
      choice
        ? {
            name: choice.name,
            id: choice.id,
            type: choice.type,
            source: choice.source === "manual" ? "manual" : choice.source,
          }
        : null
    );
    if (!body) {
      Alert.alert("Enter your church", "Search for it, or tick Add manually and type the name.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiAxios.post("/api/auth/complete-profile", body);

      if (response.data.success) {
        updateUserProfile({ location: body.location });
        if (editing) router.back();
        else router.push("/avatars/indexAvatar");
      } else {
        Alert.alert("Error", response.data.message || "An error occurred");
      }
    } catch (error: any) {
      // console.error("Location submission error:", error);

      // Provide more specific error messages
      let errorMessage = "Something went wrong";
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        errorMessage =
          "Request timed out. Please check your internet connection and try again.";
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
            <AuthHeader title={editing ? "Edit church" : "Profile Setup"} />
          </View>

          {editing ? null : <ProgressBar currentStep={3} totalSteps={4} />}
          <Text className="text-[#1D2939] font-semibold mt-3 ml-1">
            {editing ? "Update your church" : "Let's make this feel like home"}
          </Text>
        </View>

        <View className="flex-1 w-full items-center mt-2 bg-[#FCFCFD]">
          <View className="flex-1 w-[333px]">
            <Text className="font-jakarta-semibold text-[32px] text-[#1D2939]">
              What’s the name of your church?
            </Text>

            <View className="flex flex-row items-center justify-between h-[72px] w-full mt-5 border rounded-3xl bg-white px-4 mb-2">
              <TextInput
                className="flex-1 h-full text-base text-gray-800"
                placeholder={
                  manualOverride ? "Type your church name" : "Search churches near you"
                }
                onChangeText={(text) => {
                  setSearch(text);
                  setMapSettledQuery("");
                  const next = text.trim();
                  if (manualOverride) {
                    setSelectedItem(
                      next.length >= 2
                        ? { id: "", name: next, type: "church", source: "manual" }
                        : null
                    );
                    return;
                  }
                  setSelectedItem(null);
                }}
                value={search}
                returnKeyType="search"
                numberOfLines={1}
                multiline={false}
                style={{
                  flex: 1,
                  height: "100%",
                  fontSize: 16,
                  color: "#1F2937",
                  textAlignVertical: "center",
                }}
              />
              <Ionicons name="search" size={32} color="#6B7280" />
            </View>

            <TouchableOpacity
              onPress={toggleManual}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: manualOverride }}
              className="flex-row items-center mt-3 mb-1"
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: "#090E24",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: manualOverride ? "#090E24" : "#FFFFFF",
                }}
              >
                {manualOverride ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : null}
              </View>
              <Text className="ml-3 text-[#1D2939] text-base">Add manually</Text>
            </TouchableOpacity>
            {manualOverride ? (
              <Text className="text-[#475467] mt-1 mb-1">
                Map search is off. Type the church name, then continue.
              </Text>
            ) : null}

            <View className="flex-1 mt-2">
              <FlatList
                data={manualOverride ? [] : filteredSuggestions}
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
                      {typeof item.distanceMeters === "number"
                        ? item.distanceMeters < 1000
                          ? ` · ${Math.round(item.distanceMeters)} m`
                          : ` · ${(item.distanceMeters / 1000).toFixed(1)} km`
                        : ""}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  noChurchFound ? (
                    <Text className="text-center text-[#1D2939] text-base font-semibold mt-6">
                      No church found
                    </Text>
                  ) : null
                }
                contentContainerStyle={{ paddingBottom: 100 }}
              />
            </View>
          </View>
        </View>

        {choice && typedName.length >= 2 ? (
          <View className="absolute left-0 right-0 bottom-6 items-center">
            <TouchableOpacity
              onPress={handleNext}
              className={`bg-[#090E24] rounded-full w-[333px] h-[48px] items-center justify-center ${
                loading ? "opacity-50" : ""
              }`}
              disabled={loading}
            >
              <Text className="text-white text-center text-base font-semibold">
                {loading ? "Saving..." : editing ? "Save" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ChurchNameAndLocation;
