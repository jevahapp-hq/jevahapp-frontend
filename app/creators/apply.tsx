/**
 * Creator apply form — POST /api/creators/apply
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CreatorTypeChips } from "../components/creators/CreatorTypeChips";
import { creatorsApi } from "../services/creators";
import type { CreatorType } from "../services/creators/types";

export default function CreatorApplyScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [genresText, setGenresText] = useState("gospel");
  const [note, setNote] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [spotify, setSpotify] = useState("");
  const [types, setTypes] = useState<CreatorType[]>(["artist"]);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!displayName.trim()) {
      Alert.alert("Display name required", "Tell listeners how to find you.");
      return;
    }
    if (types.length === 0) {
      Alert.alert("Pick a type", "Select artist, minister, and/or podcaster.");
      return;
    }

    setSubmitting(true);
    try {
      const genres = genresText
        .split(",")
        .map((g) => g.trim().toLowerCase().replace(/\s+/g, "_"))
        .filter(Boolean);

      await creatorsApi.apply({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        genres,
        creatorTypes: types,
        socials: {
          ...(instagram.trim() ? { instagram: instagram.trim() } : {}),
          ...(youtube.trim() ? { youtube: youtube.trim() } : {}),
          ...(spotify.trim() ? { spotify: spotify.trim() } : {}),
        },
        applicationNote: note.trim() || undefined,
      });

      Alert.alert(
        "Application sent",
        "We’ll review your profile. You can track status in Creator hub.",
        [{ text: "OK", onPress: () => router.replace("/creators") }]
      );
    } catch (e) {
      Alert.alert(
        "Couldn’t submit",
        e instanceof Error ? e.message : "Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-1 mr-2">
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Apply</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-sm font-medium text-gray-700 mb-2">I am a…</Text>
          <CreatorTypeChips selected={types} onChange={setTypes} />

          <Text className="text-sm font-medium text-gray-700 mt-6 mb-2">
            Display name *
          </Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Grace Collective"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
          />

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Gospel worship from Lagos"
            placeholderTextColor="#9CA3AF"
            multiline
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[88px]"
            textAlignVertical="top"
          />

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
            Genres (comma-separated)
          </Text>
          <TextInput
            value={genresText}
            onChangeText={setGenresText}
            placeholder="gospel, afro_gospel"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            autoCapitalize="none"
          />

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
            Instagram
          </Text>
          <TextInput
            value={instagram}
            onChangeText={setInstagram}
            placeholder="@handle or URL"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            autoCapitalize="none"
          />

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">YouTube</Text>
          <TextInput
            value={youtube}
            onChangeText={setYoutube}
            placeholder="Channel URL"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            autoCapitalize="none"
          />

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">Spotify</Text>
          <TextInput
            value={spotify}
            onChangeText={setSpotify}
            placeholder="Artist URL"
            placeholderTextColor="#9CA3AF"
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
            autoCapitalize="none"
          />

          <Text className="text-sm font-medium text-gray-700 mt-4 mb-2">
            Note to reviewers
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="We lead youth worship…"
            placeholderTextColor="#9CA3AF"
            multiline
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 min-h-[72px]"
            textAlignVertical="top"
          />

          <TouchableOpacity
            onPress={submit}
            disabled={submitting}
            className="bg-[#0A332D] rounded-full py-3.5 items-center mt-8"
            activeOpacity={0.85}
            style={{ opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Submit application</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
