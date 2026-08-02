/**
 * ContentFeedStates - Loading, Error, Empty states for AllContentTikTok
 */
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { VideoCardSkeleton } from "../../../../shared/components/Skeleton";
import { UI_CONFIG } from "../../../../shared/constants";

/**
 * Skeleton-only fallback for a true empty cold start (no disk cache yet).
 * Prefer showing cached feed rows immediately — do not overlay a brand spinner.
 */
export function LoadingState() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FCFCFD" }}>
      <VideoCardSkeleton hideProgressBar dark />
      <VideoCardSkeleton hideProgressBar dark />
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
