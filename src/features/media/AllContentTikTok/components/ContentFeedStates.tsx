/**
 * ContentFeedStates - Loading, Error, Empty states for AllContentTikTok
 */
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";
import { FeedMediaCardSkeleton } from "./FeedMediaCardSkeleton";

export function LoadingState({ count = 2 }: { count?: number }) {
  const pageBg = UI_CONFIG.COLORS.BACKGROUND || "#FFFFFF";
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: pageBg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 48, backgroundColor: pageBg }}
    >
      {/* Most Recent */}
      <View style={{ marginTop: UI_CONFIG.SPACING.LG }}>
        <View
          style={{
            paddingHorizontal: UI_CONFIG.SPACING.MD,
            marginBottom: UI_CONFIG.SPACING.MD,
          }}
        >
          <View
            style={{
              height: 18,
              width: 118,
              borderRadius: 6,
              backgroundColor: "#E8EAED",
              opacity: 0.9,
            }}
          />
        </View>
        <FeedMediaCardSkeleton delay={40} />
      </View>

      {/* For You */}
      <View style={{ marginTop: UI_CONFIG.SPACING.XL }}>
        <View
          style={{
            paddingHorizontal: UI_CONFIG.SPACING.MD,
            marginBottom: UI_CONFIG.SPACING.LG,
          }}
        >
          <View
            style={{
              height: 18,
              width: 86,
              borderRadius: 6,
              backgroundColor: "#E8EAED",
              opacity: 0.9,
            }}
          />
        </View>
        {Array.from({ length: count }).map((_, i) => (
          <FeedMediaCardSkeleton
            key={`feed-skel-${i}`}
            delay={120 + i * 90}
          />
        ))}
      </View>
    </ScrollView>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: UI_CONFIG.SPACING.LG }}>
      <Text style={{ color: UI_CONFIG.COLORS.ERROR, textAlign: "center", fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD }}>
        {message}
      </Text>
    </View>
  );
}

export function EmptyState({ contentType }: { contentType: string }) {
  const message =
    contentType === "ALL"
      ? "No content available yet."
      : `No ${contentType.toLowerCase()} content available yet.`;
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: UI_CONFIG.SPACING.LG }}>
      <Text style={{ color: UI_CONFIG.COLORS.TEXT_SECONDARY, textAlign: "center", fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD }}>
        {message}
      </Text>
    </View>
  );
}

export function ContentUnavailableState() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: UI_CONFIG.SPACING.LG }}>
      <Ionicons name="lock-closed-outline" size={48} color={UI_CONFIG.COLORS.TEXT_SECONDARY} />
      <Text style={{
        color: UI_CONFIG.COLORS.TEXT_PRIMARY,
        textAlign: "center",
        fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
        fontWeight: "bold",
        marginTop: 16
      }}>
        Content Unavailable
      </Text>
      <Text style={{
        color: UI_CONFIG.COLORS.TEXT_SECONDARY,
        textAlign: "center",
        fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
        marginTop: 8
      }}>
        This content may be under review or has been removed.
      </Text>
    </View>
  );
}
