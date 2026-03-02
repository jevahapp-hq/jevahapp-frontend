import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationBadge } from "./NotificationBadge";

// Demo component to show how the notification badge works
export const NotificationBadgeDemo: React.FC = () => {
  const { unreadCount, markAllAsRead } = useNotifications();

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  return (
    <View className="bg-white p-4 m-4 rounded-lg border">
      <Text className="text-lg font-bold mb-4">🔔 Notification Badge Demo</Text>

      {/* Show current unread count */}
      <View className="mb-4">
        <Text className="text-sm text-gray-600">
          Current unread notifications:{" "}
          <Text className="font-bold">{unreadCount}</Text>
        </Text>
      </View>

      {/* Show different badge sizes */}
      <View className="flex-row items-center space-x-4 mb-4">
        <Text className="text-sm">Small:</Text>
        <NotificationBadge
          size="small"
          onPress={() => console.log("Small badge clicked")}
        />

        <Text className="text-sm">Medium:</Text>
        <NotificationBadge
          size="medium"
          onPress={() => console.log("Medium badge clicked")}
        />

        <Text className="text-sm">Large:</Text>
        <NotificationBadge
          size="large"
          onPress={() => console.log("Large badge clicked")}
        />
      </View>

      {/* Test button to mark all as read */}
      {unreadCount > 0 && (
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          className="bg-red-500 p-2 rounded-lg"
        >
          <Text className="text-white text-center font-semibold">
            Mark All as Read (Badge will disappear)
          </Text>
        </TouchableOpacity>
      )}

      {/* Instructions */}
      <View className="mt-4 p-3 bg-gray-100 rounded-lg">
        <Text className="text-sm text-gray-700">
          <Text className="font-bold">How it works:</Text>
          {"\n"}• Badge shows red circle with unread count
          {"\n"}• Click badge to navigate to notifications
          {"\n"}• Badge disappears when all notifications are read
          {"\n"}• Updates in real-time via Socket.IO
        </Text>
      </View>
    </View>
  );
};

