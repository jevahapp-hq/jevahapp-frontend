/**
 * AI community verification info plate
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { getResponsiveFontSize } from "../../../../utils/responsive";

export function AiVerificationPlate() {
  return (
    <View
      className="flex-row items-center px-5 py-4 mb-8 rounded-2xl"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.015)",
        borderWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.04)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        width: "100%",
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Ionicons name="shield-checkmark" size={24} color="#10b981" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: "#1f2937",
            fontFamily: "Rubik-SemiBold",
            fontSize: getResponsiveFontSize(13, 14, 15),
            marginBottom: 1,
          }}
        >
          Jevah AI Protected
        </Text>
        <Text
          style={{
            color: "#6b7280",
            fontFamily: "Rubik-Regular",
            fontSize: getResponsiveFontSize(11, 12, 13),
            lineHeight: 16,
          }}
        >
          Safe community verification active. Ensure you own the rights to this
          media.
        </Text>
      </View>
    </View>
  );
}
