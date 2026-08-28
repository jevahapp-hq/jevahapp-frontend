/**
 * Public release page — Music → Artists lane only (never CF).
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ArtistRelease, ReleaseTrack } from "../../services/creators/releaseTypes";
import { musicCatalogApi } from "../../services/music-catalog";
import {
  isTrackPlayable,
  isTrackProcessing,
  normalizeTrackCard,
  trackCardToAudioTrack,
  type TrackCard,
} from "../../services/music-catalog/trackTypes";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";

function trackToCard(t: ReleaseTrack, release: ArtistRelease): TrackCard | null {
  const card = normalizeTrackCard(
    {
      ...(t.raw as object),
      id: t.id,
      title: t.title,
      playbackUrl: t.playbackUrl,
      thumbnailUrl: t.thumbnailUrl || release.coverUrl,
      durationSec: t.durationSec,
      processingStatus: t.processingStatus,
      trackNumber: t.trackNumber,
      lane: "artist",
      release: {
        id: release.id,
        title: release.title,
        coverUrl: release.coverUrl,
        type: release.type,
        slug: release.slug,
      },
      releaseId: release.id,
      artistName: release.artistName,
      artistSlug: release.artistSlug,
    },
    "artist"
  );
  return card;
}

export default function PublicReleaseScreen() {
  const router = useRouter();
  const { idOrSlug: raw } = useLocalSearchParams<{ idOrSlug?: string }>();
  const idOrSlug = Array.isArray(raw) ? raw[0] : raw;

  const [release, setRelease] = useState<ArtistRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setTrack, currentTrack, isPlaying, togglePlayPause } =
    useGlobalAudioPlayerStore();

  const load = useCallback(async () => {
    if (!idOrSlug) {
      setError("Missing release");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await musicCatalogApi.getRelease(idOrSlug);
      if (!r) {
        setError("Release not found");
        setRelease(null);
      } else {
        setRelease(r);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const playables = (release?.tracks || [])
    .map((t) => (release ? trackToCard(t, release) : null))
    .filter((t): t is TrackCard => !!t && t.lane === "artist");

  const play = async (track: TrackCard) => {
    if (!isTrackPlayable(track) || isTrackProcessing(track)) {
      Alert.alert("Processing…", "This track isn’t ready yet.");
      return;
    }
    if (currentTrack?.id === track.id && isPlaying) {
      await togglePlayPause();
      return;
    }
    const queue = playables
      .filter((t) => isTrackPlayable(t))
      .map(trackCardToAudioTrack);
    const idx = queue.findIndex((t) => t.id === track.id);
    useGlobalAudioPlayerStore.setState({
      queue,
      currentIndex: Math.max(0, idx),
    });
    await setTrack(trackCardToAudioTrack(track), true);
    void musicCatalogApi.recordPlay(track.id);
  };

  const playAll = () => {
    const first = playables.find((t) => isTrackPlayable(t));
    if (first) void play(first);
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
          Release
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color="#0A332D" />
        </View>
      ) : error || !release ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: "#6B7280" }}>{error || "Not found"}</Text>
        </View>
      ) : (
        <FlatList
          data={playables}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={{ padding: 20, alignItems: "center" }}>
              {release.coverUrl ? (
                <Image
                  source={{ uri: release.coverUrl }}
                  style={{ width: 200, height: 200, borderRadius: 12 }}
                />
              ) : (
                <View
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 12,
                    backgroundColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="musical-notes" size={48} color="#9CA3AF" />
                </View>
              )}
              <Text
                style={{
                  marginTop: 16,
                  fontSize: 22,
                  fontWeight: "700",
                  color: "#111",
                  textAlign: "center",
                }}
              >
                {release.title}
              </Text>
              {release.artistName ? (
                <TouchableOpacity
                  onPress={() => {
                    if (release.artistSlug) {
                      router.push({
                        pathname: "/artists/[slug]",
                        params: { slug: release.artistSlug },
                      });
                    }
                  }}
                >
                  <Text style={{ marginTop: 6, color: "#0A332D", fontWeight: "600" }}>
                    {release.artistName}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <Text style={{ marginTop: 4, color: "#6B7280", fontSize: 13 }}>
                {String(release.type).toUpperCase()}
                {release.trackCount != null
                  ? ` · ${release.trackCount} tracks`
                  : ""}
              </Text>
              {release.description ? (
                <Text
                  style={{
                    marginTop: 12,
                    color: "#4B5563",
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  {release.description}
                </Text>
              ) : null}
              <TouchableOpacity
                onPress={playAll}
                style={{
                  marginTop: 20,
                  backgroundColor: "#0A332D",
                  borderRadius: 999,
                  paddingHorizontal: 28,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Play</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item, index }) => {
            const active = currentTrack?.id === item.id;
            return (
              <TouchableOpacity
                onPress={() => void play(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 1 : 0,
                  borderBottomWidth: 1,
                  borderColor: "#F3F4F6",
                  gap: 12,
                }}
              >
                <Text style={{ width: 28, color: "#9CA3AF", fontWeight: "600" }}>
                  {item.trackNumber ?? index + 1}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: active ? "700" : "600",
                      color: active ? "#0A332D" : "#111",
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {isTrackProcessing(item) ? (
                    <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                      Processing…
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name={active && isPlaying ? "pause" : "play"}
                  size={20}
                  color="#0A332D"
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
