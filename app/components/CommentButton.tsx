import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";
import {
  getResponsiveBorderRadius,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";
import { useCommentModal } from "../context/CommentModalContext";
import { useOptimizedButton } from "../utils/performance";

interface CommentButtonProps {
  contentId: string;
  contentTitle?: string;
  commentCount?: number;
  onCommentPosted?: (comment: any) => void;
  size?: "small" | "medium" | "large";
  showCount?: boolean;
}

export default function CommentButton({
  contentId,
  contentTitle = "Content",
  commentCount = 0,
  onCommentPosted,
  size = "medium",
  showCount = true,
}: CommentButtonProps) {
  const { showCommentModal } = useCommentModal();

  const getIconSize = () => {
    switch (size) {
      case "small":
        return 16;
      case "large":
        return 24;
      default:
        return 20;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case "small":
        return getResponsiveTextStyle("caption");
      case "large":
        return getResponsiveTextStyle("body");
      default:
        return getResponsiveTextStyle("caption");
    }
  };

  const getPadding = () => {
    switch (size) {
      case "small":
        return getResponsiveSpacing(4, 6, 8, 10);
      case "large":
        return getResponsiveSpacing(8, 12, 16, 20);
      default:
        return getResponsiveSpacing(6, 8, 10, 12);
    }
  };

  const optimizedCommentHandler = useOptimizedButton(
    () => {
      // Use global CommentModalV2 via context; pass empty list and contentId
      showCommentModal([], contentId);
    },
    {
      debounceMs: 200,
      key: `comment-${contentId}`,
    }
  );

  const handleCommentPosted = (comment: any) => {
    onCommentPosted?.(comment);
  };

  return (
    <>
      <TouchableOpacity
        onPress={optimizedCommentHandler}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: getPadding(),
          borderRadius: getResponsiveBorderRadius("medium"),
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chatbubble-outline"
          size={getIconSize()}
          color="#6B7280"
          style={{
            marginRight: showCount ? getResponsiveSpacing(4, 6, 8, 10) : 0,
          }}
        />
        {showCount && (
          <Text
            style={[
              getTextSize(),
              {
                color: "#6B7280",
                fontWeight: "500",
              },
            ]}
          >
            {commentCount}
          </Text>
        )}
      </TouchableOpacity>

      {/* Comment modal is rendered globally via CommentModalV2 in layout */}
    </>
  );
}
