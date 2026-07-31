/**
 * Creator studio upload — intent → R2 PUT → finalize (artist lane only).
 */
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { useCreatorMe } from "../hooks/useCreatorMe";
import {
  CREATOR_UPLOAD_LIMITS,
  requireCreatorAuthToken,
  uploadCreatorTrack,
} from "../services/creators/uploadPipeline";

type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export default function CreatorUploadScreen() {
  const router = useRouter();
  const { data: me, refresh } = useCreatorMe();
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("gospel");
  const [category, setCategory] = useState("worship");
  const [publish, setPublish] = useState(true);
  const [audio, setAudio] = useState<PickedFile | null>(null);
  const [cover, setCover] = useState<PickedFile | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canUpload = me.capabilities.canUploadTracks;

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const size = asset.size ?? 0;
    if (size > CREATOR_UPLOAD_LIMITS.audioMaxBytes) {
      Alert.alert("File too large", "Audio must be 100MB or smaller.");
      return;
    }
    setAudio({
      uri: asset.uri,
      name: asset.name || "track.mp3",
      mimeType: asset.mimeType || "audio/mpeg",
      size: size || 1,
    });
  };

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

  const submit = async () => {
    if (!canUpload) {
      Alert.alert("Not approved yet", "Upload unlocks after your creator application is active.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Title required");
      return;
    }
    if (!audio) {
      Alert.alert("Pick an audio file");
      return;
    }

    setBusy(true);
    setPhase("Starting…");
    try {
      await requireCreatorAuthToken();
      const track = await uploadCreatorTrack({
        title: title.trim(),
        artistName: me.artist?.displayName,
        genre: genre.trim() || undefined,
        category: category.trim() || undefined,
        audio,
        cover,
        publish,
        onProgress: setPhase,
      });
      await refresh();
      const slug = track?.artistSlug || me.artist?.slug;
      Alert.alert(
        "Uploaded",
        publish
          ? "Your track is publishing to the Artists shelf (not Copyright-free)."
          : "Saved as draft in your studio.",
        [
          ...(slug && publish
            ? [
                {
                  text: "View profile",
                  onPress: () =>
                    router.replace({
                      pathname: "/artists/[slug]",
                      params: { slug },
                    }),
                },
              ]
            : []),
          {
            text: "Back to studio",
            onPress: () => router.replace("/creators"),
          },
        ]
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      Alert.alert("Upload failed", msg);
    } finally {
      setBusy(false);
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
        <Text style={{ fontSize: 17, fontWeight: "600" }}>Upload track</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {!canUpload ? (
          <View
            style={{
              backgroundColor: "#FFF8E7",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "#F5C542",
            }}
          >
            <Text style={{ color: "#8A6A00", fontWeight: "600" }}>
              Uploads locked
            </Text>
            <Text style={{ color: "#6B7280", marginTop: 6, lineHeight: 20 }}>
              {me.capabilities.statusMessage}
            </Text>
          </View>
        ) : null}

        <Text style={{ fontWeight: "600", marginBottom: 8, color: "#374151" }}>
          Title *
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Still Waters"
          placeholderTextColor="#9CA3AF"
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
          placeholder="gospel"
          placeholderTextColor="#9CA3AF"
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
          placeholder="worship"
          placeholderTextColor="#9CA3AF"
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
          onPress={pickAudio}
          disabled={busy}
          style={{
            borderWidth: 1,
            borderColor: "#0A332D",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            backgroundColor: "#F0F7F5",
          }}
        >
          <Text style={{ fontWeight: "600", color: "#0A332D" }}>
            {audio ? `Audio: ${audio.name}` : "Pick audio (max 100MB)"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickCover}
          disabled={busy}
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontWeight: "600", color: "#374151" }}>
            {cover ? `Cover: ${cover.name}` : "Pick cover (optional, max 5MB)"}
          </Text>
          {cover ? (
            <Image
              source={{ uri: cover.uri }}
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
            Publish to Artists shelf
          </Text>
          <Switch value={publish} onValueChange={setPublish} />
        </View>
        <Text style={{ color: "#9CA3AF", fontSize: 12, marginBottom: 20 }}>
          Published tracks appear under Music → Artists only — never on
          Copyright-free.
        </Text>

        <TouchableOpacity
          onPress={submit}
          disabled={busy || !canUpload}
          style={{
            backgroundColor: "#0A332D",
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
            opacity: busy || !canUpload ? 0.6 : 1,
          }}
        >
          {busy ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600" }}>
                {phase || "Uploading…"}
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              Upload
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
