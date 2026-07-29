import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COMMENT_COMPOSER_COLORS as C } from "./types";

type Props = {
  title: string;
  onSort: () => void;
  onClose: () => void;
};

export function CommentSheetHeader({ title, onSort, onClose }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide} />
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity
          onPress={onSort}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.sortBtn}
        >
          <Ionicons name="options-outline" size={18} color={C.text} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Close comments"
      >
        <Ionicons name="close" size={22} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headerSide: {
    width: 36,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  sortBtn: {
    marginLeft: 6,
    padding: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
