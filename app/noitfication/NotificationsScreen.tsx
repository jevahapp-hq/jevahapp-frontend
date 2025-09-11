import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthHeader from "../components/AuthHeader";
import { SafeImage } from "../components/SafeImage";
import { useNotifications } from "../context/PersistentNotificationContext";

export default function NotificationsScreen() {
  const {
    notifications,
    unreadNotifications,
    badge,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    formatTime,
    getIcon,
    getColor,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      Alert.alert("Success", "All notifications marked as read");
    } catch (error) {
      Alert.alert("Error", "Failed to mark notifications as read");
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to clear all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllNotifications();
              Alert.alert("Success", "All notifications cleared");
            } catch (error) {
              Alert.alert("Error", "Failed to clear notifications");
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    // TODO: Navigate to relevant content or user profile
  };

  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNotification(notificationId);
            } catch (error) {
              Alert.alert("Error", "Failed to delete notification");
            }
          },
        },
      ]
    );
  };

  const renderNotificationItem = (notification: any) => (
    <View
      key={notification.id}
      className={`bg-white rounded-[10px] shadow-sm p-3 mb-4 ${
        !notification.read ? "border-l-4 border-blue-500" : ""
      }`}
    >
      <TouchableOpacity
        onPress={() => handleNotificationPress(notification)}
        onLongPress={() => handleDeleteNotification(notification.id)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-start">
          {/* Notification Icon */}
          <View
            className="w-8 h-8 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${getColor(notification.type)}20` }}
          >
            <Ionicons
              name={getIcon(notification.type) as any}
              size={16}
              color={getColor(notification.type)}
            />
          </View>

          {/* Notification Content */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-rubik-semibold text-[#1D2939] text-sm">
                {notification.title}
              </Text>
              <Text className="text-xs text-[#667085] font-rubik">
                {formatTime(notification.timestamp)}
              </Text>
            </View>

            <Text className="text-[#475467] text-sm font-rubik mb-2">
              {notification.message}
            </Text>

            {/* User Info */}
            {notification.userName && (
              <View className="flex-row items-center">
                <SafeImage
                  uri={notification.avatar}
                  className="w-5 h-5 rounded-full mr-2"
                  fallbackText={
                    notification.userName?.[0]?.toUpperCase() || "U"
                  }
                  showFallback={true}
                />
                <Text className="font-rubik-medium text-[#667085] text-xs">
                  {notification.userName}
                </Text>
              </View>
            )}

            {/* Unread Indicator */}
            {!notification.read && (
              <View className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
      <Text className="text-[#6B7280] text-lg font-rubik-semibold mt-4">
        No Notifications
      </Text>
      <Text className="text-[#9CA3AF] text-sm font-rubik text-center mt-2 px-8">
        You'll see notifications here when someone likes, comments, or shares
        your content.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color="#6366F1" />
      <Text className="text-[#6B7280] text-sm font-rubik mt-4">
        Loading notifications...
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4">
        <View className="flex-row items-center justify-between">
          <AuthHeader title="Notifications" />

          {/* Action Buttons */}
          <View className="flex-row items-center space-x-2">
            {badge.hasUnread && (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                className="bg-blue-500 px-3 py-1 rounded-full"
              >
                <Text className="text-white text-xs font-rubik-semibold">
                  Mark All Read
                </Text>
              </TouchableOpacity>
            )}

            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={handleClearAll}
                className="bg-gray-500 px-3 py-1 rounded-full"
              >
                <Text className="text-white text-xs font-rubik-semibold">
                  Clear All
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Badge Info */}
      {badge.hasUnread && (
        <View className="mx-4 mb-4 bg-blue-50 p-3 rounded-lg">
          <Text className="text-blue-800 text-sm font-rubik-semibold">
            {badge.count} unread notification{badge.count !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView
        className="px-4 bg-[#F3F3F4]"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#6366F1"]}
            tintColor="#6366F1"
          />
        }
      >
        {loading ? (
          renderLoadingState()
        ) : notifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <View className="mt-2">
            {/* Recent Notifications */}
            {unreadNotifications.length > 0 && (
              <View className="mb-4">
                <Text className="text-[#1D2939] font-rubik-semibold mb-2">
                  Recent ({unreadNotifications.length})
                </Text>
                {unreadNotifications.map(renderNotificationItem)}
              </View>
            )}

            {/* Older Notifications */}
            {notifications.filter((n) => n.read).length > 0 && (
              <View>
                <Text className="text-[#1D2939] font-rubik-semibold mb-2">
                  Earlier
                </Text>
                {notifications
                  .filter((n) => n.read)
                  .map(renderNotificationItem)}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
