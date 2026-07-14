import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
import { ForumPost as ForumPostType } from "../../../utils/communityAPI";
import { formatTimestamp } from "../../../utils/communityHelpers";
import { styles } from "../styles";
import { getAuthorInitials, getAuthorName } from "../utils/postAuthors";

type ForumPostCardProps = {
  post: ForumPostType;
  isOwner: boolean;
  onEdit: (post: ForumPostType) => void;
  onDelete: (postId: string) => void;
  onLike: (post: ForumPostType) => void;
};

export function ForumPostCard({
  post,
  isOwner,
  onEdit,
  onDelete,
  onLike,
}: ForumPostCardProps) {
  const router = useRouter();

  const handleVideoPress = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={styles.postContainer}>
      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {post.author?.avatarUrl || post.user?.avatar ? (
              <Image
                source={{ uri: post.author?.avatarUrl || post.user?.avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{getAuthorInitials(post)}</Text>
            )}
          </View>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{getAuthorName(post)}</Text>
          {post.forum?.title && (
            <Text style={styles.forumBadge}>{post.forum.title}</Text>
          )}
        </View>
        {isOwner && (
          <View style={styles.postActions}>
            <TouchableOpacity
              onPress={() => onEdit(post)}
              style={styles.actionButton}
            >
              <Ionicons name="create-outline" size={18} color="#256E63" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(post._id)}
              style={styles.actionButton}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Post Content */}
      <View style={styles.postContent}>
        <Text style={styles.postText}>{post.content}</Text>
        <Text style={styles.timestamp}>{formatTimestamp(post.createdAt)}</Text>

        {/* Embedded Links */}
        {post.embeddedLinks && post.embeddedLinks.length > 0 && (
          <View style={styles.embeddedLinksContainer}>
            {post.embeddedLinks.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={styles.videoContainer}
                onPress={() => handleVideoPress(link.url)}
                activeOpacity={0.8}
              >
                {link.thumbnail && (
                  <View style={styles.videoThumbnail}>
                    <Text style={styles.videoThumbnailText}>
                      {link.type === "video" ? "VIDEO" : "LINK"}
                    </Text>
                    <View style={styles.playButton}>
                      <Ionicons
                        name={link.type === "video" ? "play" : "link"}
                        size={24}
                        color="white"
                      />
                    </View>
                  </View>
                )}
                {link.title && (
                  <Text style={styles.videoTitle}>{link.title}</Text>
                )}
                {link.description && (
                  <Text style={styles.videoDescription}>{link.description}</Text>
                )}
                <Text style={styles.videoUrl}>{link.url}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Interaction Bar */}
      <View style={styles.interactionBar}>
        <View style={styles.leftInteractions}>
          <TouchableOpacity
            style={styles.interactionButton}
            activeOpacity={0.7}
            onPress={() => onLike(post)}
          >
            <Ionicons
              name={post.userLiked ? "heart" : "heart-outline"}
              size={20}
              color={post.userLiked ? "#EF4444" : "#666"}
            />
            <Text style={styles.interactionText}>{post.likesCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.interactionButton}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/screens/ThreadScreen",
                params: { postId: post._id },
              })
            }
          >
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>
              {post.commentsCount || 0}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.interactionButton}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: "/screens/ThreadScreen",
              params: { postId: post._id },
            })
          }
        >
          <Text style={styles.greaterThanIcon}>{">"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
