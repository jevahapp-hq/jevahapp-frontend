import { StyleSheet, Text, View } from "react-native";
import { COMMENT_COMPOSER_COLORS as C } from "./types";

export type TypingUser = {
  userId: string;
  displayName: string;
};

type Props = {
  users: TypingUser[];
};

function labelFor(users: TypingUser[]): string {
  if (users.length === 0) return "";
  if (users.length === 1) {
    const name = users[0].displayName?.trim() || "Someone";
    return `${name} is typing…`;
  }
  if (users.length === 2) {
    const a = users[0].displayName?.trim() || "Someone";
    const b = users[1].displayName?.trim() || "Someone";
    return `${a} and ${b} are typing…`;
  }
  return `${users.length} people are typing…`;
}

export function CommentTypingBanner({ users }: Props) {
  if (!users.length) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>
      <Text style={styles.text} numberOfLines={1}>
        {labelFor(users)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#FAFAFA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    width: 22,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.heart,
    marginRight: 3,
    opacity: 0.35,
  },
  dot1: { opacity: 0.9 },
  dot2: { opacity: 0.55 },
  dot3: { opacity: 0.3 },
  text: {
    flex: 1,
    fontSize: 12,
    color: C.meta,
    fontWeight: "500",
  },
});
