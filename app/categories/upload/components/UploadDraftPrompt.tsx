/**
 * Leave-upload sheet — save draft, discard, or keep editing.
 */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { UploadOverlayShell } from "./UploadOverlayShell";

type Props = {
  visible: boolean;
  onSaveDraft: () => void;
  onDiscard: () => void;
  onKeepEditing: () => void;
};

export function UploadDraftPrompt({
  visible,
  onSaveDraft,
  onDiscard,
  onKeepEditing,
}: Props) {
  return (
    <UploadOverlayShell visible={visible} onClose={onKeepEditing}>
      <View style={styles.body}>
        <View style={styles.iconRing}>
          <Ionicons name="document-text-outline" size={32} color="#161823" />
        </View>
        <Text style={styles.title}>Save this as a draft?</Text>
        <Text style={styles.message}>
          You have started an upload. Save it and come back later, or discard
          what you entered.
        </Text>

        <TouchableOpacity
          onPress={onSaveDraft}
          activeOpacity={0.85}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryText}>Save draft</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDiscard}
          activeOpacity={0.85}
          style={styles.discardBtn}
        >
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onKeepEditing}
          activeOpacity={0.7}
          style={styles.ghostBtn}
        >
          <Text style={styles.ghostText}>Keep editing</Text>
        </TouchableOpacity>
      </View>
    </UploadOverlayShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 12,
    alignItems: "center",
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: "#161823",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: "#8A8B91",
    textAlign: "center",
    marginBottom: 20,
  },
  primaryBtn: {
    alignSelf: "stretch",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#161823",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  discardBtn: {
    alignSelf: "stretch",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF0F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  discardText: {
    color: "#FE2C55",
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
    color: "#8A8B91",
  },
});
