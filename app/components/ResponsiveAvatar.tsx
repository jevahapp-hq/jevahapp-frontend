import { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    getAvatarSize,
    getResponsiveBorderRadius,
    getResponsiveFontSize,
    getResponsiveSpacing
} from '../../utils/responsive';

interface ResponsiveAvatarProps {
  source?: string | number | null;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  fallbackText?: string;
  fallbackColor?: string;
  onPress?: () => void;
  showBorder?: boolean;
  borderColor?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
  loading?: boolean;
  style?: any;
  imageStyle?: any;
}

export default function ResponsiveAvatar({
  source,
  size = 'medium',
  fallbackText,
  fallbackColor = '#256E63',
  onPress,
  showBorder = false,
  borderColor = '#E5E7EB',
  showOnlineIndicator = false,
  isOnline = false,
  loading = false,
  style,
  imageStyle,
}: ResponsiveAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const avatarSize = getAvatarSize(size);
  const borderRadius = getResponsiveBorderRadius('round');
  const fontSize = getResponsiveFontSize(
    size === 'small' ? 12 : size === 'medium' ? 14 : size === 'large' ? 16 : 18,
    size === 'small' ? 14 : size === 'medium' ? 16 : size === 'large' ? 18 : 20,
    size === 'small' ? 16 : size === 'medium' ? 18 : size === 'large' ? 20 : 22,
    size === 'small' ? 18 : size === 'medium' ? 20 : size === 'large' ? 22 : 24
  );

  // Generate fallback text from user name or initials
  const getFallbackText = () => {
    if (fallbackText) return fallbackText;
    
    // If source is a string (URL), try to extract name from URL
    if (typeof source === 'string' && source.includes('/')) {
      const urlParts = source.split('/');
      const fileName = urlParts[urlParts.length - 1];
      if (fileName && fileName.includes('-')) {
        const namePart = fileName.split('-')[0];
        return namePart.charAt(0).toUpperCase();
      }
    }
    
    // Default fallback
    return 'U';
  };

  // Handle image source
  const getImageSource = () => {
    if (!source) return null;
    
    if (typeof source === 'number') {
      return source;
    }
    
    if (typeof source === 'string') {
      // Handle MongoDB avatar URLs
      if (source.startsWith('http')) {
        return { uri: source.trim() };
      }
      
      // Handle local file paths
      if (source.startsWith('file://')) {
        return { uri: source };
      }
      
      // Handle relative paths
      if (source.startsWith('/')) {
        return { uri: source };
      }
      
      // For asset names, we'll use a fallback approach
      // since dynamic require is not allowed in React Native
      return null;
    }
    
    return null;
  };

  const imageSource = getImageSource();
  const shouldShowFallback = !imageSource || imageError || loading || !source;

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={[styles.loadingContainer, { width: avatarSize, height: avatarSize }]}>
          <ActivityIndicator size="small" color={fallbackColor} />
        </View>
      );
    }

    if (shouldShowFallback) {
      return (
        <View
          style={[
            styles.fallbackContainer,
            {
              width: avatarSize,
              height: avatarSize,
              backgroundColor: fallbackColor,
              borderRadius,
            },
          ]}
        >
          <Text
            style={[
              styles.fallbackText,
              {
                fontSize,
                color: 'white',
              },
            ]}
          >
            {getFallbackText()}
          </Text>
        </View>
      );
    }

    return (
      <Image
        source={imageSource}
        style={[
          styles.image,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius,
          },
          imageStyle,
        ]}
        onLoadStart={() => setImageLoading(true)}
        onLoad={handleImageLoad}
        onError={handleImageError}
        resizeMode="cover"
      />
    );
  };

  const containerStyle = [
    styles.container,
    {
      width: avatarSize,
      height: avatarSize,
      borderRadius,
      borderWidth: showBorder ? 2 : 0,
      borderColor: showBorder ? borderColor : 'transparent',
    },
    style,
  ];

  const content = (
    <View style={containerStyle}>
      {renderContent()}
      {showOnlineIndicator && (
        <View
          style={[
            styles.onlineIndicator,
            {
              backgroundColor: isOnline ? '#10B981' : '#9CA3AF',
              width: getResponsiveSpacing(8, 10, 12, 14),
              height: getResponsiveSpacing(8, 10, 12, 14),
              borderRadius: getResponsiveSpacing(4, 5, 6, 7),
              borderWidth: 2,
              borderColor: 'white',
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  touchable: {
    // TouchableOpacity styles
  },
  image: {
    // Image styles are applied inline
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
});

// Predefined avatar components for common use cases
export const UserAvatar = ({
  user,
  size = 'medium',
  onPress,
  showOnlineIndicator = true,
}: {
  user?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    isOnline?: boolean;
  } | null;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  onPress?: () => void;
  showOnlineIndicator?: boolean;
}) => {
  const fallbackText = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
    : 'U';

  return (
    <ResponsiveAvatar
      source={user?.avatar}
      size={size}
      fallbackText={fallbackText}
      onPress={onPress}
      showOnlineIndicator={showOnlineIndicator}
      isOnline={user?.isOnline}
      showBorder={true}
    />
  );
};

export const GroupAvatar = ({
  members,
  size = 'medium',
  onPress,
}: {
  members: Array<{ firstName?: string; lastName?: string; avatar?: string }>;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  onPress?: () => void;
}) => {
  if (members.length === 0) {
    return (
      <ResponsiveAvatar
        size={size}
        fallbackText="G"
        fallbackColor="#6B7280"
        onPress={onPress}
        showBorder={true}
      />
    );
  }

  if (members.length === 1) {
    return (
      <UserAvatar
        user={members[0]}
        size={size}
        onPress={onPress}
        showOnlineIndicator={false}
      />
    );
  }

  // For multiple members, show first member's avatar with a badge
  const firstMember = members[0];
  const fallbackText = `${firstMember.firstName?.charAt(0) || ''}${firstMember.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <View style={{ position: 'relative' }}>
      <ResponsiveAvatar
        source={firstMember.avatar}
        size={size}
        fallbackText={fallbackText}
        onPress={onPress}
        showBorder={true}
      />
      <View
        style={{
          position: 'absolute',
          top: -4,
          right: -4,
          backgroundColor: '#256E63',
          borderRadius: getResponsiveSpacing(8, 10, 12, 14),
          minWidth: getResponsiveSpacing(16, 18, 20, 22),
          height: getResponsiveSpacing(16, 18, 20, 22),
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: 'white',
        }}
      >
        <Text
          style={{
            color: 'white',
            fontSize: getResponsiveFontSize(10, 12, 14, 16),
            fontWeight: '600',
          }}
        >
          {members.length > 9 ? '9+' : members.length}
        </Text>
      </View>
    </View>
  );
};

export const ChannelAvatar = ({
  name,
  avatar,
  size = 'medium',
  onPress,
}: {
  name: string;
  avatar?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  onPress?: () => void;
}) => {
  const fallbackText = name.charAt(0).toUpperCase();

  return (
    <ResponsiveAvatar
      source={avatar}
      size={size}
      fallbackText={fallbackText}
      fallbackColor="#8B5CF6"
      onPress={onPress}
      showBorder={true}
    />
  );
};
