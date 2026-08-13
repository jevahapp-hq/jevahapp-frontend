/**
 * Admin · Reports list
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  adminApi,
  isAdminReportEbook,
  type AdminReport,
} from "../../services/admin/AdminApi";

const STATUSES = ["", "pending", "reviewed", "resolved"];

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === "pending") return "#B45309";
  if (s === "reviewed") return "#1D4ED8";
  if (s === "resolved") return "#047857";
  return "#6B7280";
}

export default function AdminReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listReports({
        status: status || undefined,
        limit: 50,
      });
      setReports(res.reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#111" }}>
            Admin · Reports
          </Text>
          <Text style={{ fontSize: 12, color: "#6B7280" }}>
            Inspect media & execute moderation
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 52, paddingHorizontal: 12, paddingTop: 10 }}
      >
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

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
      >
        {error ? (
          <Text style={{ color: "#B91C1C", marginBottom: 12 }}>{error}</Text>
        ) : null}

        {loading && reports.length === 0 ? (
          <ActivityIndicator color="#0A332D" style={{ marginTop: 40 }} />
        ) : null}

        {reports.map((r) => {
          const title =
            r.mediaTitle || r.media?.title || `Media ${r.mediaId.slice(-6)}`;
          const isBook = isAdminReportEbook(r.media);
          return (
            <TouchableOpacity
              key={r.id}
              onPress={() =>
                router.push({
                  pathname: "/admin/reports/[id]",
                  params: { id: r.id },
                })
              }
              style={{
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                marginBottom: 10,
                backgroundColor: "#FAFAFA",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{ flex: 1, fontWeight: "700", color: "#111", fontSize: 15 }}
                  numberOfLines={2}
                >
                  {title}
                </Text>
                {isBook ? (
                  <Ionicons
                    name="book-outline"
                    size={18}
                    color="#0A332D"
                    style={{ marginLeft: 8 }}
                  />
                ) : null}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#0A332D",
                    textTransform: "capitalize",
                  }}
                >
                  {r.reason.replace(/_/g, " ")}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: statusColor(r.status),
                    textTransform: "uppercase",
                  }}
                >
                  {r.status}
                </Text>
              </View>
              {r.description ? (
                <Text
                  style={{ marginTop: 6, color: "#6B7280", fontSize: 13 }}
                  numberOfLines={2}
                >
                  {r.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}

        {!loading && reports.length === 0 && !error ? (
          <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 32 }}>
            No reports
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
