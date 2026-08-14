/**
 * Public artist profile — /artists/[slug] and legacy /artists/ArtistProfile?slug=
 * Plays artist-lane tracks only (never copyright-free).
 * Deep links: jevah://artists/:slug · jevahapp://artists/:slug
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ArtistRelease } from "../services/creators/releaseTypes";
import {
  musicCatalogApi,
  type ArtistProfile,
} from "../services/music-catalog";
import {
  isTrackPlayable,
  isTrackProcessing,
  trackCardToAudioTrack,
  trackCardToSongUi,
  type TrackCard,
} from "../services/music-catalog/trackTypes";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import { useCopyrightFreeOverlayStore } from "../store/useCopyrightFreeOverlayStore";

const PAGE_SIZE = 30;

export default function ArtistProfileScreen() {
  const router = useRouter();
  const { slug: rawSlug } = useLocalSearchParams<{ slug?: string }>();
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [tracks, setTracks] = useState<TrackCard[]>([]);
  const [releases, setReleases] = useState<ArtistRelease[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setTrack, currentTrack, isPlaying, togglePlayPause } =
    useGlobalAudioPlayerStore();

  const load = useCallback(
    async (opts?: { page?: number; append?: boolean }) => {
      if (!slug) {
        setError("Missing artist");
        setLoading(false);
        return;
      }
      const nextPage = opts?.page ?? 1;
      const append = opts?.append === true;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const profilePromise =
          nextPage === 1
            ? musicCatalogApi.getArtistBySlug(slug)
            : Promise.resolve(null as ArtistProfile | null);
        const releasesPromise =
          nextPage === 1
            ? musicCatalogApi.getArtistReleases(slug, { limit: 30 })
            : Promise.resolve({ releases: [] as ArtistRelease[] });

        const [profile, trackRes, releaseRes] = await Promise.all([
          profilePromise,
          musicCatalogApi.getArtistTracks(slug, {
            page: nextPage,
            limit: PAGE_SIZE,
          }),
          releasesPromise,
        ]);

        if (nextPage === 1) {
          if (profile) setArtist(profile);
          else setError("Artist not found");
          setReleases(releaseRes.releases || []);
        }

        const artistOnly = trackRes.tracks.filter((t) => t.lane === "artist");
        setTracks((prev) => {
          if (!append) return artistOnly;
          const seen = new Set(prev.map((t) => t.id));
          return [...prev, ...artistOnly.filter((t) => !seen.has(t.id))];
        });
        setPage(nextPage);
        if (typeof trackRes.total === "number") {
          const prior = append ? (nextPage - 1) * PAGE_SIZE : 0;
          setHasMore(prior + artistOnly.length < trackRes.total);
        } else {
          setHasMore(artistOnly.length >= PAGE_SIZE);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load artist");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    void load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const play = async (track: TrackCard) => {
    if (!isTrackPlayable(track) || isTrackProcessing(track)) {
      Alert.alert(
        "Processing…",
        "This track is still encoding. Try again in a moment."
      );
      return;
    }
    const song = trackCardToSongUi(track);
    if (currentTrack?.id === track.id && isPlaying) {
      await togglePlayPause();
      return;
    }
    const playable = tracks.filter((t) => isTrackPlayable(t));
    const queue = playable.map(trackCardToAudioTrack);
    const idx = playable.findIndex((t) => t.id === track.id);
    useGlobalAudioPlayerStore.setState({
      queue,
      currentIndex: Math.max(0, idx),
    });
    await setTrack(trackCardToAudioTrack(track), true);
    void musicCatalogApi.recordPlay(track.id);
    const queueUi = playable.map(trackCardToSongUi);
    useCopyrightFreeOverlayStore.getState().open(song, { queue: queueUi });
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
          Artist
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color="#0A332D" />
        </View>
      ) : error && !artist ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <Text style={{ color: "#6B7280", textAlign: "center" }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          onEndReached={() => {
            if (!loadingMore && hasMore) {
              void load({ page: page + 1, append: true });
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color="#0A332D" />
              </View>
            ) : null
          }
          ListHeaderComponent={
            <View style={{ alignItems: "center", padding: 24 }}>
              {artist?.avatarUrl ? (
                <Image
                  source={{ uri: artist.avatarUrl }}
                  style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 12 }}
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
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="person" size={40} color="#9CA3AF" />
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: "#111" }}>
                  {artist?.displayName}
                </Text>
                {artist?.isVerified ? (
                  <Ionicons name="checkmark-circle" size={20} color="#256E63" />
                ) : null}
              </View>
              {artist?.bio ? (
                <Text
                  style={{
                    marginTop: 8,
                    color: "#6B7280",
                    textAlign: "center",
                    lineHeight: 20,
                  }}
                >
                  {artist.bio}
                </Text>
              ) : null}
              {artist?.genres?.length ? (
                <Text style={{ marginTop: 8, color: "#9CA3AF", fontSize: 12 }}>
                  {artist.genres.join(" · ")}
                </Text>
              ) : null}

              {releases.length > 0 ? (
                <View style={{ alignSelf: "stretch", marginTop: 24 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#111",
                      marginBottom: 12,
                    }}
                  >
                    Discography
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                  >
                    {releases.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() =>
                          router.push({
                            pathname: "/music/releases/[idOrSlug]",
                            params: { idOrSlug: r.slug || r.id },
                          })
                        }
                        style={{ width: 120 }}
                        activeOpacity={0.8}
                      >
                        {r.coverUrl ? (
                          <Image
                            source={{ uri: r.coverUrl }}
                            style={{
                              width: 120,
                              height: 120,
                              borderRadius: 10,
                            }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 120,
                              height: 120,
                              borderRadius: 10,
                              backgroundColor: "#E5E7EB",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons
                              name="albums-outline"
                              size={28}
                              color="#9CA3AF"
                            />
                          </View>
                        )}
                        <Text
                          style={{
                            marginTop: 6,
                            fontWeight: "600",
                            color: "#111",
                            fontSize: 13,
                          }}
                          numberOfLines={2}
                        >
                          {r.title}
                        </Text>
                        <Text style={{ color: "#9CA3AF", fontSize: 11 }}>
                          {String(r.type).toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <Text
                style={{
                  alignSelf: "flex-start",
                  marginTop: 24,
                  marginBottom: 8,
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#111",
                }}
              >
                Tracks
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#9CA3AF", padding: 24 }}>
              No public tracks yet
            </Text>
          }
          renderItem={({ item }) => {
            const processing = isTrackProcessing(item);
            return (
              <TouchableOpacity
                onPress={() => play(item)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  opacity: processing ? 0.65 : 1,
                }}
              >
                {item.thumbnailUrl ? (
                  <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={{ width: 52, height: 52, borderRadius: 8, marginRight: 12 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      backgroundColor: "#E5E7EB",
                      marginRight: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="musical-notes" size={22} color="#9CA3AF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: "#111" }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 2 }}>
                    {processing
                      ? "Processing…"
                      : `${item.playCount || 0} plays${
                          item.durationSec
                            ? ` · ${Math.floor(item.durationSec / 60)}:${String(
                                Math.floor(item.durationSec % 60)
                              ).padStart(2, "0")}`
                            : ""
                        }`}
                  </Text>
                </View>
                <Ionicons
                  name={
                    processing
                      ? "time-outline"
                      : currentTrack?.id === item.id && isPlaying
                        ? "pause-circle"
                        : "play-circle"
                  }
                  size={32}
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
