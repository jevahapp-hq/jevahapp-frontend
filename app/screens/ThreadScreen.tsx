import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Reply {
  id: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: string;
  isFromOriginalPoster?: boolean;
}

interface ThreadPost {
  id: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
}

export default function ThreadScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();
  const [newComment, setNewComment] = useState('');
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  const mainPost: ThreadPost = {
    id: '1',
    userName: 'Lizzy Dahunsi',
    content: `I posted a prayer in our community group for guidance on a difficult decision I had to make at work. I was torn between two options and didn't know which path to take. The support and prayers I received from this community were incredible.

Matthew 18:19 says, "Again I say to you, if two of you agree on earth about anything they ask, it will be done for them by my Father in heaven."

Through your prayers and the peace that came over me, I was able to make the right decision. I can see God's hand in it all, and the outcome has been better than I could have imagined. Thank you all for being such a wonderful community and for lifting me up in prayer. 🙏✨`,
    timestamp: '10:00 AM',
    likes: 1200,
    comments: 1200,
  };

  const replies: Reply[] = [
    {
      id: '1',
      userName: 'Elizabeth',
      message: 'Congratulations',
      timestamp: '10:00 AM',
    },
    {
      id: '2',
      userName: 'Lizzy Dahunsi',
      message: 'Oh yes! Our God answers prayers',
      timestamp: '10:00 AM',
      isFromOriginalPoster: true,
    },
    {
      id: '3',
      userName: 'Grace',
      message: 'Your testimony shall be permanent',
      timestamp: '10:00 AM',
    },
    {
      id: '4',
      userName: 'Joe',
      message: 'I am also trusting God for my testimony o.... Thank you for sharing. Soon I will come and give thanks',
      timestamp: '10:00 AM',
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

  const handleBackToForum = () => {
    // Slide out animation to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.back();
    });
  };

  const handleClose = () => {
    handleBackToForum();
  };

  const handleSendComment = () => {
    if (newComment.trim()) {
      // TODO: Implement comment sending functionality
      console.log('Sending comment:', newComment);
      setNewComment('');
    }
  };

  const renderMainPost = () => (
    <View style={styles.mainPostContainer}>
      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {mainPost.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{mainPost.userName}</Text>
        </View>
      </View>

      {/* Post Content */}
      <View style={styles.postContent}>
        <Text style={styles.postText}>{mainPost.content}</Text>
        <Text style={styles.timestamp}>{mainPost.timestamp}</Text>
      </View>

      {/* Interaction Bar */}
      <View style={styles.interactionBar}>
        <View style={styles.leftInteractions}>
          <TouchableOpacity style={styles.interactionButton} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>{mainPost.likes}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.interactionButton} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>{mainPost.comments}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderReply = (reply: Reply) => (
    <View key={reply.id} style={styles.replyContainer}>
      <View style={styles.replyUserInfo}>
        <View style={styles.replyAvatar}>
          <Text style={styles.replyAvatarText}>
            {reply.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.replyUserName}>{reply.userName}</Text>
      </View>
      
      <View style={[
        styles.replyBubble,
        reply.isFromOriginalPoster ? styles.originalPosterBubble : styles.otherUserBubble
      ]}>
        <Text style={styles.replyText}>{reply.message}</Text>
      </View>
      
      <View style={styles.replyTimestamp}>
        <Text style={styles.replyTimeText}>{reply.timestamp}</Text>
        <Ionicons name="checkmark" size={12} color="#9CA3AF" />
      </View>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FCFCFD" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToForum} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Thread</Text>
          
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Main Post */}
        {renderMainPost()}

        {/* Replies Section */}
        <ScrollView style={styles.repliesContainer} showsVerticalScrollIndicator={false}>
          {replies.map(renderReply)}
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <View style={styles.commentInputWrapper}>
            <View style={styles.currentUserAvatar}>
              <Text style={styles.currentUserAvatarText}>JD</Text>
            </View>
            
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment"
              placeholderTextColor="#9CA3AF"
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={handleSendComment}
              activeOpacity={0.7}
            >
              <Ionicons name="caret-down" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#FCFCFD',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#000',
    fontFamily: 'Rubik-Bold',
  },
  closeButton: {
    padding: 8,
  },
  mainPostContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    fontFamily: 'Rubik-Medium',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
    fontFamily: 'Rubik-Medium',
  },
  postContent: {
    marginBottom: 12,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    fontFamily: 'Rubik-Regular',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Rubik-Regular',
    textAlign: 'right' as const,
    marginTop: 8,
  },
  interactionBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  leftInteractions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  interactionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginRight: 20,
  },
  interactionText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Rubik-Regular',
    marginLeft: 4,
  },
  repliesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  replyContainer: {
    marginBottom: 16,
  },
  replyUserInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 8,
  },
  replyAvatarText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#374151',
    fontFamily: 'Rubik-Medium',
  },
  replyUserName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#111827',
    fontFamily: 'Rubik-Medium',
  },
  replyBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  originalPosterBubble: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start' as const,
  },
  otherUserBubble: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start' as const,
  },
  replyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    fontFamily: 'Rubik-Regular',
  },
  replyTimestamp: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginLeft: 8,
  },
  replyTimeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Rubik-Regular',
    marginRight: 4,
  },
  commentInputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentInputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  currentUserAvatarText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#374151',
    fontFamily: 'Rubik-Medium',
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontFamily: 'Rubik-Regular',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: 12,
  },
};
