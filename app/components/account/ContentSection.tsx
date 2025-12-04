import { Image, Text, View, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAccountContent } from "../../hooks/useAccountContent";
import type { Post, MediaItem, Video } from "../../types/account.types";

type ContentSectionProps = {
  selectedIndex: number;
};

export default function ContentSection({ selectedIndex }: ContentSectionProps) {
  const {
    posts,
    media,
    videos,
    analytics,
    loading,
    error,
    loadMorePosts,
    loadMoreMedia,
    loadMoreVideos,
  } = useAccountContent();

  // Format number for display (e.g., 16800 -> "16.8k")
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // Format duration (seconds to MM:SS)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading && selectedIndex !== 3) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <ActivityIndicator size="large" color="#FEA74E" />
      </View>
    );
  }

  if (error && selectedIndex !== 3) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-red-500">{error}</Text>
      </View>
    );
  }

  // Posts Tab (Index 0)
  if (selectedIndex === 0) {
    const renderPostItem = ({ item }: { item: Post }) => {
      const thumbnailUrl = item.media?.[0]?.thumbnail || item.media?.[0]?.url;

      return (
        <TouchableOpacity
          className="w-[32%] mb-2 aspect-square"
          onPress={() => {
            // Navigate to post detail
            // navigation.navigate('PostDetail', { postId: item._id });
          }}
        >
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              className="w-full h-full rounded-lg"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full rounded-lg bg-gray-200 items-center justify-center">
              <Ionicons name="image-outline" size={32} color="#999" />
            </View>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View className="items-center justify-center py-8">
            <Text className="text-gray-500">No posts yet</Text>
          </View>
        }
      />
    );
  }

  // Media Tab (Index 1)
  if (selectedIndex === 1) {
    const renderMediaItem = ({ item }: { item: MediaItem }) => {
      return (
        <TouchableOpacity
          className="w-[32%] mb-2 aspect-square"
          onPress={() => {
            // Navigate to media detail
          }}
        >
          <Image
            source={{ uri: item.thumbnail || item.url }}
            className="w-full h-full rounded-lg"
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    };

    return (
      <FlatList
        data={media}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        onEndReached={loadMoreMedia}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View className="items-center justify-center py-8">
            <Text className="text-gray-500">No media yet</Text>
          </View>
        }
      />
    );
  }

  // Videos Tab (Index 2)
  if (selectedIndex === 2) {
    const renderVideoItem = ({ item }: { item: Video }) => {
      return (
        <TouchableOpacity
          className="w-[32%] mb-2 aspect-square relative"
          onPress={() => {
            // Navigate to video player
          }}
        >
          <Image
            source={{ uri: item.thumbnail || item.url }}
            className="w-full h-full rounded-lg"
            resizeMode="cover"
          />
          <View className="absolute inset-0 items-center justify-center">
            <Ionicons name="play-circle" size={40} color="white" />
          </View>
          {item.duration && (
            <View className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded">
              <Text className="text-white text-xs">
                {formatDuration(item.duration)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item._id}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        onEndReached={loadMoreVideos}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View className="items-center justify-center py-8">
            <Text className="text-gray-500">No videos yet</Text>
          </View>
        }
      />
    );
  }

  // Analytics Tab (Index 3)
  if (selectedIndex === 3) {
    if (!analytics) {
      return (
        <View className="flex-1 items-center justify-center py-8">
          <ActivityIndicator size="large" color="#FEA74E" />
        </View>
      );
    }

    const analyticsMetrics = [
      {
        icon: "albums-outline",
        label: "Posts",
        value: formatNumber(analytics.posts.published),
        sub: "Total published posts",
      },
      {
        icon: "heart-outline",
        label: "Likes",
        value: formatNumber(analytics.likes.total),
        sub: 'Number of "Like" engagements on all posts',
      },
      {
        icon: "radio-outline",
        label: "Live Sessions",
        value: analytics.liveSessions.total.toString(),
        sub: "Number of times you went Live",
      },
      {
        icon: "chatbubble-ellipses-outline",
        label: "Comments",
        value: formatNumber(analytics.comments.total),
        sub: 'Number of "comments" on all posts',
      },
      {
        icon: "document-text-outline",
        label: "Drafts",
        value: analytics.drafts.total.toString(),
        sub: "Unpublished posts",
      },
      {
        icon: "share-social-outline",
        label: "Shares",
        value: formatNumber(analytics.shares.total),
        sub: "Number of times people shared your contents",
      },
    ];

    return (
      <View className="px-4 py-4">
        {analyticsMetrics.map((metric, index) => (
          <View
            key={index}
            className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4"
            style={{ shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, marginBottom: 16 }}
          >
            <View className="flex-row items-center">
              <Ionicons name={metric.icon as any} size={18} color="#0A332D" />
              <View className="ml-3">
                <Text className="text-[#111827] font-semibold">{metric.label}</Text>
                <Text className="text-[#6B7280] text-xs">{metric.sub}</Text>
              </View>
            </View>
            <Text className="text-[#111827] font-semibold">{String(metric.value)}</Text>
          </View>
        ))}
      </View>
    );
  }

  return null;
}
