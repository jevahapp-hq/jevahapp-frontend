import React, { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { notificationAPIService } from "../services/NotificationAPIService";

// This is a test component to help you test the notification system
// You can add this to any screen temporarily for testing
export const NotificationTestPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const testGetNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationAPIService.getNotifications(1, 10);
      Alert.alert(
        "Success",
        `Found ${response.notifications.length} notifications, ${response.unreadCount} unread`
      );
      console.log("📱 Notifications:", response);
    } catch (error) {
      Alert.alert("Error", `Failed to fetch notifications: ${error}`);
      console.error("❌ Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const testGetStats = async () => {
    setLoading(true);
    try {
      const stats = await notificationAPIService.getStats();
      Alert.alert("Stats", `Total: ${stats.total}, Unread: ${stats.unread}`);
      console.log("📊 Stats:", stats);
    } catch (error) {
      Alert.alert("Error", `Failed to fetch stats: ${error}`);
      console.error("❌ Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const testGetPreferences = async () => {
    setLoading(true);
    try {
      const preferences = await notificationAPIService.getPreferences();
      Alert.alert(
        "Preferences",
        `Push: ${preferences.pushEnabled}, Email: ${preferences.emailEnabled}`
      );
      console.log("⚙️ Preferences:", preferences);
    } catch (error) {
      Alert.alert("Error", `Failed to fetch preferences: ${error}`);
      console.error("❌ Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="bg-gray-100 p-4 m-4 rounded-lg">
      <Text className="text-lg font-bold mb-4">
        🔔 Notification System Test
      </Text>

      <TouchableOpacity
        onPress={testGetNotifications}
        disabled={loading}
        className="bg-blue-500 p-3 rounded-lg mb-2"
      >
        <Text className="text-white text-center font-semibold">
          {loading ? "Loading..." : "Test Get Notifications"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={testGetStats}
        disabled={loading}
        className="bg-green-500 p-3 rounded-lg mb-2"
      >
        <Text className="text-white text-center font-semibold">
          {loading ? "Loading..." : "Test Get Stats"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={testGetPreferences}
        disabled={loading}
        className="bg-purple-500 p-3 rounded-lg mb-2"
      >
        <Text className="text-white text-center font-semibold">
          {loading ? "Loading..." : "Test Get Preferences"}
        </Text>
      </TouchableOpacity>

      <Text className="text-xs text-gray-600 mt-2">
        Check console logs for detailed responses
      </Text>
    </View>
  );
};

