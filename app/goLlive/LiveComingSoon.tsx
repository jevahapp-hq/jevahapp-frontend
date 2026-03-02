import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  getResponsiveBorderRadius,
  getResponsiveSize,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";
import { UI_CONFIG } from "../../src/shared/constants";

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
        backgroundColor: UI_CONFIG.COLORS.PRIMARY,
        paddingHorizontal: getResponsiveSpacing(20, 24, 28, 32),
        paddingTop: getResponsiveSpacing(40, 44, 48, 52),
        paddingBottom: getResponsiveSpacing(16, 18, 20, 22),
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
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <Text
          style={[
            getResponsiveTextStyle("subtitle"),
            {
              color: "#FFFFFF",
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
            backgroundColor: UI_CONFIG.COLORS.SURFACE,
            borderRadius: getResponsiveBorderRadius("large"),
            paddingHorizontal: getResponsiveSpacing(20, 24, 28, 32),
            paddingVertical: getResponsiveSpacing(24, 28, 32, 36),
            width: "100%",
            maxWidth: 420,
            alignItems: "center",
            borderWidth: 1,
            borderColor: UI_CONFIG.COLORS.BORDER,
          }}
        >
          {/* Icon */}
          <View
            style={{
              marginBottom: getResponsiveSpacing(16, 20, 24, 28),
            }}
          >
            <Ionicons
              name="radio-outline"
              size={getResponsiveSize(32, 36, 40, 44)}
              color={UI_CONFIG.COLORS.PRIMARY}
            />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: getResponsiveSize(20, 22, 24, 26),
              fontFamily: "Rubik-SemiBold",
              color: UI_CONFIG.COLORS.TEXT_PRIMARY,
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
              color: UI_CONFIG.COLORS.TEXT_SECONDARY,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: getResponsiveSpacing(16, 18, 20, 22),
            }}
          >
            In the next Jevah app update, you'll be able to start{" "}
            <Text style={{ color: UI_CONFIG.COLORS.SECONDARY, fontWeight: "600" }}>
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
                color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                marginBottom: 4,
                fontSize: 13,
              }}
            >
              • This screen is a preview of the upcoming Live experience.
            </Text>
            <Text
              style={{
                color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                fontSize: 12,
              }}
            >
              • We're finalizing streaming and moderation features to make sure
              it's smooth and safe for your community.
            </Text>
          </View>
        </View>

        {/* Button positioned right below the card */}
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            marginTop: getResponsiveSpacing(24, 28, 32, 36),
          }}
        >
          {/* Footer button with clean gradient design */}
      <TouchableOpacity
        onPress={handleGoHome}
        activeOpacity={0.8}
        style={{
          borderRadius: getResponsiveBorderRadius("round"),
          overflow: "hidden",
          width: "100%",
        }}
      >
        <LinearGradient
          colors={[UI_CONFIG.COLORS.PRIMARY, UI_CONFIG.COLORS.SECONDARY]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: getResponsiveSpacing(14, 16, 18, 20),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: getResponsiveSize(14, 15, 16, 17),
              fontFamily: "Rubik-SemiBold",
              color: "#FFFFFF",
            }}
          >
            Back to home
          </Text>
        </LinearGradient>
      </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default LiveComingSoon;


