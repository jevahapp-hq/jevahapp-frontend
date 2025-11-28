import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMediaOwnership } from "../hooks/useMediaOwnership";
import { getUploadedBy } from "../utils/mediaHelpers";
import {
  GestureHandlerRootView,
  HandlerStateChangeEvent,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

interface ContentActionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onSaveToLibrary: () => void;
  onDownload: () => void;
  isSaved: boolean;
  isDownloaded: boolean;
  contentTitle?: string;
  // Delete functionality props
  mediaId?: string;
  uploadedBy?: string | { _id: string };
  mediaItem?: any; // Full media item for ownership checking (optional)
  onDelete?: () => void;
  showDelete?: boolean; // If provided, use it; otherwise check ownership internally
  // Report functionality props
  onReport?: () => void;
}

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
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const lastTranslateY = useSharedValue(0);
  const [internalVisible, setInternalVisible] = useState(isVisible);
  
  // Use ownership hook if mediaItem is provided, otherwise use showDelete prop
  // Always check ownership when modal opens if mediaItem is provided (as fallback/verification)
  const { isOwner: isOwnerFromHook } = useMediaOwnership({
    mediaItem: mediaItem || (uploadedBy ? { uploadedBy } : undefined),
    isModalVisible: internalVisible && onDelete !== undefined,
    checkOnModalOpen: !!mediaItem, // Always check if mediaItem is provided
  });
  
  // Determine final isOwner value
  // Priority: 
  // 1. If showDelete is explicitly true, show delete
  // 2. If showDelete is explicitly false, don't show delete  
  // 3. Otherwise, use hook result (which checks ownership)
  const isOwner = showDelete === true 
    ? true 
    : showDelete === false 
    ? false 
    : isOwnerFromHook;

  useEffect(() => {
    if (isVisible) {
      setInternalVisible(true);
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 100,
        mass: 1,
        overshootClamping: true,
      });
    } else {
      // When parent sets isVisible to false, hide modal immediately
      setInternalVisible(false);
    }
  }, [isVisible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    if (translationY > 0) {
      translateY.value = translationY;
      lastTranslateY.value = translationY;
    }
  };

  const closeModal = useCallback(() => {
    setInternalVisible(false);
    onClose();
  }, [onClose]);

  const onGestureEnd = (
    _event: HandlerStateChangeEvent<Record<string, unknown>>
  ) => {
    if (lastTranslateY.value > 150) {
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 20,
        stiffness: 100,
        mass: 1,
        overshootClamping: true,
      });
      runOnJS(closeModal)();
    } else {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 100,
        mass: 1,
        overshootClamping: true,
      });
    }
  };

  const handleClose = useCallback(() => {
    // Close immediately so backdrop disappears
    closeModal();
  }, [closeModal]);

  const handleAction = (action: () => void) => {
    try {
      action();
    } catch (error) {
      console.error("ContentActionModal: action failed", error);
    }
    handleClose();
  };


  if (!internalVisible) return null;

  return (
    <Modal
      visible={internalVisible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Backdrop - can be tapped to close */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
          }}
        />

        {/* Modal content */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onGestureEnd}
        >
          <Animated.View
            style={[
              animatedStyle,
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
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: "#D1D5DB",
                alignSelf: "center",
                borderRadius: 2,
                marginBottom: 16,
                marginTop: 0,
              }}
            />

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
                  color: "#1D2939",
                  fontFamily: "Rubik-SemiBold",
                }}
              >
                Content Actions
              </Text>
              <TouchableOpacity
                onPress={handleClose}
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

            <Text
              style={{
                fontSize: 14,
                color: "#667085",
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
              <TouchableOpacity
                onPress={() => handleAction(onViewDetails)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "#F9FAFB",
                  borderRadius: 12,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: "#DBEAFE",
                      borderRadius: 18,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name="eye-outline" size={18} color="#3B82F6" />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Rubik-SemiBold",
                      color: "#1D2939",
                    }}
                  >
                    View Details
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleAction(onSaveToLibrary)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "#F9FAFB",
                  borderRadius: 12,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: "#D1FAE5",
                      borderRadius: 18,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <MaterialIcons
                      name={isSaved ? "bookmark" : "bookmark-border"}
                      size={18}
                      color={isSaved ? "#10B981" : "#6B7280"}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Rubik-SemiBold",
                      color: "#1D2939",
                    }}
                  >
                    {isSaved ? "Remove from Library" : "Save to Library"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Delete button - only show if user is the owner */}
              {onDelete && isOwner && (
                <TouchableOpacity
                  onPress={() => {
                    if (onDelete) {
                      onDelete();
                    }
                    handleClose();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: "#FEF2F2",
                    borderRadius: 12,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: "#FEE2E2",
                        borderRadius: 18,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Rubik-SemiBold",
                        color: "#DC2626",
                      }}
                    >
                      Delete
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              {/* Report button - only show if user is NOT the owner */}
              {onReport && !isOwner && (
                <TouchableOpacity
                  onPress={() => {
                    if (onReport) {
                      onReport();
                    }
                    handleClose();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: "#FEF2F2",
                    borderRadius: 12,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: "#FEE2E2",
                        borderRadius: 18,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="flag-outline" size={18} color="#EF4444" />
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Rubik-SemiBold",
                        color: "#DC2626",
                      }}
                    >
                      Report
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleAction(onDownload)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "#F9FAFB",
                  borderRadius: 12,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: "#FED7AA",
                      borderRadius: 18,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name={
                        isDownloaded ? "checkmark-circle" : "download-outline"
                      }
                      size={18}
                      color={isDownloaded ? "#256E63" : "#F59E0B"}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Rubik-SemiBold",
                      color: "#1D2939",
                    }}
                  >
                    {isDownloaded ? "Remove Download" : "Download"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
}
