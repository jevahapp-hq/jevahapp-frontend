import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CommentSkeleton } from "../../../src/shared/components/CommentSkeleton";
import { COMMENT_COMPOSER_COLORS as C } from "./types";

type Props = {
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
};

export function CommentListEmpty({ isLoading, loadError, onRetry }: Props) {
  if (isLoading) {
    return (
      <View style={{ paddingTop: 12, paddingHorizontal: 4 }}>
        <CommentSkeleton count={5} />
      </View>
    );
  }
  if (loadError) {
    return (
      <Pressable onPress={onRetry} style={styles.emptyWrap}>
        <Ionicons name="cloud-offline-outline" size={40} color="#D0D1D3" />
        <Text style={styles.emptyTitle}>Couldn't load comments</Text>
        <Text style={styles.emptySub}>{loadError}</Text>
        <Text style={[styles.emptySub, { color: C.heart, marginTop: 8 }]}>
          Tap to retry
        </Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="chatbubble-ellipses-outline" size={44} color="#D0D1D3" />
      <Text style={styles.emptyTitle}>Be the first to comment</Text>
      <Text style={styles.emptySub}>
        Share a thought, prayer, or encouragement — start the conversation.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    paddingVertical: 56,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: C.meta,
    textAlign: "center",
    lineHeight: 18,
  },
});
