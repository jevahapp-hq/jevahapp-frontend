import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Feather } from "@expo/vector-icons";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  convertToDownloadableItem,
  useDownloadHandler,
} from "../../../utils/downloadUtils";
import { useDownloadStore } from "../../../store/useDownloadStore";
import { RecommendedItem } from "../types";

export interface MiniCardRowProps {
  title: string;
  items: RecommendedItem[];
  modalIndex: number | null;
  setModalIndex: (index: number | null) => void;
  onDownloadSuccess: (message: string) => void;
}

export default function MiniCardRow({
  title,
  items,
  modalIndex,
  setModalIndex,
  onDownloadSuccess,
}: MiniCardRowProps) {
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();

  return (
    <View className="mt-9 mb-3">
      <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-3 ">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {items.map((item, index) => (
          <View
            key={`${title}-${item.title}-${index}`}
            className="mr-4 w-[154px] flex-col items-center"
          >
            <TouchableOpacity
              onPress={item.onPress}
              className="w-full h-[232px] rounded-2xl overflow-hidden relative"
              activeOpacity={0.9}
            >
              <Image
                source={item.imageUrl}
                className="w-full h-full absolute"
                resizeMode="cover"
              />
              <View className="absolute inset-0 justify-center items-center">
                <View className="bg-white/70 p-2 rounded-full">
                  <Ionicons name="play" size={24} color="#FEA74E" />
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
            {modalIndex === index && (
              <>
                <TouchableWithoutFeedback onPress={() => setModalIndex(null)}>
                  <View className="absolute inset-0 z-40" />
                </TouchableWithoutFeedback>
                <View className="absolute mt-[26px] left-1 bg-white shadow-md rounded-lg p-3 z-50 w-30">
                  <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                    <Text className="text-[#1D2939] font-rubik ml-2">
                      View Details
                    </Text>
                    <Ionicons name="eye-outline" size={16} color="##3A3E50" />
                  </TouchableOpacity>
                  <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                    <Text className="text-sm text-[#1D2939] font-rubik ml-2">
                      Share
                    </Text>
                    <AntDesign name="share-alt" size={16} color="#3A3E50" />
                  </TouchableOpacity>
                  <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                    <Text className="text-[#1D2939] font-rubik mr-2">
                      Save to Library
                    </Text>
                    <MaterialIcons
                      name="library-add"
                      size={18}
                      color="#3A3E50"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="py-2 flex-row items-center justify-between"
                    onPress={async () => {
                      const contentType = item.fileUrl?.includes(".mp4")
                        ? "video"
                        : "audio";
                      const downloadableItem = convertToDownloadableItem(
                        item,
                        contentType
                      );
                      const result = await handleDownload(downloadableItem);
                      if (result.success) {
                        setModalIndex(null);
                        onDownloadSuccess("Downloaded successfully!");
                        await loadDownloadedItems();
                      }
                    }}
                  >
                    <Text className="text-[#1D2939] font-rubik ml-2">
                      {checkIfDownloaded((item as any)._id || item.fileUrl)
                        ? "Downloaded"
                        : "Download"}
                    </Text>
                    <Ionicons
                      name={
                        checkIfDownloaded((item as any)._id || item.fileUrl)
                          ? "checkmark-circle"
                          : "download-outline"
                      }
                      size={16}
                      color={
                        checkIfDownloaded((item as any)._id || item.fileUrl)
                          ? "#256E63"
                          : "#3A3E50"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
            <View className="mt-2 flex flex-col w-full">
              <View className="flex flex-row justify-between items-center">
                <Text
                  className="text-[12px] text-[#1D2939] font-rubik font-medium"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.subTitle?.split(" ").slice(0, 4).join(" ") + " ..."}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setModalIndex(modalIndex === index ? null : index)
                  }
                  className="mr-2"
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={14}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center">
                <Feather name="eye" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik">
                  {item.views}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
