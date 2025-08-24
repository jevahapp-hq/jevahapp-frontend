import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import {
    getResponsiveBorderRadius,
    getResponsiveShadow,
    getResponsiveSpacing,
    getResponsiveTextStyle,
} from '../../utils/responsive';
import CommentButton from './CommentButton';

interface ContentCardProps {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'audio' | 'article';
  commentCount?: number;
}

export default function CommentDemo() {
  const [contentItems] = useState<ContentCardProps[]>([
    {
      id: 'content-1',
      title: 'Amazing Gospel Music',
      description: 'Beautiful worship songs that will uplift your spirit',
      type: 'audio',
      commentCount: 12,
    },
    {
      id: 'content-2',
      title: 'Sunday Sermon: Faith and Hope',
      description: 'An inspiring message about maintaining faith in difficult times',
      type: 'video',
      commentCount: 8,
    },
    {
      id: 'content-3',
      title: 'Daily Devotional: Psalm 23',
      description: 'A deep dive into the meaning and comfort of Psalm 23',
      type: 'article',
      commentCount: 15,
    },
  ]);

  const handleCommentPosted = (comment: any) => {
    console.log('New comment posted:', comment);
    Alert.alert('Comment Posted', `"${comment.text}" was posted successfully!`);
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return 'play-circle-outline';
      case 'audio':
        return 'musical-notes-outline';
      case 'article':
        return 'document-text-outline';
      default:
        return 'document-outline';
    }
  };

  const getContentColor = (type: string) => {
    switch (type) {
      case 'video':
        return '#EF4444';
      case 'audio':
        return '#10B981';
      case 'article':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#F9FAFB',
      paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
      paddingVertical: getResponsiveSpacing(20, 24, 28, 32),
    }}>
      <Text style={[
        getResponsiveTextStyle('title'),
        {
          color: '#374151',
          fontWeight: '700',
          marginBottom: getResponsiveSpacing(20, 24, 28, 32),
          textAlign: 'center',
        }
      ]}>
        Comment System Demo
      </Text>
      
      <Text style={[
        getResponsiveTextStyle('body'),
        {
          color: '#6B7280',
          marginBottom: getResponsiveSpacing(24, 28, 32, 36),
          textAlign: 'center',
          lineHeight: 22,
        }
      ]}>
        Tap the comment button on any content card to open the comment modal and interact with the comment system.
      </Text>

      {contentItems.map((item) => (
        <View
          key={item.id}
          style={{
            backgroundColor: 'white',
            padding: getResponsiveSpacing(16, 20, 24, 28),
            marginBottom: getResponsiveSpacing(16, 20, 24, 28),
            borderRadius: getResponsiveBorderRadius('large'),
            ...getResponsiveShadow(),
          }}
        >
          {/* Content Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: getResponsiveSpacing(12, 16, 20, 24),
          }}>
            <View style={{
              width: getResponsiveSpacing(40, 44, 48, 52),
              height: getResponsiveSpacing(40, 44, 48, 52),
              borderRadius: getResponsiveBorderRadius('round'),
              backgroundColor: getContentColor(item.type) + '20',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: getResponsiveSpacing(12, 16, 20, 24),
            }}>
              <Ionicons
                name={getContentIcon(item.type) as any}
                size={24}
                color={getContentColor(item.type)}
              />
            </View>
            
            <View style={{ flex: 1 }}>
              <Text style={[
                getResponsiveTextStyle('subtitle'),
                {
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: getResponsiveSpacing(2, 4, 6, 8),
                }
              ]}>
                {item.title}
              </Text>
              <Text style={[
                getResponsiveTextStyle('caption'),
                {
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  fontWeight: '500',
                }
              ]}>
                {item.type}
              </Text>
            </View>
          </View>

          {/* Content Description */}
          <Text style={[
            getResponsiveTextStyle('body'),
            {
              color: '#4B5563',
              lineHeight: 20,
              marginBottom: getResponsiveSpacing(16, 20, 24, 28),
            }
          ]}>
            {item.description}
          </Text>

          {/* Action Buttons */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              {/* Play Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                  paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                  backgroundColor: getContentColor(item.type),
                  borderRadius: getResponsiveBorderRadius('medium'),
                  marginRight: getResponsiveSpacing(8, 12, 16, 20),
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="play"
                  size={16}
                  color="white"
                  style={{ marginRight: getResponsiveSpacing(4, 6, 8, 10) }}
                />
                <Text style={[
                  getResponsiveTextStyle('caption'),
                  {
                    color: 'white',
                    fontWeight: '600',
                  }
                ]}>
                  Play
                </Text>
              </TouchableOpacity>

              {/* Like Button */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                  paddingVertical: getResponsiveSpacing(6, 8, 10, 12),
                  backgroundColor: '#F3F4F6',
                  borderRadius: getResponsiveBorderRadius('medium'),
                  marginRight: getResponsiveSpacing(8, 12, 16, 20),
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="heart-outline"
                  size={16}
                  color="#6B7280"
                  style={{ marginRight: getResponsiveSpacing(4, 6, 8, 10) }}
                />
                <Text style={[
                  getResponsiveTextStyle('caption'),
                  {
                    color: '#6B7280',
                    fontWeight: '500',
                  }
                ]}>
                  24
                </Text>
              </TouchableOpacity>
            </View>

            {/* Comment Button */}
            <CommentButton
              contentId={item.id}
              contentTitle={item.title}
              commentCount={item.commentCount}
              onCommentPosted={handleCommentPosted}
              size="medium"
              showCount={true}
            />
          </View>
        </View>
      ))}

      {/* Instructions */}
      <View style={{
        backgroundColor: '#EFF6FF',
        padding: getResponsiveSpacing(16, 20, 24, 28),
        borderRadius: getResponsiveBorderRadius('medium'),
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
      }}>
        <Text style={[
          getResponsiveTextStyle('subtitle'),
          {
            color: '#1E40AF',
            fontWeight: '600',
            marginBottom: getResponsiveSpacing(8, 12, 16, 20),
          }
        ]}>
          How to Use:
        </Text>
        <Text style={[
          getResponsiveTextStyle('body'),
          {
            color: '#1E3A8A',
            lineHeight: 20,
          }
        ]}>
          • Tap the comment button (💬) on any content card{'\n'}
          • Type your comment in the modal that opens{'\n'}
          • Press "Post" to submit your comment{'\n'}
          • Like other comments by tapping the heart icon{'\n'}
          • Comments are persisted locally for demo purposes
        </Text>
      </View>
    </View>
  );
}
