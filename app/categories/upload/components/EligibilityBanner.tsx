/**
 * Eligibility status banner (ready / requirements)
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { getResponsiveFontSize } from "../../../../utils/responsive";
import type { EligibilityStatus } from "../types";

type EligibilityBannerProps = {
  eligibilityStatus: EligibilityStatus;
};

export function EligibilityBanner({
  eligibilityStatus,
}: EligibilityBannerProps) {
  return (
    <View
      className="mb-6 p-4 rounded-xl border-l-[4px]"
      style={{
        backgroundColor: eligibilityStatus.isValid
          ? "rgba(34, 197, 94, 0.03)"
          : "rgba(239, 68, 68, 0.03)",
        borderLeftColor: eligibilityStatus.isValid ? "#22c55e" : "#ef4444",
        borderTopColor: "rgba(0,0,0,0.05)",
        borderRightColor: "rgba(0,0,0,0.05)",
        borderBottomColor: "rgba(0,0,0,0.05)",
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      }}
    >
      {eligibilityStatus.isValid ? (
        <View className="flex-row items-center">
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "rgba(34, 197, 94, 0.15)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="checkmark" size={16} color="#166534" />
          </View>
          <Text
            className="ml-3 font-medium"
            style={{
              fontSize: getResponsiveFontSize(12, 14, 15),
              color: "#166534",
              fontFamily: "Rubik-Medium",
            }}
          >
            Ready to post - AI verification active
          </Text>
        </View>
      ) : (
        <View>
          <View className="flex-row items-center mb-3">
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="alert-circle" size={18} color="#991b1b" />
            </View>
            <Text
              className="ml-3 font-semibold"
              style={{
                fontSize: getResponsiveFontSize(13, 15, 17),
                color: "#991b1b",
                fontFamily: "Rubik-SemiBold",
              }}
            >
              Upload Requirements:
            </Text>
          </View>
          <View className="ml-9">
            {eligibilityStatus.errors.map((error, index) => (
              <View key={index} className="flex-row items-start mb-1.5">
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#ef4444",
                    marginTop: 7,
                    marginRight: 8,
                  }}
                />
                <Text
                  style={{
                    fontSize: getResponsiveFontSize(11, 13, 14),
                    color: "#7f1d1d",
                    lineHeight: 18,
                    fontFamily: "Rubik-Regular",
                  }}
                >
                  {error}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
