import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePolls, isPollOwner } from "../hooks/usePolls";
import { Poll as PollType } from "../utils/communityAPI";
import { formatTimestamp } from "../utils/communityHelpers";
import { CreatePollForm } from "../components/CreatePollForm";

export default function PollsScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Default to showing only active/open polls (not expired)
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("open");
  const [editingPoll, setEditingPoll] = useState<PollType | null>(null);
  const [selectedPollOwners, setSelectedPollOwners] = useState<Record<string, boolean>>({});
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
    createPoll,
    voteOnPoll,
    updatePoll,
    deletePoll,
  } = usePolls({ status: statusFilter, sortBy: "createdAt", sortOrder: "desc" });

  // Check ownership for each poll
  useEffect(() => {
    const checkOwnership = async () => {
      const ownershipMap: Record<string, boolean> = {};
      for (const poll of polls) {
        ownershipMap[poll._id] = await isPollOwner(poll);
      }
      setSelectedPollOwners(ownershipMap);
    };
    if (polls.length > 0) {
      checkOwnership();
    }
  }, [polls]);

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

  const handleVote = async (poll: PollType, optionIndex: number) => {
    // Check if already voted (for single-select polls)
    if (poll.userVoted && !poll.multiSelect) {
      Alert.alert("Already Voted", "You have already voted on this poll");
      return;
    }

    // Check if poll is active
    if (!poll.isActive) {
      Alert.alert("Poll Expired", "This poll has expired");
      return;
    }

    // Handle multi-select voting
    if (poll.multiSelect) {
      // For multi-select, we need to track selected options
      // This is a simplified version - you may want to track selected options in state
      const result = await voteOnPoll(poll._id, [optionIndex]);
      if (result) {
        // Success - poll state updated automatically
      }
    } else {
      // Single-select voting
      const result = await voteOnPoll(poll._id, optionIndex);
      if (result) {
        // Success - poll state updated automatically
      }
    }
  };

  const handleCreatePoll = async (pollData: any) => {
    const result = await createPoll(pollData);
    if (result) {
      setShowCreateForm(false);
      Alert.alert("Success", "Poll created successfully!");
    } else {
      Alert.alert("Error", "Failed to create poll. Please try again.");
    }
  };

  const handleUpdatePoll = async (pollData: any) => {
    if (!editingPoll) return;
    
    const result = await updatePoll(editingPoll._id, pollData);
    if (result) {
      setEditingPoll(null);
      Alert.alert("Success", "Poll updated successfully!");
    } else {
      Alert.alert("Error", "Failed to update poll. Please try again.");
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    Alert.alert(
      "Delete Poll",
      "Are you sure you want to delete this poll? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deletePoll(pollId);
            if (result) {
              Alert.alert("Success", "Poll deleted successfully!");
            } else {
              Alert.alert("Error", "Failed to delete poll. Please try again.");
            }
          },
        },
      ]
    );
  };

  const renderPoll = (poll: PollType) => {
    const isOwner = selectedPollOwners[poll._id] || false;
    const userVoteOptionIds = Array.isArray(poll.userVoteOptionId)
      ? poll.userVoteOptionId
      : poll.userVoteOptionId
      ? [poll.userVoteOptionId]
      : [];

    // Debug logging for missing options
    if (!poll.options || poll.options.length === 0) {
      console.warn("⚠️ Poll missing options:", {
        pollId: poll._id,
        question: poll.question || poll.title,
        hasOptions: !!poll.options,
        optionsLength: poll.options?.length || 0,
        pollData: JSON.stringify(poll, null, 2).substring(0, 500),
      });
    }

    return (
      <View key={poll._id} style={styles.pollContainer}>
        <View style={styles.pollHeader}>
          <View style={styles.pollTitleRow}>
            <Text style={styles.pollTitle}>{poll.question || poll.title}</Text>
            {isOwner && (
              <View style={styles.ownerActions}>
                <TouchableOpacity
                  onPress={() => setEditingPoll(poll)}
                  style={styles.actionButton}
                >
                  <Ionicons name="create-outline" size={18} color="#256E63" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeletePoll(poll._id)}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {poll.description && (
            <Text style={styles.pollDescription}>{poll.description}</Text>
          )}
          <View style={styles.pollMeta}>
            <Text style={styles.pollTimestamp}>
              {formatTimestamp(poll.createdAt)}
            </Text>
            <Text style={styles.pollVotes}>{poll.totalVotes || 0} votes</Text>
          </View>
          {poll.multiSelect && (
            <View style={styles.multiSelectBadge}>
              <Text style={styles.multiSelectText}>Multiple choices allowed</Text>
            </View>
          )}
          {!poll.isActive && (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
        </View>

        <View style={styles.pollOptions}>
          {(!poll.options || poll.options.length === 0) ? (
            <View style={styles.noOptionsContainer}>
              <Text style={styles.noOptionsText}>
                No options available for this poll
              </Text>
            </View>
          ) : (
            poll.options.map((option, index) => {
              const isSelected = userVoteOptionIds.includes(option._id) || 
                (poll.userVoted && !poll.multiSelect && poll.userVoteOptionId === option._id);
              
              // Use option._id if available, otherwise fallback to index
              const optionKey = option._id || `option-${index}`;
              
              return (
                <TouchableOpacity
                  key={optionKey}
                  style={[
                    styles.pollOption,
                    isSelected && styles.selectedOption,
                    !poll.isActive && styles.disabledOption,
                  ]}
                  onPress={() => handleVote(poll, index)}
                  activeOpacity={0.7}
                  disabled={(!poll.multiSelect && poll.userVoted) || !poll.isActive}
                >
                  <View style={styles.optionContent}>
                    {poll.multiSelect && (
                      <View style={styles.checkbox}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#256E63" />
                        )}
                      </View>
                    )}
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {option.text || `Option ${index + 1}`}
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
                  {isSelected && (
                    <View style={styles.voteCheckmark}>
                      <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {poll.userVoted && (
          <View style={styles.votedIndicator}>
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text style={styles.votedText}>You voted</Text>
          </View>
        )}
      </View>
    );
  };

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

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateForm(true)}
          >
            <Ionicons name="add" size={24} color="#256E63" />
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {(["all", "open", "closed"] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive,
              ]}
              onPress={() => setStatusFilter(status)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === status && styles.filterButtonTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
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

        {/* Create/Edit Poll Modal */}
        <Modal
          visible={showCreateForm || !!editingPoll}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowCreateForm(false);
            setEditingPoll(null);
          }}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPoll ? "Edit Poll" : "Create Poll"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateForm(false);
                  setEditingPoll(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <CreatePollForm
              initialPoll={editingPoll || undefined}
              onSuccess={(pollData) => {
                if (editingPoll) {
                  handleUpdatePoll(pollData);
                } else {
                  handleCreatePoll(pollData);
                }
              }}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingPoll(null);
              }}
            />
          </SafeAreaView>
        </Modal>
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
  createButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: "row" as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  filterButtonActive: {
    backgroundColor: "#256E63",
    borderColor: "#256E63",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
    fontFamily: "Rubik-SemiBold",
  },
  filterButtonTextActive: {
    color: "#fff",
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
  pollTitleRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 8,
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: "#111827",
    fontFamily: "Rubik-Bold",
    flex: 1,
    marginRight: 8,
  },
  ownerActions: {
    flexDirection: "row" as const,
    gap: 8,
  },
  actionButton: {
    padding: 4,
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
  noOptionsContainer: {
    padding: 16,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCD34D",
    marginBottom: 8,
  },
  noOptionsText: {
    fontSize: 14,
    color: "#92400E",
    fontFamily: "Rubik-Regular",
    textAlign: "center" as const,
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
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 4,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: "#fff",
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
  multiSelectBadge: {
    backgroundColor: "#E8F8F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  multiSelectText: {
    fontSize: 12,
    color: "#256E63",
    fontFamily: "Rubik-Medium",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: "#111827",
    fontFamily: "Rubik-Bold",
  },
  closeButton: {
    padding: 4,
  },
};
