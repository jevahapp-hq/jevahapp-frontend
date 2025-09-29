import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Poll {
  id: string;
  title: string;
  description: string;
  options: PollOption[];
  totalVotes: number;
  timestamp: string;
  hasVoted: boolean;
  userVote?: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export default function PollsScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;

  const polls: Poll[] = [
    {
      id: "1",
      title: "What is your favorite time to pray?",
      description: "Help us understand the community's prayer habits",
      totalVotes: 245,
      timestamp: "2 hours ago",
      hasVoted: false,
      options: [
        { id: "1", text: "Early morning (5-7 AM)", votes: 89, percentage: 36 },
        { id: "2", text: "Mid-morning (8-10 AM)", votes: 67, percentage: 27 },
        { id: "3", text: "Evening (6-8 PM)", votes: 54, percentage: 22 },
        { id: "4", text: "Late night (9-11 PM)", votes: 35, percentage: 15 },
      ],
    },
    {
      id: "2",
      title: "Which Bible study topic interests you most?",
      description: "Let us know what you'd like to study next",
      totalVotes: 189,
      timestamp: "5 hours ago",
      hasVoted: true,
      userVote: "2",
      options: [
        { id: "1", text: "The Book of Psalms", votes: 45, percentage: 24 },
        { id: "2", text: "The Book of Proverbs", votes: 67, percentage: 35 },
        { id: "3", text: "The Book of Romans", votes: 41, percentage: 22 },
        { id: "4", text: "The Book of Revelation", votes: 36, percentage: 19 },
      ],
    },
  ];

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

  const handleVote = (pollId: string, optionId: string) => {
    // TODO: Implement voting functionality
    console.log("Voting for poll:", pollId, "option:", optionId);
  };

  const renderPoll = (poll: Poll) => (
    <View key={poll.id} style={styles.pollContainer}>
      <View style={styles.pollHeader}>
        <Text style={styles.pollTitle}>{poll.title}</Text>
        <Text style={styles.pollDescription}>{poll.description}</Text>
        <View style={styles.pollMeta}>
          <Text style={styles.pollTimestamp}>{poll.timestamp}</Text>
          <Text style={styles.pollVotes}>{poll.totalVotes} votes</Text>
        </View>
      </View>

      <View style={styles.pollOptions}>
        {poll.options.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.pollOption,
              poll.hasVoted &&
                poll.userVote === option.id &&
                styles.selectedOption,
            ]}
            onPress={() => !poll.hasVoted && handleVote(poll.id, option.id)}
            activeOpacity={0.7}
            disabled={poll.hasVoted}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionText,
                  poll.hasVoted &&
                    poll.userVote === option.id &&
                    styles.selectedOptionText,
                ]}
              >
                {option.text}
              </Text>
              {poll.hasVoted && (
                <Text style={styles.optionPercentage}>
                  {option.percentage}%
                </Text>
              )}
            </View>
            {poll.hasVoted && (
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${option.percentage}%` },
                  ]}
                />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {poll.hasVoted && (
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
        <ScrollView
          style={styles.pollsContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {polls.map(renderPoll)}
        </ScrollView>
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
};
