/**
 * Type marks on a thumbnail *before* the player/ebook opens.
 * Video = play, ebook = book, audio = notes — readable at a glance.
 */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { MediaItem } from "../types";
import { detectMediaType } from "../utils/mediaTypeDetection";

type Kind = "video" | "ebook" | "audio" | "sermon" | "other";

function kindFrom(item?: MediaItem | null, contentType?: string): Kind {
  const detected = item ? detectMediaType(item) : "unknown";
  const t = String(contentType || item?.contentType || "").toLowerCase();
  if (detected === "ebook" || t.includes("book") || t.includes("ebook")) {
    return "ebook";
  }
  if (t.includes("sermon") && detected !== "video") return "sermon";
  if (
    detected === "audio" ||
    t.includes("audio") ||
    t.includes("music") ||
    t.includes("hymn")
  ) {
    return "audio";
  }
  if (
    detected === "video" ||
    detected === "gif" ||
    t.includes("video") ||
    t.includes("live")
  ) {
    return "video";
  }
  return "other";
}

const META: Record<
  Kind,
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  video: { icon: "play", label: "Video" },
  ebook: { icon: "book", label: "E-book" },
  audio: { icon: "musical-notes", label: "Audio" },
  sermon: { icon: "person", label: "Sermon" },
  other: { icon: "document", label: "Media" },
};

export function FeedMediaTypeOverlay({
  item,
  contentType,
  showCenter = true,
}: {
  item?: MediaItem | null;
  contentType?: string;
  showCenter?: boolean;
}) {
  const kind = kindFrom(item, contentType);
  const meta = META[kind];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.badge}>
        <Ionicons name={meta.icon} size={12} color="#FFFFFF" />
        <Text style={styles.badgeLabel}>{meta.label}</Text>
      </View>
      {showCenter ? (
        <View style={styles.centerWrap}>
          <View style={styles.centerDisc}>
            <Ionicons
              name={meta.icon}
              size={kind === "video" ? 22 : 20}
              color="#FFFFFF"
              style={kind === "video" ? { marginLeft: 2 } : undefined}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(15, 17, 21, 0.55)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_500Medium",
    letterSpacing: 0.2,
  },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerDisc: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(15, 17, 21, 0.38)",
    alignItems: "center",
    justifyContent: "center",
  },
});
