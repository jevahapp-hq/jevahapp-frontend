# Account & Profile Settings - Frontend Integration Guide

**Safe integration guide that extends existing codebase without breaking changes**

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Integration Strategy](#integration-strategy)
3. [Step-by-Step Integration](#step-by-step-integration)
4. [Code Changes](#code-changes)
5. [Testing Checklist](#testing-checklist)
6. [Rollback Plan](#rollback-plan)

---

## Current State Analysis

### ✅ What We Already Have

1. **API Client** (`app/utils/dataFetching.ts`)
   - ✅ `getUserProfile()` - Already implemented
   - ✅ `updateUserProfile()` - Already implemented
   - ✅ Token management with AsyncStorage + SecureStore
   - ✅ Caching and performance optimization
   - ✅ Error handling

2. **Hooks**
   - ✅ `useUserProfile` - Already implemented and working
   - ⚠️ `useAccountContent` - Placeholder (needs real implementation)

3. **Components**
   - ✅ `AccountScreen` - Main screen exists
   - ✅ `ProfileSummary` - Component exists
   - ✅ `ContentTabs` - Component exists
   - ✅ `ContentSection` - Component exists (needs data integration)

### 🔧 What We Need to Add

1. New API methods for:
   - `getUserPosts(userId, page, limit)`
   - `getUserMedia(userId, page, limit, type)`
   - `getUserVideos(userId, page, limit)`
   - `getUserAnalytics(userId)`
   - `logout()` (if not exists)

2. Update `useAccountContent` hook to fetch real data

3. Update `ContentSection` component to use real data

---

## Integration Strategy

### Approach: **Extend, Don't Replace**

1. ✅ **Keep existing API client** - Add new methods to existing `ApiClient` class
2. ✅ **Keep existing hooks** - Extend `useAccountContent` with real API calls
3. ✅ **Backward compatible** - All existing functionality continues to work
4. ✅ **Gradual migration** - Can test each endpoint independently

---

## Step-by-Step Integration

### Step 1: Add Type Definitions

**File:** `app/types/account.types.ts` (NEW FILE)

```typescript
// User Profile Types (extend existing if needed)
export interface User {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string | null;
  avatarUpload?: string | null;
  bio?: string | null; // Add bio field
  section?: string;
  role?: string;
  isProfileComplete?: boolean;
  isEmailVerified?: boolean;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  bio?: string;
  section?: string;
}

// Content Types
export interface Post {
  _id: string;
  userId: string;
  content?: string;
  media: MediaItem[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  _id: string;
  userId: string;
  url: string;
  thumbnail: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  title?: string;
  description?: string;
  viewsCount?: number;
  likesCount?: number;
  createdAt: string;
}

export interface Video extends MediaItem {
  type: "video";
  duration: number;
  title: string;
  description?: string;
  viewsCount: number;
  likesCount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PostsResponse {
  posts: Post[];
  pagination: Pagination;
}

export interface MediaResponse {
  media: MediaItem[];
  pagination: Pagination;
}

export interface VideosResponse {
  videos: Video[];
  pagination: Pagination;
}

// Analytics Types
export interface UserAnalytics {
  posts: {
    total: number;
    published: number;
    drafts: number;
  };
  likes: {
    total: number;
    received: number;
  };
  liveSessions: {
    total: number;
    totalDuration: number;
  };
  comments: {
    total: number;
    received: number;
  };
  drafts: {
    total: number;
    posts: number;
    videos: number;
  };
  shares: {
    total: number;
    received: number;
  };
}
```

---

### Step 2: Extend Existing API Client

**File:** `app/utils/dataFetching.ts`

**Add these methods to the existing `ApiClient` class** (around line 360, after `uploadAvatar`):

```typescript
// ============= ACCOUNT & PROFILE API METHODS =============

/**
 * Get user's posts
 * GET /api/users/:userId/posts
 */
async getUserPosts(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: PostsResponse }> {
  try {
    const result = await this.request(`/users/${userId}/posts?page=${page}&limit=${limit}`, {
      cache: true,
    });
    
    // Handle different response formats
    if (result.data) {
      return result;
    }
    
    // If response is direct, wrap it
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Error fetching user posts:", error);
    throw error;
  }
}

/**
 * Get user's media (images)
 * GET /api/users/:userId/media
 */
async getUserMedia(
  userId: string,
  page: number = 1,
  limit: number = 20,
  type?: "image" | "video"
): Promise<{ data: MediaResponse }> {
  try {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (type) {
      queryParams.append("type", type);
    }
    
    const result = await this.request(`/users/${userId}/media?${queryParams.toString()}`, {
      cache: true,
    });
    
    if (result.data) {
      return result;
    }
    
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Error fetching user media:", error);
    throw error;
  }
}

/**
 * Get user's videos
 * GET /api/users/:userId/videos
 */
async getUserVideos(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: VideosResponse }> {
  try {
    const result = await this.request(`/users/${userId}/videos?page=${page}&limit=${limit}`, {
      cache: true,
    });
    
    if (result.data) {
      return result;
    }
    
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Error fetching user videos:", error);
    throw error;
  }
}

/**
 * Get user analytics
 * GET /api/users/:userId/analytics
 */
async getUserAnalytics(userId: string): Promise<{ data: UserAnalytics }> {
  try {
    const result = await this.request(`/users/${userId}/analytics`, {
      cache: true,
      cacheDuration: 2 * 60 * 1000, // Cache for 2 minutes
    });
    
    if (result.data) {
      return result;
    }
    
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Error fetching user analytics:", error);
    throw error;
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
async logout(): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await this.request("/auth/logout", {
      method: "POST",
    });
    
    // Clear cache after logout
    this.cache.clear();
    
    return result;
  } catch (error: any) {
    console.error("Error logging out:", error);
    // Still clear cache even if API call fails
    this.cache.clear();
    throw error;
  }
}
```

**Note:** Make sure to import the types at the top of the file:

```typescript
import type {
  PostsResponse,
  MediaResponse,
  VideosResponse,
  UserAnalytics,
} from "../types/account.types";
```

---

### Step 3: Update useAccountContent Hook

**File:** `app/hooks/useAccountContent.ts`

**Replace the entire file content:**

```typescript
import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../utils/dataFetching";
import type {
  Post,
  MediaItem,
  Video,
  UserAnalytics,
} from "../types/account.types";

type UseAccountContentResult = {
  posts: Post[];
  media: MediaItem[];
  videos: Video[];
  analytics: UserAnalytics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMorePosts: () => Promise<void>;
  loadMoreMedia: () => Promise<void>;
  loadMoreVideos: () => Promise<void>;
};

export function useAccountContent(): UseAccountContentResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);

  // Pagination state
  const [postsPage, setPostsPage] = useState(1);
  const [mediaPage, setMediaPage] = useState(1);
  const [videosPage, setVideosPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreMedia, setHasMoreMedia] = useState(true);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user ID from profile
      const userProfile = await apiClient.getUserProfile();
      const userId = userProfile.user._id || userProfile.user.id;

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Fetch all data in parallel
      const [postsData, mediaData, videosData, analyticsData] =
        await Promise.all([
          apiClient.getUserPosts(userId, 1, 20).catch((err) => {
            console.warn("Failed to fetch posts:", err);
            return { data: { posts: [], pagination: { hasMore: false } } };
          }),
          apiClient.getUserMedia(userId, 1, 20, "image").catch((err) => {
            console.warn("Failed to fetch media:", err);
            return { data: { media: [], pagination: { hasMore: false } } };
          }),
          apiClient.getUserVideos(userId, 1, 20).catch((err) => {
            console.warn("Failed to fetch videos:", err);
            return { data: { videos: [], pagination: { hasMore: false } } };
          }),
          apiClient.getUserAnalytics(userId).catch((err) => {
            console.warn("Failed to fetch analytics:", err);
            return null;
          }),
        ]);

      // Update state
      if (postsData.data) {
        setPosts(postsData.data.posts || []);
        setHasMorePosts(postsData.data.pagination?.hasMore ?? false);
      }

      if (mediaData.data) {
        setMedia(mediaData.data.media || []);
        setHasMoreMedia(mediaData.data.pagination?.hasMore ?? false);
      }

      if (videosData.data) {
        setVideos(videosData.data.videos || []);
        setHasMoreVideos(videosData.data.pagination?.hasMore ?? false);
      }

      if (analyticsData?.data) {
        setAnalytics(analyticsData.data);
      }

      // Reset pagination
      setPostsPage(1);
      setMediaPage(1);
      setVideosPage(1);
    } catch (err: any) {
      setError(err.message || "Failed to load content");
      console.error("Error loading account content:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (!hasMorePosts || loading) return;

    try {
      const userProfile = await apiClient.getUserProfile();
      const userId = userProfile.user._id || userProfile.user.id;
      if (!userId) return;

      const nextPage = postsPage + 1;
      const postsData = await apiClient.getUserPosts(userId, nextPage, 20);

      if (postsData.data) {
        setPosts((prev) => [...prev, ...(postsData.data.posts || [])]);
        setHasMorePosts(postsData.data.pagination?.hasMore ?? false);
        setPostsPage(nextPage);
      }
    } catch (err: any) {
      console.error("Error loading more posts:", err);
    }
  }, [postsPage, hasMorePosts, loading]);

  const loadMoreMedia = useCallback(async () => {
    if (!hasMoreMedia || loading) return;

    try {
      const userProfile = await apiClient.getUserProfile();
      const userId = userProfile.user._id || userProfile.user.id;
      if (!userId) return;

      const nextPage = mediaPage + 1;
      const mediaData = await apiClient.getUserMedia(
        userId,
        nextPage,
        20,
        "image"
      );

      if (mediaData.data) {
        setMedia((prev) => [...prev, ...(mediaData.data.media || [])]);
        setHasMoreMedia(mediaData.data.pagination?.hasMore ?? false);
        setMediaPage(nextPage);
      }
    } catch (err: any) {
      console.error("Error loading more media:", err);
    }
  }, [mediaPage, hasMoreMedia, loading]);

  const loadMoreVideos = useCallback(async () => {
    if (!hasMoreVideos || loading) return;

    try {
      const userProfile = await apiClient.getUserProfile();
      const userId = userProfile.user._id || userProfile.user.id;
      if (!userId) return;

      const nextPage = videosPage + 1;
      const videosData = await apiClient.getUserVideos(userId, nextPage, 20);

      if (videosData.data) {
        setVideos((prev) => [...prev, ...(videosData.data.videos || [])]);
        setHasMoreVideos(videosData.data.pagination?.hasMore ?? false);
        setVideosPage(nextPage);
      }
    } catch (err: any) {
      console.error("Error loading more videos:", err);
    }
  }, [videosPage, hasMoreVideos, loading]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return {
    posts,
    media,
    videos,
    analytics,
    loading,
    error,
    refresh: loadContent,
    loadMorePosts,
    loadMoreMedia,
    loadMoreVideos,
  };
}

export default useAccountContent;
```

---

### Step 4: Update ContentSection Component

**File:** `app/components/account/ContentSection.tsx`

**Update the component to use real data from the hook:**

```typescript
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
        icon: "chatbubble-outline",
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
        icon: "share-outline",
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
            className="bg-white rounded-lg p-4 mb-4 shadow-sm"
          >
            <View className="flex-row items-center mb-2">
              <Ionicons name={metric.icon as any} size={24} color="#FEA74E" />
              <Text className="ml-3 text-lg font-semibold text-[#3B3B3B]">
                {metric.label}
              </Text>
              <Text className="ml-auto text-lg font-bold text-[#3B3B3B]">
                {metric.value}
              </Text>
            </View>
            <Text className="text-sm text-gray-500 ml-9">{metric.sub}</Text>
          </View>
        ))}
      </View>
    );
  }

  return null;
}
```

---

### Step 5: Update ProfileSummary for Bio Support

**File:** `app/components/account/ProfileSummary.tsx`

**Add bio editing functionality** (around line 83-85):

```typescript
// Replace the existing "+ Add bio" section with:

{user?.bio ? (
  <View className="px-4 mb-2">
    <Text className="text-[#3B3B3B] text-sm text-center">{user.bio}</Text>
  </View>
) : (
  <TouchableOpacity
    className="mb-2"
    onPress={() => {
      Alert.prompt(
        "Add Bio",
        "Enter your bio (max 500 characters)",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: async (bioText) => {
              if (!bioText) return;
              if (bioText.length > 500) {
                Alert.alert("Error", "Bio must be less than 500 characters");
                return;
              }
              try {
                await apiClient.updateUserProfile({ bio: bioText });
                // Refresh profile
                // refreshProfile(); // Call refresh if available
              } catch (error: any) {
                Alert.alert("Error", error.message || "Failed to update bio");
              }
            },
          },
        ],
        "plain-text",
        user?.bio || ""
      );
    }}
  >
    <Text className="text-[#FEA74E] font-medium">+ Add bio</Text>
  </TouchableOpacity>
)}
```

**Add import at top:**
```typescript
import { Alert } from "react-native";
import { apiClient } from "../utils/dataFetching";
```

---

### Step 6: Update useUserProfile Hook (Add Bio Support)

**File:** `app/hooks/useUserProfile.ts`

**Update the User type** (around line 5-21) to include bio:

```typescript
export type User = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string | null;
  avatarUpload?: string | null;
  bio?: string | null; // ADD THIS LINE
  section?: string;
  role?: string;
  isProfileComplete?: boolean;
  isEmailVerified?: boolean;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
};
```

---

## Testing Checklist

### ✅ Pre-Integration Testing

- [ ] Existing `getUserProfile()` still works
- [ ] Existing `updateUserProfile()` still works
- [ ] Account screen loads without errors
- [ ] Profile summary displays correctly

### ✅ Post-Integration Testing

- [ ] New API methods are accessible via `apiClient`
- [ ] `useAccountContent` hook loads data successfully
- [ ] Posts tab displays user's posts
- [ ] Media tab displays user's images
- [ ] Videos tab displays user's videos
- [ ] Analytics tab displays correct metrics
- [ ] Pagination works (load more functionality)
- [ ] Bio editing works
- [ ] Error handling works (test with network off)
- [ ] Loading states display correctly
- [ ] Empty states display correctly

### ✅ Edge Cases

- [ ] User with no posts/media/videos
- [ ] User with no bio
- [ ] Network error handling
- [ ] API error responses
- [ ] Large datasets (pagination)

---

## Rollback Plan

If something breaks, you can quickly rollback:

1. **Revert `useAccountContent.ts`** to previous version (placeholder)
2. **Revert `ContentSection.tsx`** to use placeholder data
3. **Keep new API methods** (they won't break anything if not used)

The new API methods are safe to keep - they're just additions and won't affect existing functionality.

---

## Migration Notes

### API Endpoint Paths

The backend guide uses:
- `/api/users/:userId/posts`
- `/api/users/:userId/media`
- `/api/users/:userId/videos`
- `/api/users/:userId/analytics`

Our existing API client uses `/api` as base, so we call:
- `/users/:userId/posts` (without `/api` prefix - it's added automatically)

### Response Format Handling

The backend may return responses in different formats:
- `{ success: true, data: { posts: [...] } }`
- `{ success: true, posts: [...] }`

Our code handles both formats with fallbacks.

---

## Summary

✅ **Safe to integrate** - We're extending, not replacing

✅ **Backward compatible** - All existing code continues to work

✅ **Gradual rollout** - Can test each endpoint independently

✅ **Easy rollback** - Can revert hooks/components without affecting API client

**Status:** ✅ **READY FOR INTEGRATION**

Follow the steps above in order, test after each step, and you'll have a fully integrated Account & Profile Settings screen without breaking existing functionality.

