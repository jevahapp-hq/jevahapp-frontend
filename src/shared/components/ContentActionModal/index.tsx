import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { isAdmin } from "../../../../app/utils/mediaDeleteAPI";
import { UI_CONFIG } from "../../constants";
import { useMediaOwnership } from "../../hooks/useMediaOwnership";
import ActionRow from "./ActionRow";
import { ContentActionModalProps } from "./types";
import { useSheetTransition } from "./useSheetTransition";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

export type { ContentActionModalProps };

export default function ContentActionModal({
  isVisible,
  onClose,
  onViewDetails,
  onSaveToLibrary,
  onDownload,
  isSaved,
  isDownloaded,
  contentTitle = "Content",
  mediaId,
  uploadedBy,
  mediaItem,
  onDelete,
  showDelete,
  onReport,
}: ContentActionModalProps) {
  const {
    internalVisible,
    requestClose,
    onGestureEvent,
    onGestureEnd,
    sheetStyle,
    backdropStyle,
  } = useSheetTransition(isVisible, onClose);

  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    if (internalVisible) {
      isAdmin().then(setUserIsAdmin).catch(() => setUserIsAdmin(false));
    }
  }, [internalVisible]);

  // Use ownership hook if mediaItem is provided AND showDelete is not explicitly provided.
  // If showDelete is explicitly provided (true/false), trust it and skip the hook check.
  const shouldCheckOwnership =
    showDelete === undefined && (!!mediaItem || !!uploadedBy);
  const { isOwner: isOwnerFromHook } = useMediaOwnership({
    mediaItem: mediaItem || (uploadedBy ? { uploadedBy } : undefined),
    isModalVisible:
      internalVisible && onDelete !== undefined && shouldCheckOwnership,
    checkOnModalOpen: shouldCheckOwnership,
  });

  // Priority: explicit showDelete prop wins; otherwise fall back to ownership check
  const isOwner =
    showDelete === true ? true : showDelete === false ? false : isOwnerFromHook;

  // Admins always see Delete and never Report; regular users see Delete only
  // when they own the content, Report only when they don't.
  const shouldShowDelete = userIsAdmin || isOwner;
  const shouldShowReport = !userIsAdmin && !isOwner;

  const handleAction = (action: () => void) => {
    try {
      action();
    } catch (error) {
      console.error("ContentActionModal: action failed", error);
    }
    requestClose();
  };

  if (!internalVisible) return null;

  return (
    <Modal
      visible={internalVisible}
      transparent={true}
      animationType="none"
      onRequestClose={requestClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Backdrop - can be tapped to close */}
        <Animated.View
          style={[
            backdropStyle,
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={requestClose}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Bottom sheet */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onGestureEnd}
        >
          <Animated.View
            style={[
              sheetStyle,
              {
                position: "absolute",
                bottom: 0,
                width: SCREEN_WIDTH,
                backgroundColor: "white",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 24,
                paddingVertical: 24,
                maxHeight: SCREEN_HEIGHT * 0.7,
                minHeight: 340,
                zIndex: 1000,
                elevation: 1000,
              },
            ]}
          >
            {/* Grab handle */}
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: "#D1D5DB",
                alignSelf: "center",
                borderRadius: 2,
                marginBottom: 16,
              }}
            />

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "600",
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                  fontFamily: "Rubik-SemiBold",
                }}
              >
                Content Actions
              </Text>
              <TouchableOpacity
                onPress={requestClose}
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: UI_CONFIG.COLORS.BORDER,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 14,
                color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                fontFamily: "Rubik",
                marginBottom: 16,
                textAlign: "center",
              }}
              numberOfLines={2}
            >
              {contentTitle}
            </Text>

            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
            >
              <ActionRow
                label="View Details"
                icon={<Ionicons name="eye-outline" size={20} color="#FEA74E" />}
                onPress={() => handleAction(onViewDetails)}
              />

              <ActionRow
                label={isSaved ? "Remove from Library" : "Save to Library"}
                icon={
                  <MaterialIcons
                    name={isSaved ? "bookmark" : "bookmark-border"}
                    size={20}
                    color={isSaved ? "#FF8A00" : "#FEA74E"}
                  />
                }
                onPress={() => handleAction(onSaveToLibrary)}
              />

              {onDelete && shouldShowDelete && (
                <ActionRow
                  label="Delete"
                  destructive
                  icon={
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={UI_CONFIG.COLORS.ERROR}
                    />
                  }
                  onPress={() => handleAction(onDelete)}
                />
              )}

              {onReport && shouldShowReport && (
                <ActionRow
                  label="Report"
                  destructive
                  icon={
                    <Ionicons
                      name="flag-outline"
                      size={18}
                      color={UI_CONFIG.COLORS.ERROR}
                    />
                  }
                  onPress={() => handleAction(onReport)}
                />
              )}

              <ActionRow
                label={isDownloaded ? "Remove Download" : "Download"}
                icon={
                  <Ionicons
                    name={isDownloaded ? "checkmark-circle" : "download-outline"}
                    size={20}
                    color={isDownloaded ? "#FF8A00" : "#FEA74E"}
                  />
                }
                onPress={() => handleAction(onDownload)}
              />
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
}
