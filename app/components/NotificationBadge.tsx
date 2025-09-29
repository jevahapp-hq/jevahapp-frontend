import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useNotificationBadge } from "../hooks/useNotifications";

interface NotificationBadgeProps {
  onPress?: () => void;
  size?: "small" | "medium" | "large";
  showZero?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  onPress,
  size = "medium",
  showZero = false,
}) => {
  const { unreadCount, loading } = useNotificationBadge();

  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-6 h-6",
    large: "w-8 h-8",
  };

  const textSizeClasses = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
  };

  const minWidthClasses = {
    small: "min-w-4",
    medium: "min-w-6",
    large: "min-w-8",
  };

  if (loading) {
    return null;
  }

  if (unreadCount === 0 && !showZero) {
    return null;
  }

  return (
    <TouchableOpacity onPress={onPress} className="relative">
      <View
        className={`${sizeClasses[size]} ${
          minWidthClasses[size]
        } bg-red-500 rounded-full justify-center items-center ${
          unreadCount > 9 ? "px-1" : ""
        }`}
      >
        <Text className={`${textSizeClasses[size]} text-white font-bold`}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// Simple badge without touch functionality
export const SimpleNotificationBadge: React.FC<{
  size?: "small" | "medium" | "large";
  showZero?: boolean;
}> = ({ size = "medium", showZero = false }) => {
  const { unreadCount, loading } = useNotificationBadge();

  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-6 h-6",
    large: "w-8 h-8",
  };

  const textSizeClasses = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base",
  };

  const minWidthClasses = {
    small: "min-w-4",
    medium: "min-w-6",
    large: "min-w-8",
  };

  if (loading) {
    return null;
  }

  if (unreadCount === 0 && !showZero) {
    return null;
  }

  return (
    <View
      className={`${sizeClasses[size]} ${
        minWidthClasses[size]
      } bg-red-500 rounded-full justify-center items-center ${
        unreadCount > 9 ? "px-1" : ""
      }`}
    >
      <Text className={`${textSizeClasses[size]} text-white font-bold`}>
        {unreadCount > 99 ? "99+" : unreadCount}
      </Text>
    </View>
  );
};

