import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity } from 'react-native';
import { useCommentModal } from '../context/CommentModalContext';

interface Comment {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
}

interface CommentIconProps {
  comments: Comment[];
  size?: number;
  color?: string;
  showCount?: boolean;
  count?: number;
  style?: any;
  layout?: 'horizontal' | 'vertical';
}

export default function CommentIcon({ 
  comments, 
  size = 24, 
  color = '#6B7280', 
  showCount = false, 
  count,
  style,
  layout = 'horizontal'
}: CommentIconProps) {
  const { showCommentModal } = useCommentModal();

  const handlePress = () => {
    showCommentModal(comments);
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[
        { 
          flexDirection: layout === 'vertical' ? 'column' : 'row', 
          alignItems: 'center',
          justifyContent: 'center'
        }, 
        style
      ]}
    >
      <Ionicons name="chatbubble-outline" size={size} color={color} />
      {showCount && (
        <Text style={{ 
          marginLeft: layout === 'vertical' ? 0 : 4,
          marginTop: layout === 'vertical' ? 2 : 0,
          fontSize: layout === 'vertical' ? 10 : 12, 
          color: color,
          fontWeight: '500',
          textAlign: 'center'
        }}>
          {count || comments.length}
        </Text>
      )}
    </TouchableOpacity>
  );
}



