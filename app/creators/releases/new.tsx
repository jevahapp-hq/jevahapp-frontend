/**
 * Create release draft — then open studio wizard.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createArtistRelease,
  RELEASE_TYPE_HINTS,
  type ReleaseType,
} from "../../services/creators";

const TYPES: ReleaseType[] = ["single", "ep", "album", "mixtape"];

export default function NewReleaseScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReleaseType>("single");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const t = title.trim();
    if (!t) {
      Alert.alert("Title required", "Name your release.");
      return;
    }
    setBusy(true);
    try {
      const release = await createArtistRelease({
        title: t,
        type,
        description: description.trim() || undefined,
      });
      router.replace({
        pathname: "/creators/releases/[id]",
        params: { id: release.id },
      });
    } catch (e) {
      Alert.alert(
        "Couldn’t create release",
        e instanceof Error ? e.message : "Try again"
      );
    } finally {
      setBusy(false);
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 4, marginRight: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#111" }}>
          New release
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ fontWeight: "600", marginBottom: 8, color: "#111" }}>
          Title
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Release title"
          placeholderTextColor="#9CA3AF"
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 20,
            fontSize: 16,
            color: "#111",
          }}
        />

        <Text style={{ fontWeight: "600", marginBottom: 8, color: "#111" }}>
          Type
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: type === t ? "#0A332D" : "#F3F4F6",
              }}
            >
              <Text
                style={{
                  color: type === t ? "#fff" : "#374151",
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 20 }}>
          {RELEASE_TYPE_HINTS[type].label} — soft hint at publish
        </Text>

        <Text style={{ fontWeight: "600", marginBottom: 8, color: "#111" }}>
          Description (optional)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="About this release"
          placeholderTextColor="#9CA3AF"
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            marginBottom: 28,
            fontSize: 15,
            color: "#111",
            minHeight: 88,
            textAlignVertical: "top",
          }}
        />

        <TouchableOpacity
          onPress={submit}
          disabled={busy}
          style={{
            backgroundColor: "#0A332D",
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              Create draft
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
