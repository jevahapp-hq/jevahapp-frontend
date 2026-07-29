/**
 * Upload progress overlay — blocks interaction while verifying/uploading.
 */

import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import type { UploadState } from "../types";

type UploadProgressModalProps = {
  visible: boolean;
  uploadState: UploadState;
};

function getLoadingMessage(uploadState: UploadState) {
  if (uploadState.status === "verifying") {
    return uploadState.message || "Analyzing content...";
  }
  if (uploadState.status === "uploading") {
    return "Uploading approved content...";
  }
  return "Processing...";
}

export function UploadProgressModal({
  visible,
  uploadState,
}: UploadProgressModalProps) {
  const progress = Math.max(0, Math.min(100, uploadState.progress || 0));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#161823" />
          <Text style={styles.title}>{getLoadingMessage(uploadState)}</Text>

          {progress > 0 ? (
            <View style={styles.progressBlock}>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${progress}%` }]} />
              </View>
              {progress < 100 ? (
                <Text style={styles.percent}>{progress}%</Text>
              ) : null}
            </View>
          ) : null}

          {uploadState.status === "verifying" ? (
            <Text style={styles.hint}>This may take 10–30 seconds</Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 30,
    alignItems: "center",
    minWidth: 280,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  title: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    color: "#161823",
    lineHeight: 22,
  },
  progressBlock: {
    width: "100%",
    marginTop: 18,
  },
  track: {
    width: "100%",
    height: 4,
    backgroundColor: "#F0F0F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#161823",
    borderRadius: 2,
  },
  percent: {
    marginTop: 8,
    fontSize: 12,
    color: "#8A8B91",
    textAlign: "center",
    fontWeight: "600",
  },
  hint: {
    marginTop: 14,
    fontSize: 13,
    color: "#8A8B91",
    textAlign: "center",
  },
});
