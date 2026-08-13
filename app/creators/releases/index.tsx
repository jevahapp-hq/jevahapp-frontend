/**
 * Creator studio — list of releases (draft / scheduled / published).
 */
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreatorMe } from "../../hooks/useCreatorMe";
import {
  listArtistReleases,
  type ArtistRelease,
} from "../../services/creators";

export default function CreatorReleasesScreen() {
  const router = useRouter();
  const { data: me } = useCreatorMe();
  const [releases, setReleases] = useState<ArtistRelease[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listArtistReleases({ limit: 50 });
      setReleases(res.releases);
    } catch {
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const canManage =
    me.capabilities.canUploadTracks ||
    me.capabilities.nextStep === "manage_catalog" ||
    me.capabilities.nextStep === "upload_first_track";

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
          Releases
        </Text>
        {canManage ? (
          <TouchableOpacity
            onPress={() => router.push("/creators/releases/new")}
            style={{
              backgroundColor: "#0A332D",
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
              New
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
      >
        <Text style={{ color: "#6B7280", marginBottom: 16, lineHeight: 20 }}>
          Albums, EPs, mixtapes, and singles — separate from Copyright-free and
          listener playlists.
        </Text>

        {loading && releases.length === 0 ? (
          <ActivityIndicator color="#0A332D" style={{ marginTop: 40 }} />
        ) : null}

        {!loading && releases.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48 }}>
            <Ionicons name="albums-outline" size={40} color="#9CA3AF" />
            <Text
              style={{
                marginTop: 12,
                color: "#6B7280",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              No releases yet. Create a draft, add cover + tracks, then publish.
            </Text>
            {canManage ? (
              <TouchableOpacity
                onPress={() => router.push("/creators/releases/new")}
                style={{
                  backgroundColor: "#0A332D",
                  borderRadius: 999,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  Create release
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {releases.map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() =>
              router.push({
                pathname: "/creators/releases/[id]",
                params: { id: r.id },
              })
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
              gap: 12,
            }}
            activeOpacity={0.7}
          >
            {r.coverUrl ? (
              <Image
                source={{ uri: r.coverUrl }}
                style={{ width: 56, height: 56, borderRadius: 8 }}
              />
            ) : (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  backgroundColor: "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="musical-notes" size={22} color="#9CA3AF" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#111", fontSize: 15 }}>
                {r.title}
              </Text>
              <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 2 }}>
                {String(r.type).toUpperCase()} · {r.status}
                {r.trackCount != null ? ` · ${r.trackCount} tracks` : ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
