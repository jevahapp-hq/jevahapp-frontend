import { Text, TouchableOpacity, View } from "react-native";
import type { CreatorType } from "../../services/creators/types";

const OPTIONS: { value: CreatorType; label: string }[] = [
  { value: "artist", label: "Artist" },
  { value: "minister", label: "Minister" },
  { value: "podcaster", label: "Podcaster" },
];

type Props = {
  selected: CreatorType[];
  onChange: (next: CreatorType[]) => void;
};

export function CreatorTypeChips({ selected, onChange }: Props) {
  const toggle = (value: CreatorType) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {OPTIONS.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => toggle(opt.value)}
            activeOpacity={0.8}
            className="px-4 py-2 rounded-full"
            style={{
              backgroundColor: active ? "#0A332D" : "#F3F4F6",
              borderWidth: 1,
              borderColor: active ? "#0A332D" : "#E5E7EB",
            }}
          >
            <Text
              className="font-medium text-sm"
              style={{ color: active ? "#fff" : "#374151" }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
