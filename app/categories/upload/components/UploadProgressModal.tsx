/**
 * Upload progress overlay modal
 */

import { ActivityIndicator, Modal, Text, View } from "react-native";
import {
  getResponsiveFontSize,
  getResponsiveSpacing,
} from "../../../../utils/responsive";
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
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        // Prevent closing during upload
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 20,
            padding: getResponsiveSpacing(24, 32, 40),
            alignItems: "center",
            minWidth: 280,
            maxWidth: "85%",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <ActivityIndicator size="large" color="#000" />
          <Text
            style={{
              marginTop: getResponsiveSpacing(16, 20, 24),
              fontSize: getResponsiveFontSize(16, 18, 20),
              fontWeight: "600",
              textAlign: "center",
              color: "#333",
            }}
          >
            {getLoadingMessage(uploadState)}
          </Text>
          {uploadState.progress > 0 && (
            <View
              style={{
                width: "100%",
                marginTop: getResponsiveSpacing(16, 20, 24),
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: 4,
                  backgroundColor: "#e0e0e0",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${uploadState.progress}%`,
                    height: "100%",
                    backgroundColor: "#000",
                    borderRadius: 2,
                  }}
                />
              </View>
              {uploadState.progress < 100 && (
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: getResponsiveFontSize(12, 14, 16),
                    color: "#666",
                    textAlign: "center",
                  }}
                >
                  {uploadState.progress}%
                </Text>
              )}
            </View>
          )}
          {uploadState.status === "verifying" && (
            <Text
              style={{
                marginTop: getResponsiveSpacing(12, 16, 20),
                fontSize: getResponsiveFontSize(12, 14, 16),
                color: "#666",
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              This may take 10-30 seconds
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
