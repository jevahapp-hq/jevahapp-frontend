import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { DiscoverCard } from "../types";

type DiscoverCardItemProps = {
  item: DiscoverCard;
  screenWidth?: number;
};

/**
 * Render Discover Weekly style card
 */
export function DiscoverCardItem({
  item,
  screenWidth = Dimensions.get("window").width,
}: DiscoverCardItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{
        width: screenWidth - 64, // Slightly narrower for more sneak-peek of next card
        height: 170, // Compacter for better list visibility
        marginRight: 16,
        borderRadius: 32, // More rounded for modern premium feel
        overflow: "hidden",
        ...Platform.select({
          ios: {
            shadowColor: item.color,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
          },
          android: {
            elevation: 12,
          },
        }),
      }}
    >
      <LinearGradient
        colors={[item.color, "#000000"]} // High-contrast cinematic gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Visual Flourish: Glass Orbs/Mesh Gradient Effect */}
        <View
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            transform: [{ scale: 1.2 }],
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -20,
            left: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "rgba(255, 255, 255, 0.08)",
          }}
        />

        <View style={{ flex: 1, padding: 24, justifyContent: "space-between" }}>
          {/* HUD / Glassmorphism Content Area */}
          <View>
            <BlurView
              intensity={30}
              tint="dark"
              style={{
                alignSelf: "flex-start",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: "rgba(0, 0, 0, 0.25)",
                marginBottom: 8,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  fontFamily: "Rubik_700Bold",
                }}
              >
                Featured
              </Text>
            </BlurView>

            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: "#FFFFFF",
                fontFamily: "Rubik_700Bold",
                marginBottom: 6,
                letterSpacing: -0.5,
                textShadowColor: "rgba(0, 0, 0, 0.4)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 6,
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "rgba(255, 255, 255, 0.85)",
                fontFamily: "Rubik_400Regular",
                lineHeight: 18,
                maxWidth: "90%",
              }}
            >
              {item.description}
            </Text>
          </View>

          {/* Premium Interaction Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons
                name="play"
                size={22}
                color={item.color}
                style={{ marginLeft: 3 }}
              />
            </TouchableOpacity>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                gap: 12,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              <TouchableOpacity>
                <Ionicons name="heart-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="share-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={16}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
