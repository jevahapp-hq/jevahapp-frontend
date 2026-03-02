import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface InfoCardProps {
  onClose?: () => void;
  text: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  backgroundColor?: string;
  textColor?: string;
}

export default function SuccessfulCard({
  onClose,
  text,
  icon = "check-circle",
  backgroundColor = "#039855",
  textColor = "white",
}: InfoCardProps) {
  return (
    <View
      className="flex-row items-center justify-between w-[300px] h-[40px] rounded-lg px-4"
      style={{ backgroundColor }}
    >
      <View className="flex-row items-center">
        <MaterialIcons name={icon} size={24} color={textColor} />
        <Text className="ml-4 font-medium" style={{ color: textColor }}>
          {text}
        </Text>
      </View>
      <TouchableOpacity onPress={onClose}>
        <MaterialIcons name="close" size={24} color={textColor} />
      </TouchableOpacity>
    </View>
  );
}
