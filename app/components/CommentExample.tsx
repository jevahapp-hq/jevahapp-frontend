import { StyleSheet, Text, View } from 'react-native';
import CommentIcon from './CommentIcon';

interface Comment {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
}

interface CommentExampleProps {
  comments: Comment[];
  title?: string;
  content?: string;
}

export default function CommentExample({ 
  comments, 
  title = "Sample Post", 
  content = "This is a sample post content that demonstrates how to use the comment icon component." 
}: CommentExampleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
      
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <CommentIcon 
            comments={comments}
            size={20}
            color="#6B7280"
            showCount={true}
          />
        </View>
        
        <View style={styles.rightActions}>
          <Text style={styles.timestamp}>2 hours ago</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D2939',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
