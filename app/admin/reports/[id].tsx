/**
 * Report Detail & Review — inspect media & execute moderation decisions.
 * Ebook reports get a Read book CTA into PdfViewer.
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { AdminReportMediaInspect } from "../components/AdminReportMediaInspect";
import {
  adminApi,
  type AdminReport,
} from "../../services/admin/AdminApi";

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === "pending") return "#B45309";
  if (s === "reviewed") return "#1D4ED8";
  if (s === "resolved") return "#047857";
  return "#6B7280";
}

export default function AdminReportDetailScreen() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const reportId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [report, setReport] = useState<AdminReport | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await adminApi.getReport(reportId);
      setReport(r);
      setNotes(r.resolutionNotes || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const execute = async (status: "reviewed" | "resolved") => {
    if (!reportId) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateReportStatus(reportId, {
        status,
        resolutionNotes: notes.trim(),
      });
      setReport((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              resolutionNotes: notes.trim() || updated.resolutionNotes,
              status: updated.status || status,
            }
          : updated
      );
      Alert.alert(
        "Saved",
        status === "resolved"
          ? "Report marked resolved."
          : "Report marked reviewed."
      );
    } catch (e) {
      Alert.alert(
        "Action failed",
        e instanceof Error ? e.message : "Could not update report"
      );
    } finally {
      setSaving(false);
    }
  };

  const title =
    report?.mediaTitle ||
    report?.media?.title ||
    (report?.mediaId ? `Media ${report.mediaId.slice(-6)}` : "Report");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 4, marginRight: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#0F172A" }}>
            Report Detail & Review
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>
            Inspect media & execute moderation decisions
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#0A332D" style={{ marginTop: 48 }} />
      ) : error ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: "#B91C1C", marginBottom: 12 }}>{error}</Text>
          <TouchableOpacity onPress={() => void load()}>
            <Text style={{ color: "#0A332D", fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : report ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <AdminReportMediaInspect
            media={report.media}
            fallbackTitle={title}
          />

          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 4,
              }}
            >
              {title}
            </Text>
            {report.media?.speaker ? (
              <Text style={{ color: "#64748B", marginBottom: 10 }}>
                {report.media.speaker}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  backgroundColor: "#FEF3C7",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#92400E",
                    textTransform: "capitalize",
                  }}
                >
                  {report.reason.replace(/_/g, " ")}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#F1F5F9",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: statusColor(report.status),
                    textTransform: "uppercase",
                  }}
                >
                  {report.status}
                </Text>
              </View>
            </View>

            {report.description ? (
              <Text style={{ color: "#334155", fontSize: 15, lineHeight: 22 }}>
                {report.description}
              </Text>
            ) : (
              <Text style={{ color: "#94A3B8", fontStyle: "italic" }}>
                No reporter description
              </Text>
            )}
          </View>

          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 14,
              gap: 12,
            }}
          >
            <View>
              <Text style={{ fontSize: 11, color: "#94A3B8", fontWeight: "600" }}>
                REPORTER
              </Text>
              <Text style={{ color: "#0F172A", marginTop: 2 }}>
                {report.reporterEmail || "—"}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: "#94A3B8", fontWeight: "600" }}>
                UPLOADER
              </Text>
              <Text style={{ color: "#0F172A", marginTop: 2 }}>
                {report.uploaderEmail || "—"}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 10,
              }}
            >
              Sibling Reports ({report.siblingReports?.length ?? 0})
            </Text>
            {(report.siblingReports?.length ?? 0) === 0 ? (
              <Text style={{ color: "#94A3B8" }}>No other reports on this media</Text>
            ) : (
              report.siblingReports!.map((sib) => (
                <TouchableOpacity
                  key={sib.id}
                  onPress={() =>
                    router.push({
                      pathname: "/admin/reports/[id]",
                      params: { id: sib.id },
                    })
                  }
                  style={{
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: "#F1F5F9",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: "600",
                      color: "#0F172A",
                      textTransform: "capitalize",
                    }}
                  >
                    {sib.reason.replace(/_/g, " ")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: statusColor(sib.status),
                      textTransform: "uppercase",
                      marginTop: 2,
                    }}
                  >
                    {sib.status}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#0F172A",
                marginBottom: 8,
              }}
            >
              Admin Resolution Notes
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter reviewer decision notes..."
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 110,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: 12,
                padding: 12,
                color: "#0F172A",
                fontSize: 15,
                lineHeight: 22,
              }}
            />
          </View>

          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: 10,
            }}
          >
            Execution Actions
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              disabled={saving}
              onPress={() => void execute("reviewed")}
              style={{
                flex: 1,
                backgroundColor: "#1D4ED8",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>reviewed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={saving}
              onPress={() => void execute("resolved")}
              style={{
                flex: 1,
                backgroundColor: "#047857",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>resolved</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
