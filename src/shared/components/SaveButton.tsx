import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Text, TouchableOpacity, ViewStyle } from "react-native";

type Props = {
  contentId: string;
  saved: boolean;
  savesCount: number;
  onToggleSave: () => void;
  style?: ViewStyle;
};

export default function SaveButton({
  contentId,
  saved,
  savesCount,
  onToggleSave,
  style,
}: Props) {
  return (
    <TouchableOpacity
      onPress={() => {
        const wasSaved = Boolean(saved);
        onToggleSave();
        const message = wasSaved ? "Removed from library" : "Saved to library";
        try {
          Alert.alert("Library", message);
        } catch {}
      }}
      style={style as any}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      className="flex-row items-center"
    >
      <Ionicons
        name={saved ? ("bookmark" as any) : ("bookmark-outline" as any)}
        size={26}
        color={saved ? "#FEA74E" : "#98A2B3"}
      />
      <Text className="text-[10px] text-gray-500 ml-1">{savesCount || 0}</Text>
    </TouchableOpacity>
  );
}


