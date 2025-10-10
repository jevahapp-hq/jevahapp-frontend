import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

type SearchBarProps = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search for anything...",
}: SearchBarProps) {
  return (
    <View
      className="flex-row items-center px-2 bg-[#E5E5EA] rounded-xl h-[42px]"
      style={{ width: 360 }}
    >
      <View className="ml-2">
        <Ionicons name="search" size={20} color="#666" />
      </View>
      <TextInput
        placeholder={placeholder}
        className="ml-3 flex-1 text-base font-rubik"
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}

