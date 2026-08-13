/**
 * Admin report media inspector — video/audio thumbnail or ebook read CTA.
 */
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import {
  getAdminReportPdfUrl,
  isAdminReportEbook,
  type AdminReportMedia,
} from "../../services/admin/AdminApi";

type Props = {
  media?: AdminReportMedia | null;
  fallbackTitle?: string;
};

export function AdminReportMediaInspect({ media, fallbackTitle }: Props) {
  const router = useRouter();
  const title = media?.title || fallbackTitle || "Reported media";
  const isBook = isAdminReportEbook(media);
  const pdfUrl = getAdminReportPdfUrl(media);
  const cover =
    media?.thumbnailUrl || media?.coverImageUrl || media?.imageUrl || null;

  const openBook = () => {
    if (!pdfUrl) return;
    router.push({
      pathname: "/reader/PdfViewer",
      params: {
        url: pdfUrl,
        ebookId: String(media?._id || media?.id || ""),
        title,
        desc: media?.description || "",
      },
    });
  };

  return (
    <View
      style={{
        backgroundColor: "#0F1C1A",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={{ width: "100%", height: isBook ? 220 : 180 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{
            height: isBook ? 180 : 140,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#1A2E2A",
          }}
        >
          <Ionicons
            name={isBook ? "book-outline" : "play-circle-outline"}
            size={48}
            color="#FEA74E"
          />
        </View>
      )}

      <View style={{ padding: 16 }}>
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "700",
            fontFamily: "Rubik_700Bold",
            marginBottom: 4,
          }}
        >
          {title}
        </Text>
        {media?.speaker ? (
          <Text style={{ color: "rgba(255,255,255,0.65)", marginBottom: 8 }}>
            {media.speaker}
          </Text>
        ) : null}
        <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
          {String(media?.contentType || "media").toUpperCase()}
          {media?.moderationStatus
            ? ` · ${media.moderationStatus}`
            : ""}
        </Text>

        {isBook ? (
          <View style={{ marginTop: 14 }}>
            <Text
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 13,
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              This report targets a book. Open the full PDF to review the
              content before deciding.
            </Text>
            <TouchableOpacity
              onPress={openBook}
              disabled={!pdfUrl}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pdfUrl ? "#FEA74E" : "#4B5563",
                paddingVertical: 12,
                borderRadius: 12,
                gap: 8,
              }}
            >
              <Ionicons name="book" size={18} color="#0F1C1A" />
              <Text
                style={{
                  color: "#0F1C1A",
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                {pdfUrl ? "Read book" : "PDF unavailable"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}
