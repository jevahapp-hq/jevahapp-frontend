import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";

export type HymnItem = {
  id: string;
  title: string;
  author?: string;
  meter?: string;
  refs?: string;
};

type Props = {
  item: HymnItem;
  onPress?: (item: HymnItem) => void;
};

export default function HymnMiniCard({ item, onPress }: Props) {
  return (
    <View key={item.id} className="mr-4 w-[154px] flex-col items-center">
      <TouchableOpacity
        onPress={() => onPress?.(item)}
        className="w-full h-[232px] rounded-2xl overflow-hidden relative"
        activeOpacity={0.9}
      >
        <Image
          source={require("../../../assets/images/image (13).png")}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/60" />
        <View className="absolute inset-0 justify-center items-center">
          <View className="bg-white/70 p-2 rounded-full">
            <Ionicons name="book" size={24} color="#FEA74E" />
          </View>
        </View>
        <View className="absolute bottom-2 left-2 right-2">
          <Text
            className="text-white text-start text-[14px] ml-1 mb-6 font-rubik"
            numberOfLines={2}
          >
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
      <View className="mt-2 flex flex-col w-full">
        <View className="flex flex-row justify-between items-center">
          <Text
            className="text-[12px] text-[#1D2939] font-rubik font-medium"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {(item.author || "Unknown").toString()}
          </Text>
          <Ionicons name="ellipsis-vertical" size={14} color="#9CA3AF" />
        </View>
        <View className="flex-row items-center">
          <Ionicons name="book-outline" size={13} color="#98A2B3" />
          <Text
            className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik"
            numberOfLines={1}
          >
            {(item.meter || item.refs || "Hymn").toString()}
          </Text>
        </View>
      </View>
    </View>
  );
}
