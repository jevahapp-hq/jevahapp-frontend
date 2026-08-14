import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COMMENT_COMPOSER_COLORS as C } from "./types";
import { CommentOverlayShell } from "./CommentOverlayShell";

export type CommentSortMode = "top" | "newest" | "oldest";

type Props = {
  visible: boolean;
  value: CommentSortMode;
  onClose: () => void;
  onChange: (mode: CommentSortMode) => void;
};

const OPTIONS: {
  key: CommentSortMode;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "top",
    label: "Top",
    hint: "Most liked first",
    icon: "flame-outline",
  },
  {
    key: "newest",
    label: "Newest",
    hint: "Latest comments first",
    icon: "time-outline",
  },
  {
    key: "oldest",
    label: "Oldest",
    hint: "Earliest comments first",
    icon: "hourglass-outline",
  },
];

export function CommentSortModal({
  visible,
  value,
  onClose,
  onChange,
}: Props) {
  return (
    <CommentOverlayShell visible={visible} onClose={onClose} placement="bottom">
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>Sort comments</Text>
      <Text style={styles.sub}>Choose how this thread is ordered</Text>

      {OPTIONS.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.row, active ? styles.rowActive : undefined]}
            onPress={() => {
              onChange(opt.key);
              onClose();
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, active ? styles.iconBoxActive : undefined]}>
              <Ionicons
                name={opt.icon}
                size={20}
                color={active ? C.heart : C.text}
              />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.label, active ? styles.labelActive : undefined]}>
                {opt.label}
              </Text>
              <Text style={styles.hint}>{opt.hint}</Text>
            </View>
            {active ? (
              <Ionicons name="checkmark-circle" size={22} color={C.heart} />
            ) : (
              <View style={styles.radio} />
            )}
          </TouchableOpacity>
        );
      })}
      <View style={{ height: 8 }} />
    </CommentOverlayShell>
  );
}

const styles = StyleSheet.create({
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.handle,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  sub: {
    fontSize: 13,
    color: C.meta,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 14,
  },
  rowActive: {
    backgroundColor: "#FFF0F3",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.inputBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconBoxActive: {
    backgroundColor: "#FFE4EA",
  },
  copy: { flex: 1 },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
  labelActive: {
    color: C.heart,
  },
  hint: {
    fontSize: 12,
    color: C.meta,
    marginTop: 2,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D0D1D3",
  },
});
