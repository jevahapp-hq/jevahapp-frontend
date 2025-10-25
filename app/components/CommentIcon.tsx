import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
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
  contentId?: string;
}

export default function CommentIcon({ 
  comments, 
  size = 24, 
  color = '#6B7280', 
  showCount = false, 
  count,
  style,
  layout = 'horizontal',
  contentId
}: CommentIconProps) {
  const { showCommentModal } = useCommentModal();

  const handlePress = () => {
    console.log("🎯 CommentIcon touched - contentId:", contentId);
    showCommentModal(comments, contentId);
  };

  return (
    <Pressable 
      onPress={handlePress}
      onPressIn={() => console.log('👆 onPressIn CommentIcon', contentId)}
      onPressOut={() => console.log('👇 onPressOut CommentIcon', contentId)}
      pointerEvents="box-only"
      collapsable={false}
      hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
      style={({ pressed }) => [
        { 
          flexDirection: layout === 'vertical' ? 'column' : 'row', 
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: size + 44, // Even larger touch area
          minWidth: size + 44,
          padding: 12,
          backgroundColor: 'rgba(0,0,0,0.001)', // ensure native hitbox
          position: 'relative',
          zIndex: 10,
          elevation: 10, // Android
          opacity: pressed ? 0.7 : 1
        }, 
        style
      ]}
    >
      <Ionicons 
        name="chatbubble-outline" 
        size={size} 
        color={color}
        style={{ pointerEvents: 'none' }}
      />
      {showCount && (
        <Text style={{ 
          marginLeft: layout === 'vertical' ? 0 : 4,
          marginTop: layout === 'vertical' ? 2 : 0,
          fontSize: layout === 'vertical' ? 10 : 12, 
          color: color,
          fontWeight: '500',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          {count || comments.length}
        </Text>
      )}
    </Pressable>
  );
}



