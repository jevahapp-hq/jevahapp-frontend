/**
 * Premium upload limits / guidelines plate
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import {
  getResponsiveFontSize,
  getResponsiveSpacing,
} from "../../../../utils/responsive";

type UploadLimitsPlateProps = {
  selectedType: string;
};

type LimitRow = { icon: keyof typeof Ionicons.glyphMap; text: string };


function getLimitRows(selectedType: string): LimitRow[] {
  if (selectedType === "music") {
    return [
      { icon: "cloud-upload-outline", text: "Up to 50 MB per song" },
      { icon: "library-outline", text: "Library cap: 50 songs" },
      { icon: "time-outline", text: "Max 10 uploads per hour" },
    ];
  }
  if (selectedType === "sermon" || selectedType === "videos") {
    return [
      { icon: "cloud-upload-outline", text: "Up to 300 MB per video" },
      { icon: "film-outline", text: "Library cap: 30 videos" },
      { icon: "time-outline", text: "Max 10 uploads per hour" },
    ];
  }
  if (selectedType === "books" || selectedType === "ebook") {
    return [
      { icon: "cloud-upload-outline", text: "Up to 100 MB per file" },
      { icon: "document-text-outline", text: "PDF / EPUB preferred" },
      { icon: "time-outline", text: "Max 10 uploads per hour" },
    ];
  }
  if (selectedType === "podcasts") {
    return [
      { icon: "cloud-upload-outline", text: "Up to 100 MB per episode" },
      { icon: "mic-outline", text: "Audio formats: MP3, WAV, M4A" },
      { icon: "time-outline", text: "Max 10 uploads per hour" },
    ];
  }
  return [
    { icon: "videocam-outline", text: "Videos up to 300 MB" },
    { icon: "musical-note-outline", text: "Music up to 50 MB" },
    { icon: "book-outline", text: "Books up to 100 MB" },
  ];
}

export function UploadLimitsPlate({ selectedType }: UploadLimitsPlateProps) {
  const rows = getLimitRows(selectedType);
  const pad = getResponsiveSpacing(14, 16, 18);

  return (
    <View
      style={{
        marginBottom: getResponsiveSpacing(18, 22, 26),
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E8EDF5",
        backgroundColor: "#FBFCFD",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: pad,
          paddingTop: pad,
          paddingBottom: getResponsiveSpacing(10, 12, 12),
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: "rgba(15, 23, 42, 0.06)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#0F172A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#0F172A",
              fontFamily: "Rubik-SemiBold",
              fontSize: getResponsiveFontSize(13, 14, 15),
            }}
          >
            Upload guidelines
          </Text>
          <Text
            style={{
              color: "#64748B",
              fontFamily: "Rubik-Regular",
              fontSize: getResponsiveFontSize(11, 12, 13),
              marginTop: 2,
            }}
          >
            So your post clears checks the first time
          </Text>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: pad,
          paddingBottom: pad,
          gap: getResponsiveSpacing(8, 9, 10),
        }}
      >
        {rows.map((row) => (
          <View
            key={row.text}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#EEF2F7",
              paddingVertical: getResponsiveSpacing(9, 10, 11),
              paddingHorizontal: getResponsiveSpacing(10, 12, 12),
            }}
          >
            <Ionicons
              name={row.icon}
              size={16}
              color="#475569"
              style={{ marginRight: 10 }}
            />
            <Text
              style={{
                flex: 1,
                color: "#334155",
                fontFamily: "Rubik-Medium",
                fontSize: getResponsiveFontSize(11, 12, 13),
              }}
            >
              {row.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
