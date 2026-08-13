/**
 * Studio release wizard: cover → multi-track upload → reorder → publish.
 */
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import {
  deleteArtistRelease,
  getArtistRelease,
  patchArtistRelease,
  publishArtistRelease,
  reorderArtistReleaseTracks,
  typeHintMismatch,
  unlinkArtistReleaseTrack,
  uploadCreatorTrack,
  uploadReleaseCover,
  type ArtistRelease,
  type ReleaseType,
} from "../../services/creators";

type Picked = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export default function CreatorReleaseDetailScreen() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const releaseId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [release, setRelease] = useState<ArtistRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("");
  const [busy, setBusy] = useState(false);
  const [titleEdit, setTitleEdit] = useState("");

  const refresh = useCallback(async () => {
    if (!releaseId) return;
    setLoading(true);
    try {
      const r = await getArtistRelease(releaseId);
      setRelease(r);
      if (r) setTitleEdit(r.title);
    } catch {
      setRelease(null);
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isDraftish =
    release &&
    ["draft", "scheduled"].includes(String(release.status).toLowerCase());

  const pickCover = async () => {
    if (!releaseId) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const cover: Picked = {
      uri: a.uri,
      name: a.fileName || "cover.jpg",
      mimeType: a.mimeType || "image/jpeg",
      size: a.fileSize || 1,
    };
    setBusy(true);
    try {
      await uploadReleaseCover({
        releaseId,
        cover,
        onProgress: setPhase,
      });
      await refresh();
    } catch (e) {
      Alert.alert(
        "Cover failed",
        e instanceof Error ? e.message : "Try again"
      );
    } finally {
      setBusy(false);
      setPhase("");
    }
  };

  const addTrack = async () => {
    if (!releaseId || !release) return;
    const doc = await DocumentPicker.getDocumentAsync({
      type: ["audio/*", "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav"],
      copyToCacheDirectory: true,
    });
    if (doc.canceled || !doc.assets?.[0]) return;
    const file = doc.assets[0];
    const audio: Picked = {
      uri: file.uri,
      name: file.name || "track.mp3",
      mimeType: file.mimeType || "audio/mpeg",
      size: file.size || 1,
    };
    const nextNum = (release.tracks?.length || 0) + 1;
    setBusy(true);
    try {
      await uploadCreatorTrack({
        title: file.name?.replace(/\.[^.]+$/, "") || `Track ${nextNum}`,
        audio,
        publish: false,
        releaseId,
        trackNumber: nextNum,
        onProgress: setPhase,
      });
      await refresh();
    } catch (e) {
      Alert.alert(
        "Upload failed",
        e instanceof Error ? e.message : "Try again"
      );
    } finally {
      setBusy(false);
      setPhase("");
    }
  };

  const moveTrack = async (index: number, dir: -1 | 1) => {
    if (!releaseId || !release?.tracks) return;
    const ids = release.tracks.map((t) => t.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[index], next[j]] = [next[j], next[index]];
    setBusy(true);
    try {
      const updated = await reorderArtistReleaseTracks(releaseId, next);
      if (updated) setRelease(updated);
      else await refresh();
    } catch (e) {
      Alert.alert(
        "Reorder failed",
        e instanceof Error ? e.message : "Try again"
      );
    } finally {
      setBusy(false);
    }
  };

  const removeTrack = (trackId: string, title: string) => {
    if (!releaseId) return;
    Alert.alert("Remove from release?", `"${title}" stays in your library.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await unlinkArtistReleaseTrack(releaseId, trackId);
            await refresh();
          } catch (e) {
            Alert.alert(
              "Couldn’t unlink",
              e instanceof Error ? e.message : "Try again"
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const saveTitle = async () => {
    if (!releaseId || !titleEdit.trim()) return;
    setBusy(true);
    try {
      const updated = await patchArtistRelease(releaseId, {
        title: titleEdit.trim(),
      });
      if (updated) setRelease(updated);
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Try again");
    } finally {
      setBusy(false);
    }
  };

  const doPublish = async (skipTypeHints: boolean) => {
    if (!releaseId || !release) return;
    setBusy(true);
    try {
      const { release: published } = await publishArtistRelease(releaseId, {
        skipTypeHints,
      });
      setRelease(published);
      Alert.alert(
        published.status === "scheduled" ? "Scheduled" : "Published",
        published.status === "scheduled"
          ? "This release will go live at the scheduled time."
          : "Listeners can find it on your artist page."
      );
    } catch (e: any) {
      const code = e?.code || e?.data?.code;
      if (code === "TYPE_HINT_MISMATCH" || String(e?.message || "").includes("usually")) {
        Alert.alert(
          "Track count hint",
          e.message ||
            typeHintMismatch(release.type as ReleaseType, release.tracks?.length || 0) ||
            "Type doesn’t match track count.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Publish anyway",
              onPress: () => void doPublish(true),
            },
          ]
        );
      } else {
        Alert.alert(
          "Publish blocked",
          e instanceof Error ? e.message : "Fix tracks and try again"
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmPublish = () => {
    if (!release) return;
    const count = release.tracks?.length || 0;
    if (count < 1) {
      Alert.alert("Add tracks", "Publish needs at least one track.");
      return;
    }
    const hint = typeHintMismatch(release.type as ReleaseType, count);
    if (hint) {
      Alert.alert("Type hint", hint, [
        { text: "Cancel", style: "cancel" },
        { text: "Review", style: "cancel" },
        {
          text: "Publish anyway",
          onPress: () => void doPublish(true),
        },
        {
          text: "Publish",
          onPress: () => void doPublish(false),
        },
      ]);
      return;
    }
    Alert.alert("Publish release?", "Tracks must be ready and approved.", [
      { text: "Cancel", style: "cancel" },
      { text: "Publish", onPress: () => void doPublish(false) },
    ]);
  };

  const confirmDelete = () => {
    if (!releaseId) return;
    Alert.alert(
      "Delete release?",
      "Drafts are removed; published releases are archived.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteArtistRelease(releaseId);
              router.replace("/creators/releases");
            } catch (e) {
              Alert.alert(
                "Delete failed",
                e instanceof Error ? e.message : "Try again"
              );
            }
          },
        },
      ]
    );
  };

  if (!releaseId) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Missing release</Text>
      </SafeAreaView>
    );
  }

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
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "600", color: "#111" }}>
          Release
        </Text>
        {isDraftish ? (
          <TouchableOpacity onPress={confirmDelete} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={20} color="#B91C1C" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && !release ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color="#0A332D" />
        </View>
      ) : !release ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: "#6B7280" }}>Release not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <TouchableOpacity
            onPress={isDraftish ? pickCover : undefined}
            disabled={busy || !isDraftish}
            style={{ alignSelf: "center", marginBottom: 16 }}
          >
            {release.coverUrl ? (
              <Image
                source={{ uri: release.coverUrl }}
                style={{ width: 160, height: 160, borderRadius: 12 }}
              />
            ) : (
              <View
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 12,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="image-outline" size={36} color="#9CA3AF" />
                <Text style={{ color: "#6B7280", marginTop: 8, fontSize: 12 }}>
                  {release.type === "single"
                    ? "Add cover (or use track art)"
                    : "Add cover"}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text
            style={{
              textAlign: "center",
              color: "#6B7280",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {String(release.type).toUpperCase()} · {release.status}
            {release.slug ? ` · ${release.slug}` : ""}
          </Text>

          {isDraftish ? (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              <TextInput
                value={titleEdit}
                onChangeText={setTitleEdit}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: "#111",
                }}
              />
              <TouchableOpacity
                onPress={saveTitle}
                disabled={busy}
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontWeight: "600" }}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 20,
                color: "#111",
              }}
            >
              {release.title}
            </Text>
          )}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: "700", fontSize: 16, color: "#111" }}>
              Tracks ({release.tracks?.length || 0})
            </Text>
            {isDraftish ? (
              <TouchableOpacity
                onPress={addTrack}
                disabled={busy}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#0A332D",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
                  Add
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {(release.tracks || []).map((t, i) => (
            <View
              key={t.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
                gap: 8,
              }}
            >
              <Text style={{ width: 24, color: "#9CA3AF", fontWeight: "600" }}>
                {t.trackNumber ?? i + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: "#111" }}>{t.title}</Text>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>
                  {t.processingStatus || "track"}
                </Text>
              </View>
              {isDraftish ? (
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <TouchableOpacity
                    onPress={() => void moveTrack(i, -1)}
                    disabled={busy || i === 0}
                    style={{ padding: 6, opacity: i === 0 ? 0.3 : 1 }}
                  >
                    <Ionicons name="arrow-up" size={18} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void moveTrack(i, 1)}
                    disabled={busy || i === (release.tracks?.length || 0) - 1}
                    style={{
                      padding: 6,
                      opacity:
                        i === (release.tracks?.length || 0) - 1 ? 0.3 : 1,
                    }}
                  >
                    <Ionicons name="arrow-down" size={18} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeTrack(t.id, t.title)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#B91C1C" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))}

          {busy && phase ? (
            <View
              style={{
                marginTop: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <ActivityIndicator color="#0A332D" />
              <Text style={{ color: "#4B5563" }}>{phase}</Text>
            </View>
          ) : null}

          {isDraftish ? (
            <TouchableOpacity
              onPress={confirmPublish}
              disabled={busy}
              style={{
                marginTop: 28,
                backgroundColor: "#0A332D",
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: "center",
                opacity: busy ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                Publish
              </Text>
            </TouchableOpacity>
          ) : release.slug || release.id ? (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/music/releases/[idOrSlug]",
                  params: { idOrSlug: release.slug || release.id },
                })
              }
              style={{
                marginTop: 28,
                borderWidth: 1,
                borderColor: "#0A332D",
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#0A332D", fontWeight: "600" }}>
                View public page
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
