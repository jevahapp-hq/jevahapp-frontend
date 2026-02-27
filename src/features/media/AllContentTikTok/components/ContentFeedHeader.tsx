/**
 * ContentFeedHeader - Most Recent + All Content sections + Live Coming Soon
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";
import type { ContentType, MediaItem } from "../../../../shared/types";

interface ContentFeedHeaderProps {
  mostRecentItem: MediaItem | null;
  contentType: ContentType | "ALL";
  filteredMediaListLength: number;
  firstFour: MediaItem[];
  renderContentByType: (item: MediaItem, index: number, shouldRenderPlayer?: boolean) => React.ReactNode;
}

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
            <View
              style={{
                marginHorizontal: UI_CONFIG.SPACING.MD,
                paddingHorizontal: 16,
                paddingVertical: 32,
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderStyle: "dashed",
                minHeight: 200,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#256E63",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  position: "relative",
                }}
              >
                <Ionicons name="radio" size={40} color="#FFFFFF" />
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 2,
                    borderColor: "#256E63",
                  }}
                />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, justifyContent: "center" }}>
                <View
                  style={{
                    backgroundColor: "#256E63",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                    marginRight: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#FFFFFF",
                      marginRight: 6,
                    }}
                  />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#FFFFFF", fontFamily: "Rubik-Bold", letterSpacing: 0.5 }}>
                    LIVE
                  </Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#1D2939", textAlign: "center", fontFamily: "Rubik-SemiBold" }}>
                  Coming Soon
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  textAlign: "center",
                  lineHeight: 20,
                  paddingHorizontal: 16,
                  fontFamily: "Rubik",
                }}
              >
                We're working on bringing you live streaming content. Stay tuned for updates!
              </Text>
            </View>
          </>
        )}
        <View style={{ marginTop: UI_CONFIG.SPACING.XXL }} />
      </View>
    </>
  );
}
