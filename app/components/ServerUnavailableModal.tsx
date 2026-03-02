import { Ionicons } from '@expo/vector-icons';
import { Alert, Modal, Text, TouchableOpacity, View } from 'react-native';

interface ServerUnavailableModalProps {
  visible: boolean;
  onRetry: () => void;
  onDismiss: () => void;
  errorMessage?: string;
}

export default function ServerUnavailableModal({
  visible,
  onRetry,
  onDismiss,
  errorMessage = "Unable to connect to server"
}: ServerUnavailableModalProps) {
  const handleRetry = () => {
    onRetry();
    onDismiss();
  };

  const handleCheckConnection = () => {
    Alert.alert(
      "Connection Issues",
      "Please check:\n\n• Your internet connection\n• Try switching between WiFi and mobile data\n• The server may be temporarily down\n\nIf the problem persists, please try again later.",
      [{ text: "OK" }]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          {/* Icon */}
          <View className="items-center mb-4">
            <View className="bg-red-100 p-4 rounded-full">
              <Ionicons name="cloud-offline" size={48} color="#EF4444" />
            </View>
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            Server Unavailable
          </Text>

          {/* Message */}
          <Text className="text-gray-600 text-center mb-6 leading-5">
            {errorMessage}. Please check your internet connection and try again.
          </Text>

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              onPress={handleRetry}
              className="bg-blue-600 py-4 px-6 rounded-xl flex-row items-center justify-center"
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCheckConnection}
              className="bg-gray-100 py-3 px-6 rounded-xl flex-row items-center justify-center"
            >
              <Ionicons name="help-circle" size={18} color="#6B7280" />
              <Text className="text-gray-600 font-medium ml-2">Connection Help</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDismiss}
              className="py-3 px-6 rounded-xl"
            >
              <Text className="text-gray-500 text-center font-medium">Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

