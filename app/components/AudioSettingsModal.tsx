import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Slider,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAudioManager } from "../hooks/useAudioManager";

interface AudioSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AudioSettingsModal({
  visible,
  onClose,
}: AudioSettingsModalProps) {
  const { audioState, setMute, setVolume, setGlobalMute, reset } =
    useAudioManager();
  const [localVolume, setLocalVolume] = useState(audioState.volume);
  const [localMute, setLocalMute] = useState(audioState.isMuted);
  const [localGlobalMute, setLocalGlobalMute] = useState(
    audioState.globalMuteEnabled
  );

  const handleVolumeChange = async (value: number) => {
    setLocalVolume(value);
    await setVolume(value);
  };

  const handleMuteToggle = async () => {
    const newMuteState = !localMute;
    setLocalMute(newMuteState);
    await setMute(newMuteState);
  };

  const handleGlobalMuteToggle = async () => {
    const newGlobalMuteState = !localGlobalMute;
    setLocalGlobalMute(newGlobalMuteState);
    await setGlobalMute(newGlobalMuteState);
  };

  const handleReset = async () => {
    await reset();
    setLocalVolume(1.0);
    setLocalMute(false);
    setLocalGlobalMute(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-900">
              Audio Settings
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Volume Control */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-gray-800">
                Volume
              </Text>
              <Text className="text-sm text-gray-600">
                {Math.round(localVolume * 100)}%
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="volume-low" size={20} color="#666" />
              <Slider
                style={{ flex: 1, marginHorizontal: 10 }}
                minimumValue={0}
                maximumValue={1}
                value={localVolume}
                onValueChange={handleVolumeChange}
                minimumTrackTintColor="#FEA74E"
                maximumTrackTintColor="#E5E5EA"
                thumbStyle={{ backgroundColor: "#FEA74E" }}
              />
              <Ionicons name="volume-high" size={20} color="#666" />
            </View>
          </View>

          {/* Mute Controls */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Ionicons
                  name={localMute ? "volume-mute" : "volume-high"}
                  size={20}
                  color={localMute ? "#FF6B6B" : "#666"}
                />
                <Text className="ml-2 text-lg font-semibold text-gray-800">
                  Mute Audio
                </Text>
              </View>
              <Switch
                value={localMute}
                onValueChange={handleMuteToggle}
                trackColor={{ false: "#E5E5EA", true: "#FF6B6B" }}
                thumbColor={localMute ? "#FFFFFF" : "#FFFFFF"}
              />
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={localGlobalMute ? "#FF6B6B" : "#666"}
                />
                <Text className="ml-2 text-lg font-semibold text-gray-800">
                  Global Mute
                </Text>
                <View className="ml-2 w-2 h-2 bg-red-500 rounded-full" />
              </View>
              <Switch
                value={localGlobalMute}
                onValueChange={handleGlobalMuteToggle}
                trackColor={{ false: "#E5E5EA", true: "#FF6B6B" }}
                thumbColor={localGlobalMute ? "#FFFFFF" : "#FFFFFF"}
              />
            </View>
            <Text className="text-sm text-gray-500 mt-2">
              Global mute affects all videos across the app
            </Text>
          </View>

          {/* Audio Session Info */}
          <View className="mb-6 p-4 bg-gray-50 rounded-lg">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Current Audio State:
            </Text>
            <Text className="text-sm text-gray-600">
              • Volume: {Math.round(audioState.volume * 100)}%
            </Text>
            <Text className="text-sm text-gray-600">
              • Muted: {audioState.isMuted ? "Yes" : "No"}
            </Text>
            <Text className="text-sm text-gray-600">
              • Global Mute:{" "}
              {audioState.globalMuteEnabled ? "Enabled" : "Disabled"}
            </Text>
            <Text className="text-sm text-gray-600">
              • Last Mute State:{" "}
              {audioState.lastMuteState ? "Muted" : "Unmuted"}
            </Text>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            onPress={handleReset}
            className="bg-gray-200 py-3 px-4 rounded-lg items-center"
          >
            <Text className="text-gray-700 font-semibold">
              Reset to Default
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

