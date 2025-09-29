import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { UI_CONFIG } from "../../constants";

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
  layout?: "horizontal" | "vertical";
  onPress?: () => void;
  style?: any;
}

export const CommentIcon: React.FC<CommentIconProps> = ({
  comments,
  size = 24,
  color = UI_CONFIG.COLORS.TEXT_SECONDARY,
  showCount = false,
  count,
  layout = "horizontal",
  onPress,
  style,
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        {
          flexDirection: layout === "vertical" ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Ionicons name="chatbubble-outline" size={size} color={color} />
      {showCount && (
        <Text
          style={{
            marginLeft: layout === "vertical" ? 0 : UI_CONFIG.SPACING.XS,
            marginTop: layout === "vertical" ? UI_CONFIG.SPACING.XS : 0,
            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
            color: color,
            fontWeight: "500",
            textAlign: "center",
          }}
        >
          {count !== undefined ? count : comments.length}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default CommentIcon;
