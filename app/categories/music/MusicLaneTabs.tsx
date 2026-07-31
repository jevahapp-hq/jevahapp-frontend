import { Text, TouchableOpacity, View } from "react-native";

export type MusicLane = "copyright-free" | "artists";

type Props = {
  lane: MusicLane;
  onChange: (lane: MusicLane) => void;
};

export function MusicLaneTabs({ lane, onChange }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: "#F3F4F6",
        borderRadius: 999,
        padding: 4,
      }}
    >
      {(
        [
          { id: "copyright-free" as const, label: "Copyright-free" },
          { id: "artists" as const, label: "Artists" },
        ] as const
      ).map((tab) => {
        const active = lane === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.85}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: active ? "#0A332D" : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Rubik_500Medium",
                fontSize: 13,
                color: active ? "#fff" : "#4B5563",
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
