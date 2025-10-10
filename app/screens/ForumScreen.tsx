import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { navigateMainTab } from "../utils/navigation";

interface ForumPost {
  id: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  hasVideo?: boolean;
  videoThumbnail?: string;
  videoTitle?: string;
  videoUrl?: string;
  videoDescription?: string;
}

export default function ForumScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();
  const [newPostText, setNewPostText] = useState("");
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const forumPosts: ForumPost[] = [
    {
      id: "1",
      userName: "Joseph Eluwa",
      content: "Hey, Joesph here. I am willing to learn from you all",
      timestamp: "10:00 AM",
      likes: 1200,
      comments: 1200,
    },
    {
      id: "2",
      userName: "Lizzy Dahunsi",
      content: `I have a testimony to share! 🙏 Last week, I was struggling with a difficult decision at work, and I felt so lost. I reached out to our prayer group here, and the support and prayers I received were incredible. 

Matthew 18:19 says, "Again I say to you, if two of you agree on earth about anything they ask, it will be done for them by my Father in heaven." 

The guidance I received through your prayers and the peace that came over me was truly a blessing. I made the right decision, and I can see God's hand in it all. Thank you all for being such a wonderful community! 💕`,
      timestamp: "9:45 AM",
      likes: 1200,
      comments: 1200,
    },
    {
      id: "3",
      userName: "Lizzy Dahunsi",
      content: `👋 Good morning everyone! ☀️

Just wanted to remind you all about our community study this week: "Week 2: Foundations of Faith" 📖

We'll be diving deep into understanding how the Holy Spirit works in our lives and how we can build stronger foundations in our walk with Christ. 

Scriptures we'll be covering:
- Romans 8:26-27
- 1 Corinthians 12:4-11
- Galatians 5:22-23

Join us in the study room at 7 PM tonight! Let's grow together in faith! 🙏✨`,
      timestamp: "9:30 AM",
      likes: 1200,
      comments: 1200,
    },
    {
      id: "4",
      userName: "Lizzy Dahunsi",
      content: "This message inspired me, thought to share",
      timestamp: "9:15 AM",
      likes: 1200,
      comments: 1200,
      hasVideo: true,
      videoThumbnail:
        "https://via.placeholder.com/300x200/8B4513/FFFFFF?text=PROOF+of+Faith",
      videoTitle:
        "God is Good by Apostle Emmanuel Iren | Accelerate Conference 2025 | Shine: Unleash His Glory",
      videoUrl: "https://www.tevah.com/watch?v=0omiX-5T5xk",
      videoDescription: "This message inspired me, thought to share",
    },
    {
      id: "5",
      userName: "Lizzy Dahunsi",
      content:
        "I have just shared a prayer in the prayer room... Please join me in prayers 🙏",
      timestamp: "9:00 AM",
      likes: 1200,
      comments: 1200,
    },
  ];

  const handleBackToCommunity = () => {
    // Slide out animation to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.push("/screens/PrayerWallScreen");
    });
  };

  const handleVideoPress = (url: string) => {
    Linking.openURL(url);
  };

  const handleStartConversation = () => {
    // TODO: Implement post creation functionality
    console.log("Starting new conversation:", newPostText);
    setNewPostText("");
  };

  const renderForumPost = (post: ForumPost) => (
    <View key={post.id} style={styles.postContainer}>
      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {post.userName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{post.userName}</Text>
        </View>
      </View>

      {/* Post Content */}
      <View style={styles.postContent}>
        <Text style={styles.postText}>{post.content}</Text>
        <Text style={styles.timestamp}>{post.timestamp}</Text>

        {/* Video Content */}
        {post.hasVideo && post.videoThumbnail && (
          <TouchableOpacity
            style={styles.videoContainer}
            onPress={() => post.videoUrl && handleVideoPress(post.videoUrl)}
            activeOpacity={0.8}
          >
            <View style={styles.videoThumbnail}>
              <Text style={styles.videoThumbnailText}>PROOF of Faith</Text>
              <View style={styles.playButton}>
                <Ionicons name="play" size={24} color="white" />
              </View>
            </View>
            <Text style={styles.videoTitle}>{post.videoTitle}</Text>
            {post.videoUrl && (
              <Text style={styles.videoUrl}>{post.videoUrl}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Interaction Bar */}
      <View style={styles.interactionBar}>
        <View style={styles.leftInteractions}>
          <TouchableOpacity
            style={styles.interactionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>{post.likes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.interactionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>{post.comments}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.interactionButton}
          activeOpacity={0.7}
          onPress={() => router.push("/screens/ThreadScreen")}
        >
          <Text style={styles.greaterThanIcon}>{">"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
    >
      <SafeAreaView style={{ flex: 1, paddingTop: 20 }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FCFCFD" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackToCommunity}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Forum</Text>

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

        {/* Forum Posts */}
        <ScrollView
          style={styles.postsContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {forumPosts.map((post, index) => (
            <View key={post.id}>
              {renderForumPost(post)}

              {/* Start Conversation Input - appears after second post */}
              {index === 1 && (
                <View style={styles.startConversationContainer}>
                  <TouchableOpacity style={styles.plusButton}>
                    <Ionicons name="add" size={20} color="#666" />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.conversationInput}
                    placeholder="Start a converstation"
                    placeholderTextColor="#9CA3AF"
                    value={newPostText}
                    onChangeText={setNewPostText}
                    multiline
                  />

                  <TouchableOpacity style={styles.micButton}>
                    <Ionicons name="mic-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <BottomNavOverlay
          selectedTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            navigateMainTab(tab as any);
          }}
        />
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
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
  postsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  postContainer: {
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
  userInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
    fontFamily: "Rubik-Medium",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
    fontFamily: "Rubik-Medium",
  },
  postContent: {
    marginBottom: 12,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
    fontFamily: "Rubik-Regular",
  },
  timestamp: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
    textAlign: "right" as const,
    marginTop: 8,
  },
  videoContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: "hidden" as const,
  },
  videoThumbnail: {
    height: 120,
    backgroundColor: "#8B4513",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  videoThumbnailText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold" as const,
    fontFamily: "Rubik-Bold",
  },
  playButton: {
    position: "absolute" as const,
    top: 200,
    left: 200,
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    fontFamily: "Rubik-Medium",
    marginTop: 8,
    marginBottom: 4,
  },
  videoUrl: {
    fontSize: 12,
    color: "#3B82F6",
    fontFamily: "Rubik-Regular",
  },
  interactionBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  leftInteractions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  interactionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginRight: 20,
  },
  interactionText: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
    marginLeft: 4,
  },
  greaterThanIcon: {
    fontSize: 18,
    color: "#666",
    fontFamily: "Rubik-Regular",
    fontWeight: "bold" as const,
  },
  startConversationContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  },
  conversationInput: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    fontFamily: "Rubik-Regular",
    paddingVertical: 8,
  },
  micButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginLeft: 12,
  },
  bottomNavOverlay: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "transparent",
  },
};
