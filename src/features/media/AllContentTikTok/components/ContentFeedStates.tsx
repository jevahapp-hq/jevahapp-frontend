/**
 * ContentFeedStates - Loading, Error, Empty states for AllContentTikTok
 */
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, View } from "react-native";
import Skeleton from "../../../../shared/components/Skeleton/Skeleton";
import { UI_CONFIG } from "../../../../shared/constants";

export function LoadingState() {
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ marginTop: UI_CONFIG.SPACING.LG }}>
        <View style={{ paddingHorizontal: UI_CONFIG.SPACING.MD, marginBottom: UI_CONFIG.SPACING.MD }}>
          <Skeleton height={22} width={160} borderRadius={6} />
        </View>
        <View style={{ marginHorizontal: UI_CONFIG.SPACING.MD }}>
          <Skeleton variant="card" />
        </View>
      </View>
      <View style={{ marginTop: UI_CONFIG.SPACING.LG }}>
        <View style={{ paddingHorizontal: UI_CONFIG.SPACING.MD, marginBottom: UI_CONFIG.SPACING.MD }}>
          <Skeleton height={22} width={120} borderRadius={6} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`h-skel-${i}`} style={{ width: 154, marginRight: 16 }}>
              <Skeleton variant="thumbnail" />
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={{ marginTop: UI_CONFIG.SPACING.LG, paddingHorizontal: UI_CONFIG.SPACING.MD }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={`card-skel-${i}`} style={{ marginBottom: UI_CONFIG.SPACING.LG }}>
            <Skeleton variant="card" />
          </View>
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
