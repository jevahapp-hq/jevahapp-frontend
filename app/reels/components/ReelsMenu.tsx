import React from "react";
import { Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

interface ReelsMenuProps {
  visible: boolean;
  modalKey: string;
  currentVideo: any;
  isOwner: boolean;
  libraryStore: any;
  checkIfDownloaded: (id: string) => boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onSave: (key: string) => void;
  onDelete: () => void;
  onReport: () => void;
  onDownload: () => void;
}

export const ReelsMenu: React.FC<ReelsMenuProps> = ({
  visible,
  modalKey,
  currentVideo,
  isOwner,
  libraryStore,
  checkIfDownloaded,
  onClose,
  onViewDetails,
  onSave,
  onDelete,
  onReport,
  onDownload,
}) => {
  if (!visible) return null;

  return (
    <>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="absolute inset-0 z-10" />
      </TouchableWithoutFeedback>

      <View
        style={{
          position: "absolute",
          bottom: 200,
          right: 100,
          backgroundColor: "#FFFFFF",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 5,
          borderRadius: 16,
          padding: 16,
          width: 180,
          zIndex: 20,
        }}
      >
        {/* View Details */}
        <TouchableOpacity
          onPress={() => {
            onViewDetails();
            onClose();
          }}
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#f3f4f6",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: "#1D2939",
              fontSize: 14,
              fontFamily: "Rubik",
            }}
          >
            View Details
          </Text>
          <Ionicons name="eye-outline" size={22} color="#1D2939" />
        </TouchableOpacity>

        {/* Save to Library / Remove from Library */}
        <TouchableOpacity
          onPress={() => {
            onSave(modalKey);
            onClose();
          }}
          style={{
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#f3f4f6",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: "#1D2939",
              fontSize: 14,
              fontFamily: "Rubik",
            }}
          >
            {libraryStore.isItemSaved(modalKey)
              ? "Remove from Library"
              : "Save to Library"}
          </Text>
          <MaterialIcons
            name={
              libraryStore.isItemSaved(modalKey) ? "bookmark" : "bookmark-border"
            }
            size={22}
            color="#1D2939"
          />
        </TouchableOpacity>

        {/* Delete - Only show if owner */}
        {isOwner && (
          <TouchableOpacity
            onPress={() => {
              onDelete();
              onClose();
            }}
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#f3f4f6",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: "#FF6B6B",
                fontSize: 14,
                fontFamily: "Rubik",
              }}
            >
              Delete
            </Text>
            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        )}

        {/* Report - Only show if not owner */}
        {!isOwner && (
          <TouchableOpacity
            onPress={() => {
              onReport();
              onClose();
            }}
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#f3f4f6",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: "#FF6B6B",
                fontSize: 14,
                fontFamily: "Rubik",
              }}
            >
              Report
            </Text>
            <Ionicons name="flag-outline" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        )}

        {/* Download / Remove Download */}
        <TouchableOpacity
          onPress={() => {
            onDownload();
            onClose();
          }}
          style={{
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: "#f3f4f6",
            marginTop: 6,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: "#1D2939",
              fontSize: 14,
              fontFamily: "Rubik",
            }}
          >
            {checkIfDownloaded(currentVideo._id || modalKey)
              ? "Remove Download"
              : "Download"}
          </Text>
          <Ionicons
            name={
              checkIfDownloaded(currentVideo._id || modalKey)
                ? "checkmark-circle"
                : "download-outline"
            }
            size={24}
            color={
              checkIfDownloaded(currentVideo._id || modalKey)
                ? "#256E63"
                : "#090E24"
            }
          />
        </TouchableOpacity>
      </View>
    </>
  );
};

