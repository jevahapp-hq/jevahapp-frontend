import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useNotificationBadge } from "../hooks/useNotifications";

interface NotificationBadgeProps {
  onPress?: () => void;
  size?: "small" | "medium" | "large";
  showZero?: boolean;
}

const PremiumBadge = ({ count, size = "medium" }: { count: number; size: "small" | "medium" | "large" }) => {
  const sizeMap = {
    small: { w: 16, h: 16, font: 10, border: 1 },
    medium: { w: 20, h: 20, font: 11, border: 1.5 },
    large: { w: 24, h: 24, font: 12, border: 2 },
  };

  const { w, h, font, border } = sizeMap[size];
  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <View style={{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 4,
    }}>
      <LinearGradient
        colors={["#FF4B4B", "#D22A2A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          minWidth: w,
          height: h,
          borderRadius: h / 2,
          borderWidth: border,
          borderColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: count > 9 ? 4 : 0,
        }}
      >
        <Text style={{
          color: "#FFFFFF",
          fontSize: font,
          fontFamily: "Rubik-Bold",
          textAlign: "center",
          includeFontPadding: false,
        }}>
          {displayCount}
        </Text>
      </LinearGradient>
    </View>
  );
};

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  onPress,
  size = "medium",
  showZero = false,
}) => {
  const { unreadCount, loading } = useNotificationBadge();

  if (loading || (unreadCount === 0 && !showZero)) {
    return null;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ position: "relative" }}>
      <PremiumBadge count={unreadCount} size={size} />
    </TouchableOpacity>
  );
};

export const SimpleNotificationBadge: React.FC<{
  size?: "small" | "medium" | "large";
  showZero?: boolean;
}> = ({ size = "medium", showZero = false }) => {
  const { unreadCount, loading } = useNotificationBadge();

  if (loading || (unreadCount === 0 && !showZero)) {
    return null;
  }

  return <PremiumBadge count={unreadCount} size={size} />;
};

