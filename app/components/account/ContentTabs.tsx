import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

type TabDef = { icon: any; label: string };

type ContentTabsProps = {
  selectedIndex: number;
  onSelect: (index: number) => void;
  tabs?: TabDef[];
};

const defaultTabs: TabDef[] = [
  { icon: "grid-outline", label: "Posts" },
  { icon: "camera-outline", label: "Media" },
  { icon: "play-outline", label: "Videos" },
  { icon: "stats-chart-outline", label: "Analytics" },
];

export default function ContentTabs({
  selectedIndex,
  onSelect,
  tabs = defaultTabs,
}: ContentTabsProps) {
  return (
    <View className="px-4 mt-0 mb-3">
      <View className="bg-gray-200 rounded-xl px-2 py-1 flex-row items-center justify-between w-10/12 self-center">
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onSelect(index)}
            className={`flex-1 h-8 mx-1 rounded-md items-center justify-center`}
            activeOpacity={0.7}
            style={selectedIndex === index ? { backgroundColor: "#0A332D" } : {}}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={selectedIndex === index ? "white" : "#4B5563"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}




