import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UI_CONFIG } from "../../../src/shared/constants";

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
  const insets = useSafeAreaInsets();
  // Keep mounted during exit animation
  const [mounted, setMounted] = React.useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
    } else if (mounted) {
      progress.value = withTiming(
        0,
        { duration: 180, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
    }
  }, [visible, mounted, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 40 },
      { scale: 0.96 + progress.value * 0.04 },
    ],
  }));

  if (!mounted) return null;

  const isSaved = libraryStore.isItemSaved(modalKey);
  const isDownloaded = checkIfDownloaded(currentVideo?._id || modalKey);

  const MenuItem = ({
    label,
    icon,
    onPress,
    isDestructive = false,
    isSuccess = false,
    IconComponent = Ionicons,
  }: {
    label: string;
    icon: string;
    onPress: () => void;
    isDestructive?: boolean;
    isSuccess?: boolean;
    IconComponent?: any;
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
        paddingVertical: 12,
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
        color={
          isDestructive
            ? UI_CONFIG.COLORS.ERROR
            : isSuccess
              ? UI_CONFIG.COLORS.SUCCESS
              : "#FFFFFF"
        }
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        {/* Backdrop — tap to close */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.6)",
              },
              backdropStyle,
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sheet — anchored above safe-area so nav keys never overlap */}
        <Animated.View
          style={[
            {
              alignItems: "center",
              paddingHorizontal: 16,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            },
            sheetStyle,
          ]}
          pointerEvents="box-none"
        >
          <BlurView
            intensity={95}
            tint="dark"
            style={{
              width: "100%",
              maxWidth: 320,
              borderRadius: 20,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.15)",
              padding: 12,
              backgroundColor: "rgba(0, 0, 0, 0.55)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                paddingHorizontal: 4,
              }}
            >
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: 11,
                  fontFamily: "Rubik",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Options
              </Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color="rgba(255, 255, 255, 0.5)"
                />
              </TouchableOpacity>
            </View>

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

            <View
              style={{
                height: 1,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                marginVertical: 6,
              }}
            />

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
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
};
