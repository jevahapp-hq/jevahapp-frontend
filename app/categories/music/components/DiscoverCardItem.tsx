import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { DiscoverCard } from "../types";

export const DISCOVER_CARD_HEIGHT = 96;

type DiscoverCardItemProps = {
  item: DiscoverCard;
  width: number;
  screenWidth?: number;
};

/** Compact Discover Weekly / Featured Playlists card */
export function DiscoverCardItem({
  item,
  width,
  screenWidth = Dimensions.get("window").width,
}: DiscoverCardItemProps) {
  const cardWidth = width || Math.round(screenWidth * 0.68);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{
        width: cardWidth,
        height: DISCOVER_CARD_HEIGHT,
        borderRadius: 18,
        overflow: "hidden",
        ...Platform.select({
          ios: {
            shadowColor: item.color,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 10,
          },
          android: {
            elevation: 5,
          },
        }),
      }}
    >
      <LinearGradient
        colors={[item.color, "#000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View
          style={{
            position: "absolute",
            top: -28,
            right: -28,
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -18,
            left: -18,
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "rgba(255, 255, 255, 0.08)",
          }}
        />

        <View
          style={{
            flex: 1,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: 9,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 1.4,
                fontFamily: "Rubik_700Bold",
                marginBottom: 4,
              }}
            >
              Featured
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: "#FFFFFF",
                fontFamily: "Rubik_700Bold",
                letterSpacing: -0.3,
              }}
            >
              {item.title}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.82)",
                fontFamily: "Rubik_400Regular",
                marginTop: 2,
              }}
            >
              {item.description}
            </Text>
          </View>

          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#FFFFFF",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="play"
              size={16}
              color={item.color}
              style={{ marginLeft: 2 }}
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
