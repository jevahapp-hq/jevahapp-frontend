import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import type { DisplayMode } from "../types";

type DisplayModeToggleProps = {
  displayMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
};

export function DisplayModeToggle({
  displayMode,
  onChange,
}: DisplayModeToggleProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        padding: 4,
        gap: 4,
      }}
    >
      {(["list", "grid", "small", "large"] as DisplayMode[]).map((mode) => (
        <TouchableOpacity
          key={mode}
          onPress={() => onChange(mode)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: displayMode === mode ? "#256E63" : "transparent",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons
            name={
              mode === "list"
                ? "list"
                : mode === "grid"
                  ? "grid"
                  : mode === "small"
                    ? "apps"
                    : "square"
            }
            size={18}
            color={displayMode === mode ? "#FFFFFF" : "#98A2B3"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
