/**
 * ContentFeedStates - Loading, Error, Empty states for AllContentTikTok
 * Loading avoids large white skeleton cards (looked like blank video stages).
 */
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";

export function LoadingState() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "transparent",
      }}
    >
      <ActivityIndicator size="small" color={UI_CONFIG.COLORS.PRIMARY} />
    </View>
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
