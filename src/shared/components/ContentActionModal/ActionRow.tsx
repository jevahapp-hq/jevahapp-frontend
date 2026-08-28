import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "../../constants";

interface ActionRowProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  /** Red destructive styling (Delete / Report) */
  destructive?: boolean;
}

export default function ActionRow({
  label,
  icon,
  onPress,
  destructive = false,
}: ActionRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: UI_CONFIG.COLORS.SURFACE,
        borderRadius: 12,
      }}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: destructive ? 36 : 40,
            height: destructive ? 36 : 40,
            backgroundColor: destructive
              ? "rgba(255, 107, 107, 0.1)"
              : UI_CONFIG.COLORS.PRIMARY,
            borderRadius: destructive ? 18 : 20,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "PlusJakartaSans-SemiBold",
            color: destructive
              ? UI_CONFIG.COLORS.ERROR
              : UI_CONFIG.COLORS.TEXT_PRIMARY,
          }}
        >
          {label}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={UI_CONFIG.COLORS.TEXT_SECONDARY}
      />
    </TouchableOpacity>
  );
}
