import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../styles";

type EditPostModalProps = {
  visible: boolean;
  editPostText: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
  onSave: () => void;
};

export function EditPostModal({
  visible,
  editPostText,
  onChangeText,
  onClose,
  onSave,
}: EditPostModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.editModal}>
        <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Post</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.editInput}
            value={editPostText}
            onChangeText={onChangeText}
            placeholder="Edit your post..."
            multiline
            maxLength={5000}
            autoFocus
          />
          <View style={styles.editModalActions}>
            <TouchableOpacity
              style={[styles.editButton, styles.cancelEditButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelEditButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, styles.saveEditButton]}
              onPress={onSave}
              disabled={!editPostText.trim()}
            >
              <Text style={styles.saveEditButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
