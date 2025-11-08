import { Ionicons } from "@expo/vector-icons";
import {
    Dimensions,
    Platform,
    Text,
    TouchableOpacity,
    ViewStyle,
} from "react-native";
import { useCommentModal } from "../context/CommentModalContext";

interface Comment {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
}

interface CommentIconProps {
  comments: Comment[];
  size?: number;
  color?: string;
  showCount?: boolean;
  count?: number;
  style?: any;
  layout?: "horizontal" | "vertical";
  contentId?: string;
  onPress?: () => void;
}

const { width: screenWidth } = Dimensions.get("window");
const isSmallScreen = screenWidth < 360;
const isMediumScreen = screenWidth < 768;

const getResponsiveSize = (small: number, medium: number, large: number) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

const getResponsiveSpacing = (
  small: number,
  medium: number,
  large: number
) => getResponsiveSize(small, medium, large);

const getResponsiveFontSize = (
  small: number,
  medium: number,
  large: number
) => getResponsiveSize(small, medium, large);

const getTouchTargetSize = () => (Platform.OS === "ios" ? 44 : 48);

const triggerHapticFeedback = () => {
  if (Platform.OS === "ios") {
    // Integrate expo-haptics here if desired
  }
};

export default function CommentIcon({
  comments,
  size = 24,
  color = "#6B7280",
  showCount = false,
  count,
  style,
  layout = "horizontal",
  contentId,
  onPress,
}: CommentIconProps) {
  const { showCommentModal } = useCommentModal();

  const handlePress = () => {
    triggerHapticFeedback();
    if (onPress) {
      onPress();
      return;
    }
    showCommentModal(comments, contentId);
  };

  const isVertical = layout === "vertical";
  const iconSize =
    size ||
    (isVertical ? getResponsiveSize(28, 32, 36) : getResponsiveSize(24, 26, 28));
  const padding = isVertical
    ? getResponsiveSpacing(8, 10, 12)
    : getResponsiveSpacing(6, 8, 10);

  const containerStyle: ViewStyle = {
    flexDirection: isVertical ? "column" : "row",
    alignItems: "center",
    justifyContent: "center",
    padding,
    minWidth: getTouchTargetSize(),
    minHeight: getTouchTargetSize(),
  };

  const textStyle = {
    fontSize: isVertical
      ? getResponsiveFontSize(9, 10, 11)
      : getResponsiveFontSize(10, 11, 12),
    color,
    marginTop: isVertical ? getResponsiveSpacing(2, 4, 5) : 0,
    marginLeft: isVertical ? 0 : getResponsiveSpacing(4, 6, 8),
    fontFamily: "Rubik-SemiBold",
    textAlign: "center" as const,
    textShadowColor:
      isVertical && color.toLowerCase() === "#ffffff"
        ? "rgba(0, 0, 0, 0.5)"
        : "transparent",
    textShadowOffset:
      isVertical && color.toLowerCase() === "#ffffff"
        ? { width: 0, height: 1 }
        : { width: 0, height: 0 },
    textShadowRadius:
      isVertical && color.toLowerCase() === "#ffffff" ? 2 : 0,
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
      style={[containerStyle, style]}
      accessibilityRole="button"
      accessibilityLabel="Open comments"
    >
      <Ionicons name="chatbubble-outline" size={iconSize} color={color} />
      {showCount && (
        <Text style={textStyle} pointerEvents="none">
          {count ?? comments.length}
        </Text>
      )}
    </TouchableOpacity>
  );
}