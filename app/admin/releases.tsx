/**
 * Admin console — releases table (lowest priority surface).
 * Requires admin-capable session on backend.
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ArtistRelease } from "../services/creators/releaseTypes";
import { adminApi } from "../services/admin/AdminApi";

const STATUSES = ["", "draft", "scheduled", "published", "archived"];

export default function AdminReleasesScreen() {
  const router = useRouter();
  const [releases, setReleases] = useState<ArtistRelease[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listReleases({
        status: status || undefined,
        search: search.trim() || undefined,
        limit: 50,
      });
      setReleases(res.releases);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setReleases([]);
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    void load();
  }, [status]);

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
          Admin · Releases
        </Text>
      </View>

      <View style={{ padding: 12, gap: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search title / artist"
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={() => void load()}
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: "#111",
          }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s || "all"}
              onPress={() => setStatus(s)}
              style={{
                marginRight: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: status === s ? "#0A332D" : "#F3F4F6",
              }}
            >
              <Text
                style={{
                  color: status === s ? "#fff" : "#374151",
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {s ? s.toUpperCase() : "ALL"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
      >
        {error ? (
          <Text style={{ color: "#B91C1C", marginBottom: 12 }}>{error}</Text>
        ) : null}

        {loading && releases.length === 0 ? (
          <ActivityIndicator color="#0A332D" style={{ marginTop: 40 }} />
        ) : null}

        {/* Simple table header */}
        <View
          style={{
            flexDirection: "row",
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <Text style={{ flex: 2, fontWeight: "700", fontSize: 11, color: "#6B7280" }}>
            TITLE
          </Text>
          <Text style={{ flex: 1, fontWeight: "700", fontSize: 11, color: "#6B7280" }}>
            TYPE
          </Text>
          <Text style={{ flex: 1, fontWeight: "700", fontSize: 11, color: "#6B7280" }}>
            STATUS
          </Text>
          <Text style={{ width: 36, fontWeight: "700", fontSize: 11, color: "#6B7280" }}>
            #
          </Text>
        </View>

        {releases.map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() =>
              router.push({
                pathname: "/music/releases/[idOrSlug]",
                params: { idOrSlug: r.slug || r.id },
              })
            }
            style={{
              flexDirection: "row",
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 2 }}>
              <Text style={{ fontWeight: "600", color: "#111" }} numberOfLines={1}>
                {r.title}
              </Text>
              {r.artistName || r.artistSlug ? (
                <Text style={{ fontSize: 11, color: "#6B7280" }} numberOfLines={1}>
                  {r.artistName || r.artistSlug}
                </Text>
              ) : null}
            </View>
            <Text style={{ flex: 1, fontSize: 12, color: "#374151" }}>
              {String(r.type)}
            </Text>
            <Text style={{ flex: 1, fontSize: 12, color: "#374151" }}>
              {String(r.status)}
            </Text>
            <Text style={{ width: 36, fontSize: 12, color: "#6B7280" }}>
              {r.trackCount ?? r.tracks?.length ?? "—"}
            </Text>
          </TouchableOpacity>
        ))}

        {!loading && releases.length === 0 && !error ? (
          <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 32 }}>
            No releases
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
