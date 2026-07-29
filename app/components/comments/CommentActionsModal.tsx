import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COMMENT_COMPOSER_COLORS as C } from "./types";
import { CommentOverlayShell } from "./CommentOverlayShell";

type Props = {
  visible: boolean;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function CommentActionsModal({
  visible,
  canEdit,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  return (
    <CommentOverlayShell visible={visible} onClose={onClose} placement="bottom">
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>Comment</Text>

      {canEdit ? (
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            onClose();
            onEdit();
          }}
          activeOpacity={0.75}
        >
          <View style={styles.iconBox}>
            <Ionicons name="create-outline" size={20} color={C.text} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>Edit</Text>
            <Text style={styles.hint}>Update text or photo</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          onClose();
          onDelete();
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.iconBox, styles.iconDanger]}>
          <Ionicons name="trash-outline" size={20} color={C.heart} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, styles.danger]}>Delete</Text>
          <Text style={styles.hint}>Remove from this thread</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
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
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 14,
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
  iconDanger: {
    backgroundColor: "#FFF0F3",
  },
  copy: { flex: 1 },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
  danger: {
    color: C.heart,
  },
  hint: {
    fontSize: 12,
    color: C.meta,
    marginTop: 2,
  },
  cancel: {
    marginTop: 4,
    marginBottom: 10,
    marginHorizontal: 16,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
});
