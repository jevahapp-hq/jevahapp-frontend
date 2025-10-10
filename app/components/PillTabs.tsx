import { Text, TouchableOpacity, View } from "react-native";

type PillTabsProps = {
  tabs: string[];
  value: string;
  onChange: (tab: string) => void;
};

export default function PillTabs({ tabs, value, onChange }: PillTabsProps) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {tabs.map((tab) => {
        const active = value === tab;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onChange(tab)}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: active ? "black" : "white",
              borderWidth: active ? 0 : 1,
              borderColor: active ? "transparent" : "#6B6E7C",
              minWidth: 48,
              minHeight: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: active ? "white" : "#1D2939",
                fontFamily: "Rubik_600SemiBold",
                fontSize: 14,
              }}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

