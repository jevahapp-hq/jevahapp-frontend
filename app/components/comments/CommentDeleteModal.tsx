import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COMMENT_COMPOSER_COLORS as C } from "./types";
import { CommentOverlayShell } from "./CommentOverlayShell";

type Props = {
  visible: boolean;
  preview?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CommentDeleteModal({
  visible,
  preview,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const snippet = (preview || "").trim();
  const shown =
    snippet.length > 90 ? `${snippet.slice(0, 90).trim()}…` : snippet;

  return (
    <CommentOverlayShell
      visible={visible}
      onClose={busy ? () => {} : onCancel}
      placement="center"
    >
      <View style={styles.inner}>
        <View style={styles.iconRing}>
          <Ionicons name="trash-outline" size={28} color={C.heart} />
        </View>
        <Text style={styles.title}>Delete comment?</Text>
        <Text style={styles.sub}>
          This removes it from the thread. You can’t undo this.
        </Text>
        {shown ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewText} numberOfLines={3}>
              {shown}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, busy ? styles.btnDisabled : undefined]}
          onPress={onConfirm}
          disabled={!!busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Delete</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={onCancel}
          disabled={!!busy}
          activeOpacity={0.7}
        >
          <Text style={styles.ghostText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </CommentOverlayShell>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
    alignItems: "center",
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF0F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
    color: C.meta,
    textAlign: "center",
    marginBottom: 14,
  },
  previewBox: {
    alignSelf: "stretch",
    backgroundColor: C.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 18,
    color: C.text,
  },
  primaryBtn: {
    alignSelf: "stretch",
    height: 48,
    borderRadius: 24,
    backgroundColor: C.heart,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  btnDisabled: { opacity: 0.7 },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  ghostBtn: {
    alignSelf: "stretch",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.meta,
  },
});
