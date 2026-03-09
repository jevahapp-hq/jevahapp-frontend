import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import { Dimensions, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { UI_CONFIG } from "../../../src/shared/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  onShare: (key: string) => void;
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
  onShare,
}) => {
  if (!visible) return null;

  const isSaved = libraryStore.isItemSaved(modalKey);
  const isDownloaded = checkIfDownloaded(currentVideo?._id || modalKey);

  const MenuItem = ({
    label,
    icon,
    onPress,
    isDestructive = false,
    isSuccess = false,
    IconComponent = Ionicons
  }: {
    label: string,
    icon: string,
    onPress: () => void,
    isDestructive?: boolean,
    isSuccess?: boolean,
    IconComponent?: any
  }) => (
    <TouchableOpacity
      onPress={() => {
        onPress();
        onClose();
      }}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        marginBottom: 6,
      }}
    >
      <Text
        style={{
          color: isDestructive ? UI_CONFIG.COLORS.ERROR : "#FFFFFF",
          fontSize: 14,
          fontFamily: "Rubik-SemiBold",
        }}
      >
        {label}
      </Text>
      <IconComponent
        name={icon as any}
        size={20}
        color={isDestructive ? UI_CONFIG.COLORS.ERROR : isSuccess ? UI_CONFIG.COLORS.SUCCESS : "#FFFFFF"}
      />
    </TouchableOpacity>
  );

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" }} />
      </TouchableWithoutFeedback>

      <View
        style={{
          position: "absolute",
          bottom: 110,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={95}
          tint="dark"
          style={{
            width: "100%",
            maxWidth: 280, // Narrower for mobile
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.15)",
            padding: 12,
            backgroundColor: "rgba(0, 0, 0, 0.5)", // Added backdrop color for more opacity
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            paddingHorizontal: 4
          }}>
            <Text style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: 11,
              fontFamily: "Rubik",
              textTransform: "uppercase",
              letterSpacing: 0.8
            }}>
              Options
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <MenuItem
            label="View Details"
            icon="information-circle-outline"
            onPress={onViewDetails}
          />

          <MenuItem
            label={isSaved ? "Remove from Library" : "Save to Library"}
            icon={isSaved ? "bookmark" : "bookmark-border"}
            onPress={() => onSave(modalKey)}
            isSuccess={isSaved}
            IconComponent={MaterialIcons}
          />

          <MenuItem
            label={isDownloaded ? "Remove Download" : "Download"}
            icon={isDownloaded ? "checkmark-circle" : "download-outline"}
            onPress={onDownload}
            isSuccess={isDownloaded}
          />

          <MenuItem
            label="Share"
            icon="share-social-outline"
            onPress={() => onShare(modalKey)}
          />

          <View style={{ height: 1, backgroundColor: "rgba(255, 255, 255, 0.08)", marginVertical: 6 }} />

          {isOwner ? (
            <MenuItem
              label="Delete"
              icon="trash-outline"
              onPress={onDelete}
              isDestructive
            />
          ) : (
            <MenuItem
              label="Report"
              icon="flag-outline"
              onPress={onReport}
              isDestructive
            />
          )}

          {/* Handle */}
          <View style={{
            width: 24,
            height: 3,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            borderRadius: 1.5,
            alignSelf: "center",
            marginTop: 4
          }} />
        </BlurView>
      </View>
    </View>
  );
};

