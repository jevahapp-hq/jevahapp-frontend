/**
 * Edit public creator profile — bio / avatar / genres.
 * Route: /creators/edit-profile
 */
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreatorMe } from "../hooks/useCreatorMe";
import { creatorsApi } from "../services/creators";
import {
  CREATOR_UPLOAD_LIMITS,
  uploadCreatorAvatar,
} from "../services/creators/uploadPipeline";

type PickedAvatar = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export default function EditCreatorProfileScreen() {
  const router = useRouter();
  const { data: me, refresh } = useCreatorMe();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [genresText, setGenresText] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [spotify, setSpotify] = useState("");
  const [avatar, setAvatar] = useState<PickedAvatar | null>(null);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(me.artist?.displayName || "");
    setBio(me.artist?.bio || "");
    setGenresText((me.artist?.genres || []).join(", "));
    const socials = me.artist?.socials || {};
    setInstagram(socials.instagram || "");
    setYoutube(socials.youtube || "");
    setSpotify(socials.spotify || "");
  }, [me.artist]);

  const canEdit = me.capabilities.canEditProfile || me.capabilities.canUploadTracks;

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const size = asset.fileSize ?? 0;
    if (size > CREATOR_UPLOAD_LIMITS.coverMaxBytes) {
      Alert.alert("Image too large", "Avatar must be 5MB or smaller.");
      return;
    }
    setAvatar({
      uri: asset.uri,
      name: asset.fileName || "avatar.jpg",
      mimeType: asset.mimeType || "image/jpeg",
      size: size || 1,
    });
  };

  const save = async () => {
    if (!canEdit) {
      Alert.alert("Not available", "Profile editing unlocks when your creator account is active.");
      return;
    }
    if (!displayName.trim()) {
      Alert.alert("Display name required");
      return;
    }
    setSaving(true);
    setPhase("Saving…");
    try {
      let avatarUrl: string | undefined;
      if (avatar) {
        avatarUrl = await uploadCreatorAvatar({
          file: avatar,
          onProgress: setPhase,
        });
      }
      setPhase("Updating profile…");
      await creatorsApi.updateMe({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        genres: genresText
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        avatarUrl,
        socials: {
          ...(instagram.trim() ? { instagram: instagram.trim() } : {}),
          ...(youtube.trim() ? { youtube: youtube.trim() } : {}),
          ...(spotify.trim() ? { spotify: spotify.trim() } : {}),
        },
      });
      await refresh();
      Alert.alert("Profile updated", undefined, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert(
        "Update failed",
        e instanceof Error
          ? e.message
          : "Backend may still need PATCH /api/creators/me and avatar-upload-intent."
      );
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
        <Text style={{ fontSize: 17, fontWeight: "600" }}>Edit profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <TouchableOpacity
          onPress={pickAvatar}
          style={{ alignItems: "center", marginBottom: 20 }}
        >
          {avatar || me.artist?.avatarUrl ? (
            <Image
              source={{ uri: avatar?.uri || me.artist?.avatarUrl }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
            />
          ) : (
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: "#E5E7EB",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="camera" size={28} color="#9CA3AF" />
            </View>
          )}
          <Text style={{ marginTop: 8, color: "#0A332D", fontWeight: "600" }}>
            Change avatar
          </Text>
        </TouchableOpacity>

        <Text style={{ fontWeight: "600", marginBottom: 8, color: "#374151" }}>
          Display name *
        </Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
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
          Bio
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 16,
            minHeight: 96,
            textAlignVertical: "top",
            color: "#111",
          }}
        />

        <Text style={{ fontWeight: "600", marginBottom: 8, color: "#374151" }}>
          Genres (comma-separated)
        </Text>
        <TextInput
          value={genresText}
          onChangeText={setGenresText}
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
          Instagram
        </Text>
        <TextInput
          value={instagram}
          onChangeText={setInstagram}
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
          YouTube
        </Text>
        <TextInput
          value={youtube}
          onChangeText={setYoutube}
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
          Spotify
        </Text>
        <TextInput
          value={spotify}
          onChangeText={setSpotify}
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 20,
            color: "#111",
          }}
        />

        <TouchableOpacity
          onPress={save}
          disabled={saving || !canEdit}
          style={{
            backgroundColor: "#0A332D",
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
            opacity: saving || !canEdit ? 0.6 : 1,
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
              Save profile
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
