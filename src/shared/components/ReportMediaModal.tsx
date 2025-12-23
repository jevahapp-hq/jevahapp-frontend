import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { reportMedia } from "../../../app/services/mediaReportService";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export const REPORT_REASONS = [
  { value: "inappropriate_content", label: "Inappropriate Content" },
  { value: "non_gospel_content", label: "Non-Gospel Content" },
  { value: "explicit_language", label: "Explicit Language" },
  { value: "violence", label: "Violence" },
  { value: "sexual_content", label: "Sexual Content" },
  { value: "blasphemy", label: "Blasphemy" },
  { value: "spam", label: "Spam" },
  { value: "copyright", label: "Copyright Violation" },
  { value: "other", label: "Other" },
];

interface ReportMediaModalProps {
  visible: boolean;
  onClose: () => void;
  mediaId: string;
  mediaTitle?: string;
}

export default function ReportMediaModal({
  visible,
  onClose,
  mediaId,
  mediaTitle,
}: ReportMediaModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason for reporting");
      return;
    }

    setIsSubmitting(true);
    try {
      await reportMedia(mediaId, selectedReason, description?.trim() || undefined);
      
      // Reset form
      setSelectedReason("");
      setDescription("");
      onClose();
      
      Alert.alert(
        "Success",
        "Your report has been submitted. Thank you for keeping our community safe."
      );
    } catch (error: any) {
      let errorMessage = "Failed to submit report. Please try again.";
      let alertTitle = "Error";
      
      if (error.message) {
        if (error.message.toLowerCase().includes("already reported")) {
          // Graceful handling for duplicate reports - show as info, not error
          alertTitle = "Already Reported";
          errorMessage = "You have already reported this content. Our team will review it.";
          
          // Reset form and close modal for duplicate reports
          setSelectedReason("");
          setDescription("");
          onClose();
        } else if (error.message.includes("Authentication") || error.message.includes("login")) {
          errorMessage = "Please log in to report content.";
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(alertTitle, errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason("");
      setDescription("");
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: SCREEN_HEIGHT * 0.85,
            paddingBottom: 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: "#333",
                fontFamily: "Rubik-SemiBold",
              }}
            >
              Report Content
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSubmitting}
              style={{
                width: 32,
                height: 32,
                backgroundColor: "#E5E7EB",
                borderRadius: 16,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={{
              padding: 20,
              maxHeight: SCREEN_HEIGHT * 0.5,
            }}
            showsVerticalScrollIndicator={false}
          >
            {mediaTitle && (
              <Text
                style={{
                  fontSize: 14,
                  color: "#667085",
                  marginBottom: 16,
                  fontFamily: "Rubik",
                }}
              >
                Reporting: {mediaTitle}
              </Text>
            )}

            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#333",
                marginBottom: 12,
                fontFamily: "Rubik-SemiBold",
              }}
            >
              Why are you reporting this content? *
            </Text>

            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 12,
                  backgroundColor:
                    selectedReason === reason.value ? "#FEF2F2" : "#F9FAFB",
                  borderWidth: selectedReason === reason.value ? 1 : 0,
                  borderColor: selectedReason === reason.value ? "#EF4444" : "transparent",
                }}
                onPress={() => setSelectedReason(reason.value)}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor:
                      selectedReason === reason.value ? "#EF4444" : "#666",
                    marginRight: 12,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor:
                      selectedReason === reason.value ? "#EF4444" : "transparent",
                  }}
                >
                  {selectedReason === reason.value && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#333",
                    fontFamily: "Rubik",
                    flex: 1,
                  }}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#333",
                marginTop: 16,
                marginBottom: 12,
                fontFamily: "Rubik-SemiBold",
              }}
            >
              Additional Details (Optional)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#ddd",
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                minHeight: 100,
                textAlignVertical: "top",
                fontFamily: "Rubik",
                color: "#333",
              }}
              placeholder="Please provide more details about why you're reporting this content..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={1000}
              editable={!isSubmitting}
            />
            <Text
              style={{
                fontSize: 12,
                color: "#999",
                textAlign: "right",
                marginTop: 4,
                fontFamily: "Rubik",
              }}
            >
              {description.length}/1000 characters
            </Text>
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              flexDirection: "row",
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: "#eee",
              gap: 12,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F9FAFB",
              }}
              onPress={handleClose}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color: "#666",
                  fontSize: 16,
                  fontWeight: "600",
                  fontFamily: "Rubik-SemiBold",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  !selectedReason || isSubmitting ? "#ccc" : "#EF4444",
              }}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "600",
                    fontFamily: "Rubik-SemiBold",
                  }}
                >
                  Submit Report
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

