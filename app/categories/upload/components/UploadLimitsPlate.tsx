/**
 * Upload size / rate guideline plate
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { getResponsiveFontSize } from "../../../../utils/responsive";

type UploadLimitsPlateProps = {
  selectedType: string;
};

function getLimitsText(selectedType: string) {
  if (selectedType === "music") {
    return "Max 50 MB per file • 50 songs total limit • Max 10 uploads/hr";
  }
  if (selectedType === "sermon" || selectedType === "videos") {
    return "Max 300 MB per file • 30 videos total limit • Max 10 uploads/hr";
  }
  if (selectedType === "books" || selectedType === "ebook") {
    return "Max 100 MB per file • Max 10 uploads/hr";
  }
  return "Max 300 MB (videos) • 50 MB (music) • 100 MB (books)";
}

export function UploadLimitsPlate({ selectedType }: UploadLimitsPlateProps) {
  return (
    <View
      className="flex-row items-center px-5 py-4 mb-6 rounded-2xl"
      style={{
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        <Ionicons name="information-circle" size={22} color="#3B82F6" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#1E293B",
            fontFamily: "Rubik-SemiBold",
            fontSize: getResponsiveFontSize(13, 14, 15),
            marginBottom: 2,
          }}
        >
          Upload Guidelines
        </Text>
        <Text
          style={{
            color: "#64748B",
            fontFamily: "Rubik-Regular",
            fontSize: getResponsiveFontSize(11, 12, 13),
            lineHeight: 18,
          }}
        >
          {getLimitsText(selectedType)}
        </Text>
      </View>
    </View>
  );
}
