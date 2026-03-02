import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useProfileTabItems, useProfileTabs } from "../hooks/useProfileTabs";
import authService from "../services/authService";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surface, setSurface] = useState<any | null>(null);

  const parseUserFromResponse = (data: any) => {
    const root = data?.data || data || {};
    return root.user || null;
  };

  const loadProfile = useCallback(async () => {
    setError(null);
    try {
      const res = await authService.fetchMe();
      if (!res.success) {
        const msg = (res as any)?.data?.message || "Failed to load profile";
        throw new Error(msg);
      }
      setSurface(res.data);
    } catch (e: any) {
      setError(e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  const user = parseUserFromResponse(surface);
  const prefs = (surface?.data || surface)?.preferences;
  const stats = (surface?.data || surface)?.stats;

  // Tabs: reinstate client-approved segmented tab UI and behavior
  const { tabs, loadingTabs } = useProfileTabs(user?.id);
  const [selectedTabKey, setSelectedTabKey] = useState<string | null>(null);
  const resolvedActiveKey =
    selectedTabKey || (tabs && tabs.length ? tabs[0].key : (null as any));

  const {
    items: tabItems,
    loading: tabLoading,
    loadMore: loadMoreTab,
  } = useProfileTabItems<any>(resolvedActiveKey as any, {
    userId: user?.id,
    page: 1,
    limit: 12,
    sort: "recent",
  });

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#090E24" />
        <Text className="mt-3">Loading profile…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-6">
        <Text className="text-lg font-bold">Unable to load profile</Text>
        <Text className="text-center mt-2 text-[#344054]">{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {/* Header */}
      <View className="w-full items-center mt-8 px-6">
        {user?.bannerUrl ? (
          <Image
            source={{ uri: user.bannerUrl }}
            style={{ width: "100%", height: 120, borderRadius: 12 }}
            resizeMode="cover"
          />
        ) : null}

        <View className="items-center mt-4">
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={{ width: 84, height: 84, borderRadius: 42 }}
            />
          ) : (
            <View
              style={{ width: 84, height: 84, borderRadius: 42 }}
              className="bg-gray-200 items-center justify-center"
            >
              <Text className="text-[#1D2939] text-xl">
                {user?.firstName?.[0] || "U"}
              </Text>
            </View>
          )}
          <Text className="text-2xl font-bold mt-3 text-[#1D2939]">
            {user?.firstName || ""} {user?.lastName || ""}
          </Text>
          <Text className="text-[#475467] mt-1">{user?.email}</Text>
          {user?.bio ? (
            <Text className="text-center text-[#344054] mt-2">{user.bio}</Text>
          ) : null}
          {user?.location ? (
            <Text className="text-center text-[#667085] mt-1">
              {user.location}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Stats */}
      {stats ? (
        <View className="flex-row justify-around mt-8 px-6">
          <View className="items-center">
            <Text className="text-xl font-semibold">
              {stats.followers ?? 0}
            </Text>
            <Text className="text-[#667085]">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-semibold">
              {stats.following ?? 0}
            </Text>
            <Text className="text-[#667085]">Following</Text>
          </View>
          <View className="items-center">
            <Text className="text-xl font-semibold">{stats.posts ?? 0}</Text>
            <Text className="text-[#667085]">Posts</Text>
          </View>
        </View>
      ) : null}

      {/* Preferences (preview) */}
      {prefs ? (
        <View className="mt-10 px-6">
          <Text className="text-lg font-semibold">Preferences</Text>
          <Text className="text-[#475467] mt-2">
            Theme: {prefs.theme || "light"} • Kid: {prefs.isKid ? "Yes" : "No"}
          </Text>
          {Array.isArray(prefs.interests) && prefs.interests.length ? (
            <Text className="text-[#475467] mt-1">
              Interests: {prefs.interests.join(", ")}
            </Text>
          ) : null}
        </View>
      ) : null}
      {/* Dynamic Tabs - segmented control style (client-approved) */}
      <View className="mt-10 px-6">
        <Text className="text-lg font-semibold mb-3">My Content</Text>
        <View className="bg-gray-200 rounded-xl px-2 py-1 flex-row items-center w-full self-center flex-wrap">
          {(tabs || []).map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setSelectedTabKey(t.key)}
              className={`rounded-md items-center justify-center px-3 py-2 mr-2 mb-2`}
              activeOpacity={0.7}
              style={
                resolvedActiveKey === t.key
                  ? { backgroundColor: "#0A332D" }
                  : { backgroundColor: "#E5E7EB" }
              }
            >
              <Text
                style={{
                  color: resolvedActiveKey === t.key ? "white" : "#111827",
                  fontWeight: "600",
                }}
              >
                {t.label} ({t.count ?? 0})
              </Text>
            </TouchableOpacity>
          ))}
          {loadingTabs && (
            <View className="px-3 py-2">
              <Text>Loading tabs…</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab Items Grid (simple) */}
      <View className="mt-4 px-6">
        {tabLoading && <ActivityIndicator size="small" color="#090E24" />}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
          }}
        >
          {(tabItems || []).map((it: any, idx: number) => (
            <View
              key={(it.id || idx) + ""}
              style={{
                width: "31%",
                aspectRatio: 1,
                backgroundColor: "#E5E7EB",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {it.thumbnailUrl || it.url ? (
                <Image
                  source={{ uri: (it.thumbnailUrl || it.url) as string }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "#6B7280", fontSize: 12 }}
                    numberOfLines={1}
                  >
                    {it.title || it.type}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        {!tabLoading && (tabItems || []).length > 0 && (
          <TouchableOpacity
            onPress={loadMoreTab}
            style={{ alignSelf: "center", paddingVertical: 10 }}
          >
            <Text style={{ color: "#090E24", fontWeight: "600" }}>
              Load more
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
