/**
 * Inline moderation banner (sheet uses UploadResultModal).
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import {
  getResponsiveFontSize,
} from "../../../../utils/responsive";
import type { ModerationError, UploadState } from "../types";
import { formatFriendlyRejectionMessage } from "../utils";

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
            Tip: Make sure title and description clearly reflect gospel-aligned
            teaching, then try again.
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
