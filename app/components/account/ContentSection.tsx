import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAccountContent } from "../../hooks/useAccountContent";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useReelsStore } from "../../store/useReelsStore";
import type { MediaItem, Post, Video } from "../../types/account.types";

type ContentSectionProps = {
  selectedIndex: number;
};

export default function ContentSection({ selectedIndex }: ContentSectionProps) {
  const router = useRouter();
  const reelsStore = useReelsStore();
  const { user, getAvatarUrl } = useUserProfile();
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
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        nestedScrollEnabled={true}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16 px-8">
            <View className="items-center mb-4">
              <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="albums-outline" size={48} color="#9CA3AF" />
              </View>
              <Text className="text-xl font-semibold text-gray-700 mb-2">No posts yet</Text>
              <Text className="text-sm text-gray-500 text-center">
                Start sharing your thoughts and moments with the community
              </Text>
            </View>
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
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        onEndReached={loadMoreMedia}
        onEndReachedThreshold={0.5}
        nestedScrollEnabled={true}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16 px-8">
            <View className="items-center mb-4">
              <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="images-outline" size={48} color="#9CA3AF" />
              </View>
              <Text className="text-xl font-semibold text-gray-700 mb-2">No media yet</Text>
              <Text className="text-sm text-gray-500 text-center">
                Upload photos and images to share with others
              </Text>
            </View>
          </View>
        }
      />
    );
  }

  // Videos Tab (Index 2)
  if (selectedIndex === 2) {
    const handleVideoPress = (video: Video, index: number) => {
      // Get user's actual avatar URL, fallback to placeholder if not available
      const userAvatarUrl = user && getAvatarUrl(user) 
        ? getAvatarUrl(user) 
        : "https://via.placeholder.com/40x40/cccccc/ffffff?text=U";
      
      // Prepare video list for navigation
      const videoListForNavigation = videos.map((v, idx) => ({
        title: v.title || "Untitled Video",
        speaker: v.userId || "Unknown",
        timeAgo: new Date(v.createdAt).toLocaleDateString(),
        views: v.viewsCount || 0,
        sheared: 0,
        saved: 0,
        favorite: v.likesCount || 0,
        fileUrl: v.url || "",
        imageUrl: v.thumbnail || v.url || "",
        speakerAvatar: userAvatarUrl,
        _id: v._id,
        contentType: "videos",
        description: v.description || "",
        createdAt: v.createdAt,
        uploadedBy: v.userId,
      }));

      // Set video list in reels store BEFORE navigation for immediate access
      reelsStore.setVideoList(videoListForNavigation);
      reelsStore.setCurrentIndex(index);

      // Navigate to reels screen
      router.push({
        pathname: "/reels/Reelsviewscroll",
        params: {
          title: video.title || "Untitled Video",
          speaker: video.userId || "Unknown",
          timeAgo: new Date(video.createdAt).toLocaleDateString(),
          views: String(video.viewsCount || 0),
          sheared: "0",
          saved: "0",
          favorite: String(video.likesCount || 0),
          imageUrl: video.url || "",
          speakerAvatar: userAvatarUrl,
          category: "videos",
          currentIndex: String(index),
          source: "AccountScreen",
          videoList: JSON.stringify(videoListForNavigation),
        },
      });
    };

    const renderVideoItem = ({ item, index }: { item: Video; index: number }) => {
      return (
        <TouchableOpacity
          className="w-[32%] mb-2 aspect-square relative"
          onPress={() => handleVideoPress(item, index)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: item.thumbnail || item.url }}
            className="w-full h-full rounded-lg"
            resizeMode="cover"
          />
          {/* Semi-transparent overlay for better play icon visibility */}
          <View className="absolute inset-0 bg-black/20 rounded-lg" />
          {/* Play icon with background circle - smaller for compact grid */}
          <View className="absolute inset-0 items-center justify-center">
            <View className="bg-black/60 rounded-full p-1">
              <Ionicons name="play" size={16} color="white" />
            </View>
          </View>
          {item.duration && (
            <View className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded">
              <Text className="text-white text-[10px] font-medium">
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
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        onEndReached={loadMoreVideos}
        onEndReachedThreshold={0.5}
        nestedScrollEnabled={true}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16 px-8">
            <View className="items-center mb-4">
              <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="videocam-outline" size={48} color="#9CA3AF" />
              </View>
              <Text className="text-xl font-semibold text-gray-700 mb-2">No videos yet</Text>
              <Text className="text-sm text-gray-500 text-center">
                Share your favorite videos with the community
              </Text>
            </View>
          </View>
        }
      />
    );
  }

  // Analytics Tab (Index 3)
  if (selectedIndex === 3) {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center py-8">
          <ActivityIndicator size="large" color="#FEA74E" />
        </View>
      );
    }

    if (!analytics) {
      return (
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
        >
          <View className="items-center justify-center py-16 px-8">
            <View className="items-center mb-4">
              <View className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center mb-4">
                <Ionicons name="stats-chart-outline" size={48} color="#9CA3AF" />
              </View>
              <Text className="text-xl font-semibold text-gray-700 mb-2">No analytics data</Text>
              <Text className="text-sm text-gray-500 text-center">
                Analytics will appear here once you start creating content
              </Text>
            </View>
          </View>
        </ScrollView>
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
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>
    );
  }

  return null;
}
