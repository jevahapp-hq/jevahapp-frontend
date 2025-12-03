import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  getResponsiveBorderRadius,
  getResponsiveSize,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";

/**
 * LiveComingSoon – simple, intelligent screen to let users know
 * that the Live feature is arriving in the next version, without
 * exposing the unfinished GoLive UI.
 */
const LiveComingSoon = () => {
  const router = useRouter();
  const navigation = useNavigation();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.back();
    }
  };

  const handleGoHome = () => {
    router.push("/categories/HomeScreen");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050816",
        paddingHorizontal: getResponsiveSpacing(20, 24, 28, 32),
        paddingTop: getResponsiveSpacing(40, 44, 48, 52),
        paddingBottom: getResponsiveSpacing(24, 28, 32, 36),
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: getResponsiveSpacing(24, 28, 32, 36),
        }}
      >
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          style={{
            padding: getResponsiveSpacing(4, 6, 8, 10),
          }}
        >
          <Ionicons
            name="arrow-back"
            size={getResponsiveSize(18, 20, 22, 24)}
            color="#E5E7EB"
          />
        </TouchableOpacity>

        <Text
          style={[
            getResponsiveTextStyle("subtitle"),
            {
              color: "#E5E7EB",
              fontWeight: "600",
            },
          ]}
        >
          Go Live
        </Text>

        <View style={{ width: getResponsiveSize(18, 20, 22, 24) }} />
      </View>

      {/* Center Card */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "rgba(15,23,42,0.9)",
            borderRadius: getResponsiveBorderRadius("large"),
            paddingHorizontal: getResponsiveSpacing(20, 24, 28, 32),
            paddingVertical: getResponsiveSpacing(24, 28, 32, 36),
            width: "100%",
            maxWidth: 420,
            alignItems: "center",
          }}
        >
          {/* Icon */}
          <View
            style={{
              backgroundColor: "rgba(248,250,252,0.06)",
              borderRadius: getResponsiveBorderRadius("round"),
              padding: getResponsiveSpacing(16, 20, 24, 28),
              marginBottom: getResponsiveSpacing(16, 20, 24, 28),
            }}
          >
            <Ionicons
              name="radio-outline"
              size={getResponsiveSize(32, 36, 40, 44)}
              color="#F97316"
            />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: getResponsiveSize(20, 22, 24, 26),
              fontFamily: "Rubik-SemiBold",
              color: "#F9FAFB",
              textAlign: "center",
              marginBottom: getResponsiveSpacing(8, 10, 12, 14),
            }}
          >
            Live streaming is almost here
          </Text>

          {/* Subtitle */}
          <Text
            style={{
              fontSize: getResponsiveSize(13, 14, 15, 16),
              color: "#9CA3AF",
              textAlign: "center",
              lineHeight: 20,
              marginBottom: getResponsiveSpacing(16, 18, 20, 22),
            }}
          >
            In the next Jevah app update, you’ll be able to start{" "}
            <Text style={{ color: "#F97316", fontWeight: "600" }}>
              live services, prayer meetings, and broadcasts
            </Text>{" "}
            directly from here.
          </Text>

          {/* Info bullets */}
          <View
            style={{
              width: "100%",
              marginTop: getResponsiveSpacing(4, 6, 8, 10),
            }}
          >
            <Text
              style={{
                color: "#E5E7EB",
                marginBottom: 4,
                fontSize: 13,
              }}
            >
              • This screen is a preview of the upcoming Live experience.
            </Text>
            <Text
              style={{
                color: "#9CA3AF",
                fontSize: 12,
              }}
            >
              • We’re finalizing streaming and moderation features to make sure
              it’s smooth and safe for your community.
            </Text>
          </View>
        </View>
      </View>

      {/* Footer button */}
      <TouchableOpacity
        onPress={handleGoHome}
        activeOpacity={0.8}
        style={{
          backgroundColor: "#F97316",
          borderRadius: getResponsiveBorderRadius("round"),
          paddingVertical: getResponsiveSpacing(14, 16, 18, 20),
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: getResponsiveSize(14, 15, 16, 17),
            fontFamily: "Rubik-SemiBold",
            color: "#111827",
          }}
        >
          Back to home
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default LiveComingSoon;


