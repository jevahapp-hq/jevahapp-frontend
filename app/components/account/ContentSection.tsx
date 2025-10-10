import { Image, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Analytics = {
  total?: number | string;
  likes?: number | string;
  liveSessions?: number | string;
  comments?: number | string;
  drafts?: number | string;
  shares?: number | string;
};

type ContentSectionProps = {
  selectedIndex: number;
  analytics?: Analytics;
};

const tabImages: Record<number, any[]> = {
  0: [
    require("../../../assets/images/image (4).png"),
    require("../../../assets/images/Asset 37 (2).png"),
    require("../../../assets/images/image (4).png"),
  ],
  1: [
    require("../../../assets/images/Asset 37 (2).png"),
    require("../../../assets/images/image (4).png"),
    require("../../../assets/images/Asset 37 (2).png"),
  ],
  2: [
    require("../../../assets/images/image (4).png"),
    require("../../../assets/images/image (4).png"),
    require("../../../assets/images/Asset 37 (2).png"),
  ],
};

export default function ContentSection({ selectedIndex, analytics }: ContentSectionProps) {
  const defaultAnalytics = {
    total: "1200",
    likes: "16.8k",
    liveSessions: "32",
    comments: "20k",
    drafts: "25",
    shares: "0",
  } as const;

  const merged = {
    total: analytics?.total ?? defaultAnalytics.total,
    likes: analytics?.likes ?? defaultAnalytics.likes,
    liveSessions: analytics?.liveSessions ?? defaultAnalytics.liveSessions,
    comments: analytics?.comments ?? defaultAnalytics.comments,
    drafts: analytics?.drafts ?? defaultAnalytics.drafts,
    shares: analytics?.shares ?? defaultAnalytics.shares,
  };

  return (
    <View className="px-4 mb-8">
      {selectedIndex !== 3 ? (
        <View className="flex-row justify-between">
          {tabImages[selectedIndex]?.map((imgSrc, index) => (
            <View key={`tile-${selectedIndex}-${index}`} className="flex-1 mx-1">
              <View className="aspect-square bg-gray-200 rounded-lg mb-2 overflow-hidden">
                <Image source={imgSrc} className="w-full h-full" resizeMode="cover" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View>
          {[
            { icon: "albums-outline", label: "Posts", value: merged.total, sub: "Total published posts" },
            { icon: "heart-outline", label: "Likes", value: merged.likes, sub: 'Number of "Like" engagements on all posts' },
            { icon: "radio-outline", label: "Live sessions", value: merged.liveSessions, sub: "Number of times you went Live" },
            { icon: "chatbubble-ellipses-outline", label: "Comments", value: merged.comments, sub: 'Number of "comments" on all posts' },
            { icon: "document-text-outline", label: "Drafts", value: merged.drafts, sub: "Unpublished posts" },
            { icon: "share-social-outline", label: "Shares", value: merged.shares, sub: "Number of times people shared your contents" },
          ].map((row, idx) => (
            <View
              key={`row-${idx}`}
              className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4"
              style={{ shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, marginBottom: 16 }}
            >
              <View className="flex-row items-center">
                <Ionicons name={row.icon as any} size={18} color="#0A332D" />
                <View className="ml-3">
                  <Text className="text-[#111827] font-semibold">{row.label}</Text>
                  <Text className="text-[#6B7280] text-xs">{row.sub}</Text>
                </View>
              </View>
              <Text className="text-[#111827] font-semibold">{String(row.value)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}



