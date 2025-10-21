import { Ionicons } from "@expo/vector-icons";
import { Lock, Pencil } from "lucide-react-native";
import { Image, Modal, Pressable, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

type ProfileSwitchModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function ProfileSwitchModal({ visible, onClose }: ProfileSwitchModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/30 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-[#FCFCFD] rounded-t-3xl p-6">
              {/* Close Button */}
              <TouchableOpacity onPress={onClose} className="self-end mb-4">
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>

              {/* Title */}
              <Text className="text-xl font-bold text-center text-gray-900 mb-6">Switch Profile</Text>

              {/* Profiles */}
              <View className="flex-row justify-between">
                {/* Adult Profile */}
                <Pressable onPress={onClose} className="items-center rounded-xl p-4 w-[48%]">
                  <View className="relative mb-3">
                    <Image
                      source={require("../../../assets/images/image (4).png")}
                      className="w-24 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                  </View>
                  <Text className="text-sm font-semibold mt-2 text-gray-800">ADULTS</Text>
                  <Text className="text-xs text-gray-400">Name your profile</Text>
                  <View className="flex-row space-x-2 mt-2">
                    <View className="bg-gray-100 p-2 rounded-full">
                      <Lock size={14} />
                    </View>
                    <View className="bg-gray-100 p-2 rounded-full">
                      <Pencil size={14} />
                    </View>
                  </View>
                </Pressable>

                {/* Kids Profile */}
                <Pressable onPress={onClose} className="items-center rounded-xl p-4 w-[48%]">
                  <View className="relative mb-3">
                    <Image
                      source={require("../../../assets/images/Asset 37 (2).png")}
                      className="w-24 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                  </View>
                  <Text className="text-sm font-semibold mt-2 text-gray-800">KIDS</Text>
                  <Text className="text-xs text-gray-400">Name your profile</Text>
                  <View className="flex-row space-x-2 mt-2">
                    <View className="bg-gray-100 p-2 rounded-full">
                      <Lock size={14} />
                    </View>
                    <View className="bg-gray-100 p-2 rounded-full">
                      <Pencil size={14} />
                    </View>
                  </View>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}




