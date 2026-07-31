/**
 * Creator hub — capabilities.nextStep + studio track list (draft/public/processing).
 */
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreatorMe } from "../hooks/useCreatorMe";
import { creatorsApi } from "../services/creators";
import {
  deleteCreatorTrack,
  patchCreatorTrack,
} from "../services/creators/uploadPipeline";
import {
  isTrackProcessing,
  normalizeTrackCard,
  type TrackCard,
} from "../services/music-catalog/trackTypes";

function statusLabel(track: TrackCard): string {
  if (isTrackProcessing(track)) {
    return track.processingStatus || "processing";
  }
  const vis = String(track.visibility || "").toLowerCase();
  if (vis === "draft" || vis === "unlisted") return vis;
  if (vis === "public") return "public";
  return vis || "track";
}

export default function CreatorHubScreen() {
  const router = useRouter();
  const { data: me, loading, refresh } = useCreatorMe();
  const step = me.capabilities.nextStep;
  const [tracks, setTracks] = useState<TrackCard[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadTracks = useCallback(async () => {
    if (
      step !== "upload_first_track" &&
      step !== "manage_catalog" &&
      !me.capabilities.canUploadTracks
    ) {
      setTracks([]);
      return;
    }
    setTracksLoading(true);
    try {
      const res = await creatorsApi.getMyTracks({ limit: 50 });
      const list = (res.tracks || [])
        .map((t) => normalizeTrackCard(t, "artist"))
        .filter((t): t is TrackCard => !!t);
      setTracks(list);
    } catch {
      setTracks([]);
    } finally {
      setTracksLoading(false);
    }
  }, [step, me.capabilities.canUploadTracks]);

  useFocusEffect(
    useCallback(() => {
      void loadTracks();
    }, [loadTracks])
  );

  const onRefresh = async () => {
    await refresh();
    await loadTracks();
  };

  const openPublicProfile = () => {
    const slug =
      me.artist?.slug ||
      me.capabilities.publicProfilePath?.split("/").filter(Boolean).pop();
    if (!slug) return;
    router.push({
      pathname: "/artists/[slug]",
      params: { slug },
    });
  };

  const togglePublish = (track: TrackCard) => {
    const isPublic = String(track.visibility || "").toLowerCase() === "public";
    Alert.alert(
      isPublic ? "Unpublish track?" : "Publish to Artists shelf?",
      isPublic
        ? "Listeners will no longer see this on Music → Artists."
        : "This appears under Music → Artists only — never Copyright-free.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isPublic ? "Unpublish" : "Publish",
          onPress: async () => {
            setActionId(track.id);
            try {
              await patchCreatorTrack(track.id, {
                visibility: isPublic ? "draft" : "public",
                publish: !isPublic,
              });
              await loadTracks();
            } catch (e) {
              Alert.alert(
                "Update failed",
                e instanceof Error ? e.message : "Try again"
              );
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const confirmDelete = (track: TrackCard) => {
    Alert.alert("Delete track?", `"${track.title}" will be removed from your studio.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setActionId(track.id);
          try {
            await deleteCreatorTrack(track.id);
            await loadTracks();
            await refresh();
          } catch (e) {
            Alert.alert(
              "Delete failed",
              e instanceof Error ? e.message : "Try again"
            );
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
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
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#111" }}>
          Creator hub
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={loading || tracksLoading} onRefresh={onRefresh} />
        }
      >
        {loading && !me.artist ? (
          <View style={{ paddingVertical: 64, alignItems: "center" }}>
            <ActivityIndicator color="#0A332D" />
          </View>
        ) : null}

        {step === "apply" ? (
          <View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#111", marginBottom: 8 }}>
              Share your music on Jevah
            </Text>
            <Text style={{ color: "#4B5563", marginBottom: 24, lineHeight: 22 }}>
              Apply as an artist, minister, or podcaster. After review you can
              upload tracks to the Artists shelf — separate from copyright-free
              beds.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/creators/apply")}
              style={{
                backgroundColor: "#0A332D",
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: "center",
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                Become a creator
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === "wait_review" ? (
          <View
            style={{
              borderRadius: 16,
              padding: 20,
              backgroundColor: "#FFF8E7",
              borderColor: "#F5C542",
              borderWidth: 1,
            }}
          >
            <Ionicons name="time-outline" size={28} color="#8A6A00" />
            <Text style={{ fontSize: 20, fontWeight: "700", marginTop: 12, marginBottom: 8, color: "#8A6A00" }}>
              Under review
            </Text>
            <Text style={{ color: "#374151", lineHeight: 22, marginBottom: 12 }}>
              {me.capabilities.statusMessage}
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280" }}>
              Pull to refresh after you are approved. Upload stays locked until then.
            </Text>
          </View>
        ) : null}

        {step === "upload_first_track" || step === "manage_catalog" ? (
          <View>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#111", marginBottom: 8 }}>
              {me.artist?.displayName || "Your studio"}
            </Text>
            <Text style={{ color: "#4B5563", marginBottom: 20, lineHeight: 22 }}>
              {me.capabilities.statusMessage}
            </Text>

            {me.capabilities.canUploadTracks ? (
              <TouchableOpacity
                onPress={() => router.push("/creators/upload")}
                style={{
                  backgroundColor: "#0A332D",
                  borderRadius: 999,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginBottom: 12,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                  {step === "upload_first_track"
                    ? "Upload your first song"
                    : "Upload a track"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 999,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginBottom: 12,
                  opacity: 0.7,
                }}
              >
                <Text style={{ color: "#6B7280", fontWeight: "600" }}>Upload locked</Text>
              </View>
            )}

            {(me.artist?.slug || me.capabilities.publicProfilePath) ? (
              <TouchableOpacity
                onPress={openPublicProfile}
                style={{
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 999,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: "#1F2937", fontWeight: "600" }}>
                  View public profile
                </Text>
              </TouchableOpacity>
            ) : null}

            {(me.capabilities.canEditProfile || me.capabilities.canUploadTracks) ? (
              <TouchableOpacity
                onPress={() => router.push("/creators/edit-profile")}
                style={{
                  borderWidth: 1,
                  borderColor: "#0A332D",
                  borderRadius: 999,
                  paddingVertical: 14,
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <Text style={{ color: "#0A332D", fontWeight: "600" }}>
                  Edit public profile
                </Text>
              </TouchableOpacity>
            ) : null}

            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#111",
                marginBottom: 12,
              }}
            >
              Your tracks
            </Text>

            {tracksLoading && tracks.length === 0 ? (
              <ActivityIndicator color="#0A332D" style={{ marginVertical: 24 }} />
            ) : null}

            {!tracksLoading && tracks.length === 0 ? (
              <Text style={{ color: "#9CA3AF", lineHeight: 20 }}>
                No tracks yet. Uploads land on Music → Artists only — never on
                Copyright-free.
              </Text>
            ) : null}

            {tracks.map((track) => {
              const busy = actionId === track.id;
              return (
                <View
                  key={track.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  {track.thumbnailUrl ? (
                    <Image
                      source={{ uri: track.thumbnailUrl }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        marginRight: 12,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        marginRight: 12,
                        backgroundColor: "#E5E7EB",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="musical-notes" size={20} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={{ fontWeight: "600", color: "#111" }}
                      numberOfLines={1}
                    >
                      {track.title}
                    </Text>
                    <Text
                      style={{
                        color: "#9CA3AF",
                        fontSize: 12,
                        marginTop: 2,
                        textTransform: "capitalize",
                      }}
                    >
                      {statusLabel(track)}
                      {track.playCount != null ? ` · ${track.playCount} plays` : ""}
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator color="#0A332D" />
                  ) : (
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: "/creators/edit-track",
                            params: { trackId: track.id },
                          })
                        }
                        hitSlop={8}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="create-outline" size={22} color="#0A332D" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => togglePublish(track)}
                        hitSlop={8}
                        style={{ padding: 6 }}
                      >
                        <Ionicons
                          name={
                            String(track.visibility || "").toLowerCase() === "public"
                              ? "eye-outline"
                              : "eye-off-outline"
                          }
                          size={22}
                          color="#0A332D"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => confirmDelete(track)}
                        hitSlop={8}
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="trash-outline" size={22} color="#B91C1C" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}

        {step === "contact_support" ? (
          <View
            style={{
              borderRadius: 16,
              padding: 20,
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
              borderWidth: 1,
            }}
          >
            <Ionicons name="alert-circle-outline" size={28} color="#B91C1C" />
            <Text style={{ fontSize: 20, fontWeight: "700", marginTop: 12, marginBottom: 8, color: "#B91C1C" }}>
              Account needs attention
            </Text>
            <Text style={{ color: "#374151", lineHeight: 22 }}>
              {me.capabilities.statusMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
