import { memo } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { MentionCandidate } from "./types";
import { COMMENT_COMPOSER_COLORS as C } from "./types";

type Props = {
  visible: boolean;
  candidates: MentionCandidate[];
  onSelect: (c: MentionCandidate) => void;
};

function MentionSuggestionsInner({ visible, candidates, onSelect }: Props) {
  if (!visible || candidates.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        data={candidates}
        keyExtractor={(item) => item.userId || item.displayName}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
          >
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.initial}>
                  {item.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.displayName}
              </Text>
              {item.isCreator ? (
                <Text style={styles.creator}>Creator</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export const MentionSuggestions = memo(MentionSuggestionsInner);

const styles = StyleSheet.create({
  wrap: {
    maxHeight: 180,
    backgroundColor: C.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    backgroundColor: C.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  creator: {
    fontSize: 11,
    color: C.heart,
    fontWeight: "600",
    marginTop: 1,
  },
});
