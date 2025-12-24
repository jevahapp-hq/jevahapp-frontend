import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

type ComingSoonModalProps = {
  visible: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
};

export default function ComingSoonModal({
  visible,
  title = "Coming soon",
  description = "This feature is not available yet. We're working on it and it will arrive in a future update.",
  onClose,
}: ComingSoonModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <TouchableWithoutFeedback>
            <View className="w-full max-w-[420px] bg-white rounded-2xl p-5 border border-gray-100">
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-[#256E63]/10 items-center justify-center mb-3">
                  <Ionicons name="sparkles-outline" size={24} color="#256E63" />
                </View>

                <Text className="text-[18px] font-rubik-semibold text-gray-900 text-center">
                  {title}
                </Text>

                <Text className="text-[13px] font-rubik text-gray-600 text-center mt-2 leading-5">
                  {description}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                className="mt-5 bg-[#256E63] rounded-full py-3 items-center"
              >
                <Text className="text-white font-rubik-semibold text-[14px]">
                  Got it
                </Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}



