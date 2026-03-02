/**
 * ContentFeedHeader - Most Recent + All Content sections + Premium Live Coming Soon
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";
import type { ContentType, MediaItem } from "../../../../shared/types";

interface ContentFeedHeaderProps {
  mostRecentItem: MediaItem | null;
  contentType: ContentType | "ALL";
  filteredMediaListLength: number;
  firstFour: MediaItem[];
  renderContentByType: (item: MediaItem, index: number, shouldRenderPlayer?: boolean) => React.ReactNode;
}

// Premium Theme
const THEME = {
  primary: "#256E63",
  secondary: "#FEA74E",
  gold: "#D4AF37",
  dark: "#1A1A2E",
  surface: "#FFFFFF",
  text: "#1D2939",
  textMuted: "#667085",
  border: "#E5E7EB",
};

export function ContentFeedHeader({
  mostRecentItem,
  contentType,
  filteredMediaListLength,
  firstFour,
  renderContentByType,
}: ContentFeedHeaderProps) {
  return (
    <>
      {mostRecentItem && (
        <View style={{ marginTop: UI_CONFIG.SPACING.LG }}>
          <Text
            style={{
              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
              fontWeight: "600",
              color: UI_CONFIG.COLORS.TEXT_PRIMARY,
              paddingHorizontal: UI_CONFIG.SPACING.MD,
              marginBottom: UI_CONFIG.SPACING.MD,
            }}
          >
            Most Recent
          </Text>
          {renderContentByType(mostRecentItem, 0, true)}
        </View>
      )}
      <View style={{ marginTop: UI_CONFIG.SPACING.XL }}>
        <Text
          style={{
            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
            fontWeight: "600",
            color: UI_CONFIG.COLORS.TEXT_PRIMARY,
            paddingHorizontal: UI_CONFIG.SPACING.MD,
            marginBottom: UI_CONFIG.SPACING.LG,
          }}
        >
          {contentType === "ALL" ? "All Content" : `${contentType} Content`} ({filteredMediaListLength} items)
        </Text>
        {firstFour.map((item, index) => (
          <React.Fragment key={item._id ?? `first-${index}`}>
            {renderContentByType(item, index, false)}
          </React.Fragment>
        ))}
        {(contentType === "ALL" || contentType === "live") && (
          <>
            <View style={{ marginTop: UI_CONFIG.SPACING.XXL }} />
            
            {/* Premium Live Coming Soon Card */}
            <View
              style={{
                marginHorizontal: UI_CONFIG.SPACING.MD,
                backgroundColor: THEME.dark,
                borderRadius: 20,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
                elevation: 8,
              }}
            >
              {/* Animated Gradient Background Effect */}
              <View
                style={{
                  position: "absolute",
                  top: -50,
                  right: -50,
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  backgroundColor: `${THEME.primary}30`,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  bottom: -30,
                  left: -30,
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: `${THEME.secondary}20`,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 40,
                  left: 40,
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: `${THEME.gold}15`,
                }}
              />

              {/* Content */}
              <View style={{ padding: 24, alignItems: "center" }}>
                {/* Premium Icon Container with Pulse Effect */}
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 28,
                    backgroundColor: THEME.secondary,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                    shadowColor: THEME.secondary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <Ionicons name="radio" size={40} color="#FFFFFF" />
                  
                  {/* Live Indicator Dot */}
                  <View
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: "#FF4444",
                      borderWidth: 2,
                      borderColor: THEME.secondary,
                    }}
                  />
                </View>

                {/* Live Badge */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255, 68, 68, 0.15)",
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#FF4444",
                      marginRight: 8,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Rubik-Bold",
                      color: "#FF4444",
                      letterSpacing: 1,
                    }}
                  >
                    LIVE STREAMING
                  </Text>
                </View>

                {/* Title */}
                <Text
                  style={{
                    fontSize: 22,
                    fontFamily: "Rubik-Bold",
                    color: "#FFFFFF",
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  Coming Soon
                </Text>

                {/* Description */}
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Rubik-Regular",
                    color: "rgba(255, 255, 255, 0.7)",
                    textAlign: "center",
                    lineHeight: 22,
                    marginBottom: 20,
                    paddingHorizontal: 8,
                  }}
                >
                  Experience live worship, sermons, and events in real-time. Connect with your community like never before.
                </Text>

                {/* Feature Preview Pills */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 8,
                    marginBottom: 20,
                  }}
                >
                  {["Live Worship", "Sermons", "Events", "Q&A"].map((feature, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.15)",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Rubik-Medium",
                          color: "rgba(255, 255, 255, 0.9)",
                        }}
                      >
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Notify Me Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: THEME.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 24,
                    shadowColor: THEME.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Ionicons name="notifications-outline" size={18} color="#FFF" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Rubik-SemiBold",
                      color: "#FFFFFF",
                      marginLeft: 8,
                    }}
                  >
                    Notify Me When Live
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Progress Bar */}
              <View
                style={{
                  height: 3,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: "65%",
                    height: "100%",
                    backgroundColor: THEME.secondary,
                    borderTopRightRadius: 3,
                    borderBottomRightRadius: 3,
                  }}
                />
              </View>
            </View>
          </>
        )}
        <View style={{ marginTop: UI_CONFIG.SPACING.XXL }} />
      </View>
    </>
  );
}
