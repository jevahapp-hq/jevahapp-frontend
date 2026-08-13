/**
 * Live Coming Soon promo — rendered as a FlashList row so it stays virtualized.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, View } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";

function LiveComingSoonCardInner() {
  return (
    <View
      style={{
        marginHorizontal: UI_CONFIG.SPACING.MD,
        marginTop: 32,
        borderRadius: 24,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      <View
        style={{
          backgroundColor: "#0F1C1A",
          paddingHorizontal: 24,
          paddingVertical: 32,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: "rgba(37,110,99,0.18)",
            top: -80,
            right: -90,
          }}
        />
        <View
          style={{
            position: "absolute",
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: "rgba(254,167,78,0.08)",
            bottom: -50,
            left: -50,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(254,167,78,0.15)",
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: "rgba(254,167,78,0.35)",
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#FEA74E",
                marginRight: 6,
              }}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#FEA74E",
                letterSpacing: 1.2,
                fontFamily: "Rubik-Bold",
              }}
            >
              LIVE
            </Text>
          </View>
          <View
            style={{
              marginLeft: 8,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
                fontFamily: "Rubik-Medium",
                letterSpacing: 0.5,
              }}
            >
              COMING SOON
            </Text>
          </View>
        </View>

        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "rgba(37,110,99,0.3)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            borderWidth: 1,
            borderColor: "rgba(37,110,99,0.5)",
          }}
        >
          <Ionicons name="radio" size={34} color="#256E63" />
        </View>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: "#FFFFFF",
            fontFamily: "Rubik-Bold",
            marginBottom: 8,
            lineHeight: 30,
          }}
        >
          Live Streaming
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 22,
            fontFamily: "Rubik",
            marginBottom: 24,
            maxWidth: 280,
          }}
        >
          Real-time sermons, worship sessions, and live events — streamed
          directly to your screen.
        </Text>

        {[
          { icon: "videocam-outline", text: "HD live video streaming" },
          {
            icon: "chatbubble-ellipses-outline",
            text: "Live chat & prayer requests",
          },
          {
            icon: "notifications-outline",
            text: "Event reminders & alerts",
          },
        ].map((item) => (
          <View
            key={item.text}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: "rgba(37,110,99,0.25)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name={item.icon as any} size={16} color="#256E63" />
            </View>
            <Text
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.75)",
                fontFamily: "Rubik",
              }}
            >
              {item.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const LiveComingSoonCard = memo(LiveComingSoonCardInner);
