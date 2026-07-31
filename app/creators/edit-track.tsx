/**
 * Edit track metadata + optional cover replace.
 * Route: /creators/edit-track?trackId=
 */
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { creatorsApi } from "../services/creators";
import {
  CREATOR_UPLOAD_LIMITS,
  patchCreatorTrack,
  replaceTrackCover,
} from "../services/creators/uploadPipeline";
import {
  isTrackProcessing,
  normalizeTrackCard,
  type TrackCard,
} from "../services/music-catalog/trackTypes";

type PickedCover = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export default function EditTrackScreen() {
  const router = useRouter();
  const { trackId: rawId } = useLocalSearchParams<{ trackId?: string }>();
  const trackId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [track, setTrack] = useState<TrackCard | null>(null);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [category, setCategory] = useState("");
  const [publish, setPublish] = useState(true);
  const [cover, setCover] = useState<PickedCover | null>(null);

  const load = useCallback(async () => {
    if (!trackId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await creatorsApi.getMyTracks({ limit: 100 });
      const found = (res.tracks || [])
        .map((t) => normalizeTrackCard(t, "artist"))
        .find((t) => t?.id === trackId);
      if (!found) {
        Alert.alert("Track not found", "It may have been deleted.", [
          { text: "OK", onPress: () => router.back() },
        ]);
        return;
      }
      setTrack(found);
      setTitle(found.title);
      setGenre(found.genre || "");
      setCategory(found.category || "");
      setPublish(String(found.visibility || "").toLowerCase() === "public");
    } finally {
      setLoading(false);
    }
  }, [trackId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access for covers.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const size = asset.fileSize ?? 0;
    if (size > CREATOR_UPLOAD_LIMITS.coverMaxBytes) {
      Alert.alert("Cover too large", "Cover must be 5MB or smaller.");
      return;
    }
    setCover({
      uri: asset.uri,
      name: asset.fileName || "cover.jpg",
      mimeType: asset.mimeType || "image/jpeg",
      size: size || 1,
    });
  };

  const save = async () => {
    if (!trackId || !title.trim()) {
      Alert.alert("Title required");
      return;
    }
    setSaving(true);
    setPhase("Saving…");
    try {
      await patchCreatorTrack(trackId, {
        title: title.trim(),
        genre: genre.trim() || undefined,
        category: category.trim() || undefined,
        visibility: publish ? "public" : "draft",
        publish,
      });
      if (cover) {
        await replaceTrackCover({
          trackId,
          cover,
          onProgress: setPhase,
        });
      }
      Alert.alert("Saved", "Track updated. Artists shelf only — never Copyright-free.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again");
    } finally {
      setSaving(false);
      setPhase(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "600" }}>Edit track</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color="#0A332D" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
          {track && isTrackProcessing(track) ? (
            <View
              style={{
                backgroundColor: "#FFF8E7",
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#F5C542",
              }}
            >
              <Text style={{ color: "#8A6A00", fontWeight: "600" }}>
                Processing…
              </Text>
              <Text style={{ color: "#6B7280", marginTop: 4, fontSize: 13 }}>
                Playback unlocks when encoding finishes. You can still edit
                metadata.
              </Text>
            </View>
          ) : null}

          <Text style={{ fontWeight: "600", marginBottom: 8, color: "#374151" }}>
            Title *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 16,
              color: "#111",
            }}
          />

          <Text style={{ fontWeight: "600", marginBottom: 8, color: "#374151" }}>
            Genre
          </Text>
          <TextInput
            value={genre}
            onChangeText={setGenre}
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 16,
              color: "#111",
            }}
          />

          <Text style={{ fontWeight: "600", marginBottom: 8, color: "#374151" }}>
            Category
          </Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 16,
              color: "#111",
            }}
          />

          <TouchableOpacity
            onPress={pickCover}
            disabled={saving}
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: "600", color: "#374151" }}>
              {cover ? `New cover: ${cover.name}` : "Replace cover (optional)"}
            </Text>
            {(cover || track?.thumbnailUrl) ? (
              <Image
                source={{ uri: cover?.uri || track?.thumbnailUrl }}
                style={{ width: 72, height: 72, borderRadius: 8, marginTop: 10 }}
              />
            ) : null}
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginVertical: 12,
            }}
          >
            <Text style={{ fontWeight: "600", color: "#374151" }}>
              Published on Artists shelf
            </Text>
            <Switch value={publish} onValueChange={setPublish} />
          </View>

          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={{
              backgroundColor: "#0A332D",
              borderRadius: 999,
              paddingVertical: 14,
              alignItems: "center",
              marginTop: 8,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  {phase || "Saving…"}
                </Text>
              </View>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                Save changes
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
