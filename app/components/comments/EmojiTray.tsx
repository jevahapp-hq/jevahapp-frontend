import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COMMENT_COMPOSER_COLORS as C } from "./types";

const CATEGORIES: { id: string; label: string; emojis: string[] }[] = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌",
      "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😜", "🤪", "😝", "🤑", "🤗",
      "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬",
      "😮", "😯", "😲", "😳", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "😈",
    ],
  },
  {
    id: "hands",
    label: "Hands",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘",
      "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐", "🖖",
      "👋", "🤙", "💪", "🦾", "🖕", "✍️", "💅", "🤳",
    ],
  },
  {
    id: "hearts",
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "🔥", "✨", "⭐", "🌟",
    ],
  },
  {
    id: "faith",
    label: "Faith",
    emojis: [
      "🙏", "✝️", "🕊️", "⛪", "😇", "🙌", "🤲", "✝️", "📖", "🕯️", "🌅", "☁️",
      "🌈", "🎵", "🎶", "🔔", "💎", "👑", "🦁", "🌾",
    ],
  },
];

type Props = {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

function EmojiTrayInner({ visible, onSelect, onClose }: Props) {
  const [catId, setCatId] = useState(CATEGORIES[0].id);
  const cat = useMemo(
    () => CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0],
    [catId]
  );

  if (!visible) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCatId(c.id)}
              style={[styles.tab, catId === c.id && styles.tabActive]}
            >
              <Text
                style={[styles.tabText, catId === c.id && styles.tabTextActive]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.close}>
          <Ionicons name="keyboard-outline" size={20} color={C.text} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {cat.emojis.map((e, i) => (
          <Pressable
            key={`${cat.id}-${i}`}
            onPress={() => onSelect(e)}
            style={styles.emojiHit}
          >
            <Text style={styles.emoji}>{e}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export const EmojiTray = memo(EmojiTrayInner);

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingBottom: 4,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 4,
  },
  tabActive: {
    backgroundColor: C.inputBg,
  },
  tabText: {
    fontSize: 13,
    color: C.meta,
    fontWeight: "600",
  },
  tabTextActive: {
    color: C.text,
  },
  close: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  row: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emojiHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 26,
  },
});
