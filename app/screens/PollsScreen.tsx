import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePolls } from "../hooks/usePolls";
import { Poll as PollType } from "../utils/communityAPI";
import { formatTimestamp } from "../utils/communityHelpers";

export default function PollsScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;

  // Get polls from backend
  const {
    polls,
    loading,
    error,
    hasMore,
    loadMore,
    refresh: refreshPolls,
    voteOnPoll,
  } = usePolls({ status: "active", sortBy: "createdAt", sortOrder: "desc" });

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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
    await refreshPolls();
    setRefreshing(false);
  };

  const handleVote = async (poll: PollType, optionId: string) => {
    // Check if already voted
    if (poll.userVoted) {
      Alert.alert("Already Voted", "You have already voted on this poll");
      return;
    }

    // Check if poll is active
    if (!poll.isActive) {
      Alert.alert("Poll Expired", "This poll has expired");
      return;
    }

    // Vote on poll
    const result = await voteOnPoll(poll._id, optionId);
    if (result) {
      // Success - poll state updated automatically
      Alert.alert("Success", "Your vote has been recorded!");
    }
  };

  const renderPoll = (poll: PollType) => (
    <View key={poll._id} style={styles.pollContainer}>
      <View style={styles.pollHeader}>
        <Text style={styles.pollTitle}>{poll.title || poll.question}</Text>
        {poll.description && (
          <Text style={styles.pollDescription}>{poll.description}</Text>
        )}
        <View style={styles.pollMeta}>
          <Text style={styles.pollTimestamp}>
            {formatTimestamp(poll.createdAt)}
          </Text>
          <Text style={styles.pollVotes}>{poll.totalVotes || 0} votes</Text>
        </View>
        {!poll.isActive && (
          <View style={styles.expiredBadge}>
            <Text style={styles.expiredText}>Expired</Text>
          </View>
        )}
      </View>

      <View style={styles.pollOptions}>
        {poll.options.map((option) => (
          <TouchableOpacity
            key={option._id}
            style={[
              styles.pollOption,
              poll.userVoted &&
                poll.userVoteOptionId === option._id &&
                styles.selectedOption,
              !poll.isActive && styles.disabledOption,
            ]}
            onPress={() => handleVote(poll, option._id)}
            activeOpacity={0.7}
            disabled={poll.userVoted || !poll.isActive}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionText,
                  poll.userVoted &&
                    poll.userVoteOptionId === option._id &&
                    styles.selectedOptionText,
                ]}
              >
                {option.text}
              </Text>
              {poll.userVoted && typeof option.percentage === "number" && (
                <Text style={styles.optionPercentage}>
                  {option.percentage.toFixed(1)}%
                </Text>
              )}
            </View>
            {poll.userVoted && typeof option.percentage === "number" && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${option.percentage}%` },
                  ]}
                />
              </View>
            )}
            {poll.userVoted && poll.userVoteOptionId === option._id && (
              <View style={styles.voteCheckmark}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {poll.userVoted && (
        <View style={styles.votedIndicator}>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.votedText}>You voted</Text>
        </View>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FCFCFD" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackToCommunity}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Polls & Surveys</Text>

          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Today Button */}
        <View style={styles.todayButtonContainer}>
          <TouchableOpacity style={styles.todayButton} activeOpacity={0.8}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Polls List */}
        {loading && polls.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DF930E" />
            <Text style={styles.loadingText}>Loading polls...</Text>
          </View>
        ) : error && polls.length === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Error loading polls</Text>
            <Text style={styles.errorText}>{error.error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={refreshPolls}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : polls.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="stats-chart-outline" size={80} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No polls available</Text>
            <Text style={styles.emptyText}>
              There are no active polls at the moment. Check back later!
            </Text>
          </View>
        ) : (
          <FlatList
            style={styles.pollsContainer}
            data={polls}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onEndReached={() => {
              if (!loading && hasMore) {
                loadMore();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading && polls.length > 0 ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#DF930E" />
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => renderPoll(item)}
          />
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  safeArea: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: "#000",
    fontFamily: "Rubik-Bold",
  },
  filterButton: {
    padding: 8,
  },
  todayButtonContainer: {
    alignItems: "center" as const,
    paddingBottom: 16,
  },
  todayButton: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
    fontFamily: "Rubik-Medium",
  },
  pollsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  pollContainer: {
    backgroundColor: "white",
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pollHeader: {
    marginBottom: 16,
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: "#111827",
    fontFamily: "Rubik-Bold",
    marginBottom: 8,
  },
  pollDescription: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
    marginBottom: 12,
    lineHeight: 20,
  },
  pollMeta: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  pollTimestamp: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "Rubik-Regular",
  },
  pollVotes: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Rubik-Medium",
  },
  pollOptions: {
    marginBottom: 12,
  },
  pollOption: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedOption: {
    backgroundColor: "#F0FDF4",
    borderColor: "#22C55E",
  },
  optionContent: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: "#374151",
    fontFamily: "Rubik-Regular",
    flex: 1,
  },
  selectedOptionText: {
    color: "#16A34A",
    fontFamily: "Rubik-Medium",
  },
  optionPercentage: {
    fontSize: 12,
    color: "#16A34A",
    fontFamily: "Rubik-Bold",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 2,
  },
  votedIndicator: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  votedText: {
    fontSize: 12,
    color: "#22C55E",
    fontFamily: "Rubik-Medium",
    marginLeft: 4,
  },
  expiredBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  expiredText: {
    fontSize: 12,
    color: "#DC2626",
    fontFamily: "Rubik-Medium",
  },
  disabledOption: {
    opacity: 0.6,
  },
  voteCheckmark: {
    position: "absolute",
    right: 12,
    top: 12,
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
    fontWeight: "bold" as const,
    color: "#1F2937",
    marginTop: 16,
    fontFamily: "Rubik-Bold",
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    marginTop: 8,
    marginBottom: 16,
    fontFamily: "Rubik-Regular",
  },
  retryButton: {
    backgroundColor: "#DF930E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600" as const,
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
    fontWeight: "bold" as const,
    color: "#1F2937",
    marginTop: 24,
    fontFamily: "Rubik-Bold",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center" as const,
    marginTop: 12,
    lineHeight: 24,
    fontFamily: "Rubik-Regular",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center" as const,
  },
};
