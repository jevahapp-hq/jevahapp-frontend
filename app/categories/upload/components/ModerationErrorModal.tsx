/**
 * Moderation rejection / under-review modal + inline banner
 */

import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import {
  getResponsiveFontSize,
  getResponsiveSpacing,
} from "../../../../utils/responsive";
import type { ModerationError, UploadState } from "../types";
import { formatFriendlyRejectionMessage } from "../utils";

type ModerationErrorModalProps = {
  moderationError: ModerationError | null;
  onDismiss: () => void;
  onIdleReset: () => void;
};

export function ModerationErrorModal({
  moderationError,
  onDismiss,
  onIdleReset,
}: ModerationErrorModalProps) {
  return (
    <Modal
      visible={!!moderationError}
      transparent
      animationType="fade"
      onRequestClose={() => {
        onDismiss();
        onIdleReset();
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: getResponsiveSpacing(20, 24, 32),
        }}
        onPress={() => {}}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: getResponsiveSpacing(24, 28, 36),
            width: "100%",
            maxWidth: 400,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {moderationError &&
            (() => {
              const friendly = formatFriendlyRejectionMessage(
                moderationError.status,
                moderationError.reason,
                moderationError.flags,
                moderationError.message
              );
              const isReview = friendly.isReview;
              return (
                <>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: isReview
                        ? "rgba(255, 193, 7, 0.2)"
                        : "rgba(255, 152, 0, 0.2)",
                      justifyContent: "center",
                      alignItems: "center",
                      alignSelf: "center",
                      marginBottom: getResponsiveSpacing(16, 20, 24),
                    }}
                  >
                    <Ionicons
                      name={isReview ? "time-outline" : "bulb-outline"}
                      size={32}
                      color={isReview ? "#b38600" : "#e65100"}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: getResponsiveFontSize(18, 20, 22),
                      fontWeight: "600",
                      textAlign: "center",
                      color: "#1a1a1a",
                      marginBottom: getResponsiveSpacing(12, 14, 16),
                    }}
                  >
                    {friendly.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: getResponsiveFontSize(14, 15, 16),
                      lineHeight: 22,
                      textAlign: "center",
                      color: "#444",
                      marginBottom: getResponsiveSpacing(16, 20, 24),
                    }}
                  >
                    {friendly.message}
                  </Text>
                  {!isReview && (
                    <View
                      style={{
                        backgroundColor: "rgba(255, 193, 7, 0.08)",
                        padding: getResponsiveSpacing(12, 14, 16),
                        borderRadius: 12,
                        marginBottom: getResponsiveSpacing(16, 20, 24),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: getResponsiveFontSize(12, 13, 14),
                          color: "#666",
                          fontStyle: "italic",
                          textAlign: "center",
                        }}
                      >
                        Tip: Review your content to align with our gospel
                        community guidelines, then try again.
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => {
                      onDismiss();
                      if (!isReview) {
                        onIdleReset();
                      }
                    }}
                    style={{
                      backgroundColor: isReview ? "#b38600" : "#e65100",
                      paddingVertical: getResponsiveSpacing(14, 16, 18),
                      borderRadius: 12,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: getResponsiveFontSize(15, 16, 17),
                        fontWeight: "600",
                        color: "#fff",
                      }}
                    >
                      {isReview ? "Got it" : "Try again"}
                    </Text>
                  </TouchableOpacity>
                </>
              );
            })()}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

type ModerationErrorInlineProps = {
  moderationError: ModerationError;
  setModerationError: (v: ModerationError | null) => void;
  setUploadState: (v: UploadState) => void;
};

export function ModerationErrorInline({
  moderationError,
  setModerationError,
  setUploadState,
}: ModerationErrorInlineProps) {
  const friendlyMessage = formatFriendlyRejectionMessage(
    moderationError.status,
    moderationError.reason,
    moderationError.flags,
    moderationError.message
  );

  return (
    <View
      className="mt-4 p-4 rounded-lg border"
      style={{
        backgroundColor: friendlyMessage.isReview
          ? "rgba(255, 193, 7, 0.1)"
          : "rgba(255, 152, 0, 0.1)",
        borderColor: friendlyMessage.isReview ? "#ffc107" : "#ff9800",
      }}
    >
      <View className="flex-row items-center mb-3">
        <Ionicons
          name={friendlyMessage.isReview ? "time-outline" : "bulb-outline"}
          size={24}
          color={friendlyMessage.isReview ? "#ffc107" : "#ff9800"}
        />
        <Text
          className="ml-2 font-semibold"
          style={{
            fontSize: getResponsiveFontSize(16, 18, 20),
            color: friendlyMessage.isReview ? "#856404" : "#e65100",
            fontFamily: "Rubik-Medium",
          }}
        >
          {friendlyMessage.title}
        </Text>
      </View>
      <Text
        className="mb-3"
        style={{
          fontSize: getResponsiveFontSize(14, 16, 18),
          color: "#333",
          lineHeight: 22,
          fontFamily: "Rubik-Regular",
        }}
      >
        {friendlyMessage.message}
      </Text>
      {!friendlyMessage.isReview && (
        <View
          className="p-3 rounded-md mb-3"
          style={{
            backgroundColor: "rgba(255, 193, 7, 0.05)",
          }}
        >
          <Text
            style={{
              fontSize: getResponsiveFontSize(12, 13, 14),
              color: "#666",
              fontFamily: "Rubik-Regular",
              fontStyle: "italic",
            }}
          >
            💡 Tip: Review your content and make sure it aligns with our gospel
            community guidelines.
          </Text>
        </View>
      )}
      <TouchableOpacity
        onPress={() => {
          setModerationError(null);
          if (!friendlyMessage.isReview) {
            setUploadState({ status: "idle", progress: 0, message: "" });
          }
        }}
        className="bg-gray-200 rounded-lg py-3 px-4 items-center"
        style={{
          backgroundColor: friendlyMessage.isReview ? "#ffc107" : "#ff9800",
        }}
      >
        <Text
          className="font-medium"
          style={{
            fontSize: getResponsiveFontSize(14, 16, 18),
            color: "#fff",
            fontFamily: "Rubik-Medium",
          }}
        >
          {friendlyMessage.isReview ? "Got it" : "Try Again"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
