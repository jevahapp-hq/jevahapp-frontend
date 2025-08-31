import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthHeader from "../components/AuthHeader";
import { SafeImage } from "../components/SafeImage";

export default function NotificationsScreen() {
  const notificationsData = [
    {
      category: "New",
      items: [
        {
          name: "Joseph Eluwa",
          time: "3HRS AGO",
          message: "Wow! My Faith has just been renewed.",
          postTitle: "The art of seeing Miracles",
          postDescription: "A powerful teaching on supernatural breakthroughs.",
          avatar: undefined,
          postImage: require("../../assets/images/image (8).png"),
        },
        {
          name: "Grace Okafor",
          time: "2HRS AGO",
          message: "This blessed me beyond words!",
          postTitle: "Walking in Purpose",
          postDescription: "How to discover your God-given path.",
          avatar: undefined,
          postImage: require("../../assets/images/image (8).png"),
        },
        {
          name: "David King",
          time: "1HR AGO",
          message: "What a refreshing revelation!",
          postTitle: "Faith over Fear",
          postDescription: "Overcoming anxiety through scripture.",
          avatar: undefined,
          postImage: require("../../assets/images/image (8).png"),
        },
      ],
    },
    {
      category: "Last 7 days",
      items: [
        {
          name: "Ruth Allen",
          time: "2 DAYS AGO",
          message: "Shared this with my group!",
          postTitle: "Divine Acceleration",
          postDescription: "Experiencing rapid transformation through faith.",
          avatar: undefined,
          postImage: require("../../assets/images/image (8).png"),
        },
        {
          name: "Daniel Obi",
          time: "5 DAYS AGO",
          message: "The worship clip was 🔥",
          postTitle: "Heaven’s Sound",
          postDescription:
            "A session on heavenly worship encounters the reali life of my  family",
          avatar: undefined,
          postImage: require("../../assets/images/image (8).png"),
        },
      ],
    },
    {
      category: "Last 30 days",
      items: [
        {
          name: "Blessing Uche",
          time: "10 DAYS AGO",
          message: "This was exactly what I needed.",
          postTitle: "Healing Streams",
          postDescription: "A deep dive into biblical healing.",
          avatar: undefined,
          postImage: require("../../assets/images/image (8).png"),
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}

      <View className="px-4">
        <AuthHeader title="Notifications" />
      </View>

      {/* Scrollable Body */}
      <ScrollView
        className="px-7 bg-[#F3F3F4]"
        showsVerticalScrollIndicator={false}
      >
        {notificationsData.map((section, idx) => (
          <View key={idx} className="mt-5">
            <Text className="text-[#1D2939] font-rubik-semibold mb-2">
              {section.category}
            </Text>
            {section.items.map((item, i) => (
              <View
                key={i}
                className="bg-white rounded-[10px] shadow-sm p-3 h-[215px] mb-4 "
              >
                <Text className="text-[#475467] mb-1 font-medium">
                  Activity:
                </Text>

                <View className="flex-row items-center mb-2">
                  <SafeImage
                    uri={item.avatar || undefined}
                    className="w-6 h-6 rounded-full mr-2"
                    fallbackText={item.name?.[0]?.toUpperCase() || 'U'}
                    showFallback={true}
                  />
                  <Text className="font-rubik-semibold text-[#667085] text-[12px]">
                    {item.name}
                  </Text>
                  <View className="flex-row items-center ml-3">
                    <Text className="text-[#FFD9B3] text-[18px] text-xs font-rubik">
                      •
                    </Text>
                    <Text className="text-xs text-[#667085] font-rubik ml-1">
                      {item.time}
                    </Text>
                  </View>
                </View>

                <Text className="mb-2 ml-8 text-[#1D2939] font-rubik">
                  {item.message}
                </Text>

                <TouchableOpacity>
                  <Text className="text-[#256E63] font-bold text-xs ml-8">
                    REPLY
                  </Text>
                </TouchableOpacity>

                <View className="mt-3 flex-row items-start space-x-3 bg-[#F3F3F4] rounded-md p-3">
                  <Image
                    source={item.postImage}
                    className="w-14 h-14 rounded-md"
                  />
                  <View className="flex-1 ml-3">
                    <Text className="font-rubik-semibold text-[#1D2939]">
                      {item.postTitle}
                    </Text>
                    <Text
                      className="text-[#667085] font-rubik text-sm"
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {item.postDescription}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
