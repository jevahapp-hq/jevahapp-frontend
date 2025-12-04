import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
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
import { UI_CONFIG } from "../constants";
import { useMediaOwnership } from "../hooks/useMediaOwnership";

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
  
  // Use ownership hook if mediaItem is provided AND showDelete is not explicitly provided
  // If showDelete is explicitly provided (true/false), trust it and skip the hook check
  const shouldCheckOwnership = showDelete === undefined && (!!mediaItem || !!uploadedBy);
  const { isOwner: isOwnerFromHook } = useMediaOwnership({
    mediaItem: mediaItem || (uploadedBy ? { uploadedBy } : undefined),
    isModalVisible: internalVisible && onDelete !== undefined && shouldCheckOwnership,
    checkOnModalOpen: shouldCheckOwnership, // Only check if showDelete is not provided
  });
  
  // Determine final isOwner value
  // Priority: 
  // 1. If showDelete is explicitly true, show delete (trust the parent component's ownership check)
  // 2. If showDelete is explicitly false, don't show delete  
  // 3. Otherwise, use hook result (which checks ownership as fallback)
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
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
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
                  backgroundColor: UI_CONFIG.COLORS.BORDER,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="close" size={20} color={UI_CONFIG.COLORS.TEXT_SECONDARY} />
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
              <TouchableOpacity
                onPress={() => handleAction(onViewDetails)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: UI_CONFIG.COLORS.SURFACE,
                  borderRadius: 12,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: UI_CONFIG.COLORS.PRIMARY, // Thicker Jevah green background
                      borderRadius: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name="eye-outline" size={20} color="#FEA74E" />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Rubik-SemiBold",
                      color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                    }}
                  >
                    View Details
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={UI_CONFIG.COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleAction(onSaveToLibrary)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: UI_CONFIG.COLORS.SURFACE,
                  borderRadius: 12,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: UI_CONFIG.COLORS.PRIMARY, // Thicker Jevah green background
                      borderRadius: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <MaterialIcons
                      name={isSaved ? "bookmark" : "bookmark-border"}
                      size={20}
                      color={isSaved ? "#FF8A00" : "#FEA74E"} // Orange shades
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Rubik-SemiBold",
                      color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                    }}
                  >
                    {isSaved ? "Remove from Library" : "Save to Library"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={UI_CONFIG.COLORS.TEXT_SECONDARY} />
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
                    backgroundColor: UI_CONFIG.COLORS.SURFACE,
                    borderRadius: 12,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: "rgba(255, 107, 107, 0.1)", // Error color with 10% opacity
                        borderRadius: 18,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={UI_CONFIG.COLORS.ERROR} />
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Rubik-SemiBold",
                        color: UI_CONFIG.COLORS.ERROR,
                      }}
                    >
                      Delete
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={UI_CONFIG.COLORS.TEXT_SECONDARY} />
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
                    backgroundColor: UI_CONFIG.COLORS.SURFACE,
                    borderRadius: 12,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: "rgba(255, 107, 107, 0.1)", // Error color with 10% opacity
                        borderRadius: 18,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="flag-outline" size={18} color={UI_CONFIG.COLORS.ERROR} />
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Rubik-SemiBold",
                        color: UI_CONFIG.COLORS.ERROR,
                      }}
                    >
                      Report
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={UI_CONFIG.COLORS.TEXT_SECONDARY} />
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
                  backgroundColor: UI_CONFIG.COLORS.SURFACE,
                  borderRadius: 12,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor: UI_CONFIG.COLORS.PRIMARY, // Thicker Jevah green background
                      borderRadius: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name={
                        isDownloaded ? "checkmark-circle" : "download-outline"
                      }
                      size={20}
                      color={isDownloaded ? "#FF8A00" : "#FEA74E"} // Orange shades
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Rubik-SemiBold",
                      color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                    }}
                  >
                    {isDownloaded ? "Remove Download" : "Download"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={UI_CONFIG.COLORS.TEXT_SECONDARY} />
              </TouchableOpacity>

            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
}
