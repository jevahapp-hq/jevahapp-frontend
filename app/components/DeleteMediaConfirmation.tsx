// Delete Media Confirmation Modal
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { deleteMedia } from "../utils/mediaDeleteAPI";
import TopToast from "./TopToast";

interface DeleteMediaConfirmationProps {
  visible: boolean;
  mediaId: string;
  mediaTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteMediaConfirmation: React.FC<DeleteMediaConfirmationProps> = ({
  visible,
  mediaId,
  mediaTitle,
  onClose,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hasDeleted, setHasDeleted] = useState(false);

  const handleDelete = async () => {
    // Prevent duplicate calls
    if (isLoading || hasDeleted) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteMedia(mediaId);
      if (result.success) {
        setHasDeleted(true);
        // Show success notification
        setShowSuccessToast(true);
        // Close modal immediately and call onSuccess (smooth like TikTok/Instagram)
        // onSuccess will handle removing from UI, so we don't need to wait
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 300); // Short delay for smooth UX
      }
    } catch (err: any) {
      // Only show error if it's not a 404 for an already-deleted item
      const errorMessage = err.message || "Failed to delete media";
      if (!errorMessage.includes("already been deleted") && !errorMessage.includes("not found")) {
        setError(errorMessage);
        console.error("Delete failed:", err);
      } else {
        // Media was already deleted, treat as success (suppress redundant error)
        setHasDeleted(true);
        setShowSuccessToast(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 300);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="trash-outline" size={48} color="#EF4444" />
          </View>

          <Text style={styles.title}>Delete Media</Text>

          <Text style={styles.message}>
            Are you sure you want to delete "{mediaTitle}"?
          </Text>

          <Text style={styles.warning}>
            This action cannot be undone. The media will be permanently deleted
            from your account and all storage.
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Success Toast Notification */}
      <TopToast
        visible={showSuccessToast}
        text="Media deleted successfully"
        type="success"
        topOffset={20}
        onClose={() => setShowSuccessToast(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1F2937",
    fontFamily: "Rubik-Bold",
  },
  message: {
    fontSize: 16,
    marginBottom: 12,
    color: "#374151",
    textAlign: "center",
    fontFamily: "Rubik-Regular",
  },
  warning: {
    fontSize: 14,
    color: "#EF4444",
    marginBottom: 24,
    fontWeight: "500",
    textAlign: "center",
    fontFamily: "Rubik-Medium",
  },
  errorContainer: {
    backgroundColor: "#FEE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Rubik-Regular",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Rubik-SemiBold",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Rubik-SemiBold",
  },
});

