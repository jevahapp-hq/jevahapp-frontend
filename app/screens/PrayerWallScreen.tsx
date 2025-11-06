import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { usePrayers, useSearchPrayers } from "../hooks/usePrayers";
import { formatTimestamp } from "../utils/communityHelpers";
import { PrayerRequest as PrayerRequestType } from "../utils/communityAPI";

export default function PrayerWallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;

  // Use hooks for prayers and search
  const { prayers, loading, error, hasMore, loadMore, refresh, likePrayer } =
    usePrayers();
  const { query, setQuery, results: searchResults, loading: searchLoading } =
    useSearchPrayers();

  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Determine which prayers to display (search results or all prayers)
  const displayPrayers = isSearching && query.trim() ? searchResults : prayers;

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle refresh from PostAPrayer
  useEffect(() => {
    if (params.refresh === "true") {
      refresh();
      router.replace("/screens/PrayerWallScreen");
    }
  }, [params.refresh]);

  const handleBackToCommunity = () => {
    // Slide out animation to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.push("/screens/CommunityScreen");
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    setIsSearching(text.trim().length > 0);
  };

  const handleLike = async (prayer: PrayerRequestType) => {
    await likePrayer(
      prayer._id,
      prayer.userLiked || false,
      prayer.likesCount || 0
    );
  };

  const getCardStyle = (shape: string, color: string) => {
    const baseStyle = {
      backgroundColor: color,
      padding: 16,
      marginBottom: 12,
      justifyContent: "center" as const,
      position: "relative" as const,
    };

    switch (shape) {
      case "square":
        return {
          ...baseStyle,
          width: 156,
          height: 156,
          alignSelf: "center" as const,
          borderRadius: 12,
          overflow: "hidden" as const,
        };
      case "square2":
        return {
          ...baseStyle,
          width: 183,
          height: 183,
          alignSelf: "center" as const,
          borderRadius: 91.5,
          overflow: "hidden" as const,
        };
      case "square3":
        return {
          ...baseStyle,
          width: 183,
          height: 183,
          alignSelf: "center" as const,
          borderRadius: 91.5,
          overflow: "hidden" as const,
        };
      case "square4":
        return {
          ...baseStyle,
          width: 156,
          height: 156,
          alignSelf: "center" as const,
          borderRadius: 12,
          overflow: "hidden" as const,
        };
      case "circle":
        return {
          ...baseStyle,
          borderRadius: 80,
          width: 160,
          height: 160,
          alignSelf: "center" as const,
        };
      case "scalloped":
        return {
          ...baseStyle,
          borderRadius: 20,
          width: 216,
          height: 216,
          alignSelf: "center" as const,
          backgroundColor: "transparent",
          padding: 0,
          justifyContent: "flex-start" as const,
        };
      default: // rectangle
        return {
          ...baseStyle,
          borderRadius: 12,
          width: "100%" as const,
          minHeight: 120,
        };
    }
  };

  const renderScallopedCard = (prayer: PrayerRequest) => {
    const numBlobs = 13;
    const containerSize = 216;
    const center = containerSize / 2;
    const blobRadius = 22; // each scallop 'tooth'
    const ringRadius = center - blobRadius + 2; // pull slightly outward
    const blobs = Array.from({ length: numBlobs }).map((_, i) => {
      const angle = (2 * Math.PI * i) / numBlobs;
      const x = center + ringRadius * Math.cos(angle) - blobRadius;
      const y = center + ringRadius * Math.sin(angle) - blobRadius;
      return (
        <View
          key={`scallop-${i}`}
          style={[
            styles.scallopBlob,
            {
              left: x,
              top: y,
              width: blobRadius * 2,
              height: blobRadius * 2,
              borderRadius: blobRadius,
              backgroundColor: prayer.color,
            },
          ]}
        />
      );
    });

    return (
      <View style={styles.scallopContainer}>
        {blobs}
        <View style={[styles.scallopCenter, { backgroundColor: prayer.color }]}>
          <Text style={styles.prayerName}>{getAuthorName(prayer)}</Text>
          <Text style={styles.prayerTime}>
            {formatTimestamp(prayer.createdAt)}
          </Text>
          <Text style={styles.prayerText}>{prayer.prayerText}</Text>
        </View>
      </View>
    );
  };

  const handlePrayerCardPress = (prayer: PrayerRequestType) => {
    router.push({
      pathname: "/screens/PostAPrayer",
      params: {
        id: prayer._id,
        prayer: prayer.prayerText,
        color: prayer.color,
        shape: prayer.shape,
        mode: "edit",
      },
    });
  };

  // Helper to format author name
  const getAuthorName = (prayer: PrayerRequestType): string => {
    if (prayer.anonymous) return "-Anonymous";
    if (prayer.author?.firstName && prayer.author?.lastName) {
      return `-${prayer.author.firstName} ${prayer.author.lastName}`.toUpperCase();
    }
    if (prayer.author?.username) {
      return `-${prayer.author.username}`.toUpperCase();
    }
    return "-User";
  };

  const renderPrayerCard = (prayer: PrayerRequestType, index: number) => (
    <View key={prayer._id}>
      <TouchableOpacity
        style={getCardStyle(prayer.shape, prayer.color)}
        activeOpacity={0.8}
        onPress={() => handlePrayerCardPress(prayer)}
      >
        {prayer.shape === "scalloped" ? (
          renderScallopedCard(prayer)
        ) : (
          <>
            {prayer.shape === "square" && (
              <View style={styles.diagonalCut}>
                <View style={styles.triangle} />
              </View>
            )}
            {prayer.shape === "square2" && (
              <View style={styles.diagonalCut2}>
                <View style={styles.diagonalMask2} />
                <View style={styles.triangle2} />
              </View>
            )}
            {prayer.shape === "square3" && (
              <View style={styles.diagonalCut3}>
                <View style={styles.diagonalMask3} />
                <View style={styles.triangle3} />
              </View>
            )}
            {prayer.shape === "square4" && (
              <View style={styles.diagonalCut4}>
                <View style={styles.triangle4} />
              </View>
            )}
            <Text style={styles.prayerName}>{getAuthorName(prayer)}</Text>
            <Text style={styles.prayerTime}>
              {formatTimestamp(prayer.createdAt)}
            </Text>
            <Text style={styles.prayerText}>{prayer.prayerText}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View
      style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#FCFCFD", paddingTop: 20 }}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FCFCFD" />

        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackToCommunity}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prayer Wall</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Search and Action Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="search ,for prayers."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              value={query}
              onChangeText={handleSearch}
            />
            {searchLoading && (
              <ActivityIndicator
                size="small"
                color="#DF930E"
                style={{ marginLeft: 8 }}
              />
            )}
          </View>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.7}
            onPress={() => router.push("/screens/PostAPrayer")}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Prayer Requests Section */}
        {loading && prayers.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DF930E" />
            <Text style={styles.loadingText}>Loading prayers...</Text>
          </View>
        ) : error && prayers.length === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Error loading prayers</Text>
            <Text style={styles.errorText}>{error.error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={refresh}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : displayPrayers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {isSearching ? "No prayers found" : "No prayers yet"}
            </Text>
            <Text style={styles.emptyText}>
              {isSearching
                ? "Try a different search term"
                : "Be the first to post a prayer and share your heart with the community"}
            </Text>
            {!isSearching && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/screens/PostAPrayer")}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.emptyButtonText}>Post a Prayer</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            style={styles.contentContainer}
            data={displayPrayers}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onEndReached={() => {
              if (!loading && hasMore && !isSearching) {
                loadMore();
              }
            }}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>
                {isSearching ? "Search Results" : "This week"}
              </Text>
            }
            ListFooterComponent={
              loading && prayers.length > 0 ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#DF930E" />
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              return (
                <View style={styles.cardContainer}>
                  {renderPrayerCard(item, index)}
                </View>
              );
            }}
            numColumns={2}
            columnWrapperStyle={styles.prayersGrid}
            contentContainerStyle={styles.flatListContent}
          />
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    fontFamily: "Rubik-Bold",
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    fontFamily: "Rubik-Regular",
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: "#DF930E",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
    fontFamily: "Rubik-Bold",
  },
  prayersGrid: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  cardContainer: {
    marginBottom: 16,
  },
  sixthCardOffset: {
    marginLeft: 20,
  },
  prayerName: {
    fontSize: 10,
    color: "white",
    marginBottom: 4,
    fontFamily: "Rubik-Regular",
    textAlign: "left",
  },
  prayerTime: {
    fontSize: 10,
    color: "white",
    marginBottom: 8,
    fontFamily: "Rubik-Regular",
    textAlign: "left",
  },
  prayerText: {
    fontSize: 12,
    color: "white",
    lineHeight: 16,
    fontFamily: "Rubik-Regular",
    textAlign: "left",
  },
  diagonalCut: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 56,
    height: 56,
    backgroundColor: "#8B5DDD",
    zIndex: 1,
  },
  triangle: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 56,
    borderTopColor: "white",
    borderLeftWidth: 56,
    borderLeftColor: "transparent",
  },
  diagonalCut2: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 91,
    height: 91,
    backgroundColor: "#0D608E",
    borderBottomLeftRadius: 91,
    zIndex: 1,
  },
  diagonalMask2: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 91,
    borderTopColor: "#FCFCFD",
    borderLeftWidth: 91,
    borderLeftColor: "transparent",
    zIndex: 1,
  },
  diagonalCut3: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 91,
    height: 91,
    backgroundColor: "#4F4DB2",
    borderBottomLeftRadius: 91,
    zIndex: 1,
  },
  diagonalMask3: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 91,
    borderTopColor: "#FCFCFD",
    borderLeftWidth: 91,
    borderLeftColor: "transparent",
    zIndex: 1,
  },
  triangle3: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 56,
    borderTopColor: "white",
    borderLeftWidth: 56,
    borderLeftColor: "transparent",
    zIndex: 2,
  },
  diagonalCut4: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 56,
    height: 56,
    backgroundColor: "#B2A31A",
    zIndex: 1,
  },
  triangle4: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 56,
    borderTopColor: "white",
    borderLeftWidth: 56,
    borderLeftColor: "transparent",
  },

  triangle2: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 56,
    borderTopColor: "white",
    borderLeftWidth: 56,
    borderLeftColor: "transparent",
    zIndex: 2,
  },
  scallopContainer: {
    width: 216,
    height: 216,
    alignSelf: "center",
    position: "relative",
  },
  scallopBlob: {
    position: "absolute",
  },
  scallopCenter: {
    position: "absolute",
    left: 28,
    top: 28,
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 12,
  },
  // Loading, Error, and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
    fontFamily: "Rubik-Bold",
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Rubik-Regular",
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: "#DF930E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Rubik-SemiBold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 24,
    fontFamily: "Rubik-Bold",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 24,
    fontFamily: "Rubik-Regular",
  },
  emptyButton: {
    marginTop: 32,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DF930E",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Rubik-SemiBold",
  },
  flatListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
