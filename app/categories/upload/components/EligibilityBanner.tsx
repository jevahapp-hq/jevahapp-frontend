/**
 * Soft upload readiness checklist (IG-style inline guidance — not a scary error wall)
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import {
  getResponsiveFontSize,
  getResponsiveSpacing,
} from "../../../../utils/responsive";
import type { EligibilityStatus } from "../types";

type EligibilityBannerProps = {
  eligibilityStatus: EligibilityStatus;
};

export function EligibilityBanner({
  eligibilityStatus,
}: EligibilityBannerProps) {
  const isValid = eligibilityStatus.isValid;
  const accent = isValid ? "#16A34A" : "#DF930E";
  const bg = isValid ? "rgba(22, 163, 74, 0.06)" : "rgba(223, 147, 14, 0.06)";
  const border = isValid ? "rgba(22, 163, 74, 0.2)" : "rgba(223, 147, 14, 0.22)";

  return (
    <View
      style={{
        marginBottom: getResponsiveSpacing(16, 20, 24),
        padding: getResponsiveSpacing(14, 16, 18),
        borderRadius: 16,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: isValid ? 0 : 10 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: isValid
              ? "rgba(22, 163, 74, 0.15)"
              : "rgba(223, 147, 14, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Ionicons
            name={isValid ? "checkmark-circle" : "sparkles-outline"}
            size={16}
            color={accent}
          />
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: getResponsiveFontSize(13, 14, 15),
            fontFamily: "Rubik-SemiBold",
            color: isValid ? "#166534" : "#92400E",
          }}
        >
          {isValid ? "Ready to post" : "Almost there — finish these"}
        </Text>
      </View>

      {!isValid && (
        <View style={{ paddingLeft: 38 }}>
          {eligibilityStatus.errors.map((error, index) => (
            <View
              key={`${index}-${error.slice(0, 24)}`}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 6,
              }}
            >
              <Ionicons
                name="ellipse-outline"
                size={10}
                color="#B45309"
                style={{ marginTop: 4, marginRight: 8 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: getResponsiveFontSize(12, 13, 14),
                  lineHeight: 18,
                  fontFamily: "Rubik-Regular",
                  color: "#78350F",
                }}
              >
                {error}
              </Text>
            </View>
          ))}
        </View>
      )}

      {isValid && eligibilityStatus.warnings?.length > 0 ? (
        <View style={{ marginTop: 10, paddingLeft: 38 }}>
          {eligibilityStatus.warnings.map((w, i) => (
            <Text
              key={`${i}-${w.slice(0, 20)}`}
              style={{
                fontSize: getResponsiveFontSize(11, 12, 13),
                color: "#64748B",
                fontFamily: "Rubik-Regular",
                marginBottom: 4,
              }}
            >
              Tip: {w}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
