import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MobileHeaderProps {
  // Header type
  type?: 'main' | 'auth' | 'search' | 'profile' | 'custom';
  
  // Title and subtitle
  title?: string;
  subtitle?: string;
  
  // User info for main header
  user?: {
    firstName: string;
    lastName: string;
    avatar?: string;
    section?: string;
    isOnline?: boolean;
  };
  
  // Navigation
  showBack?: boolean;
  showCancel?: boolean;
  onBackPress?: () => void;
  onCancelPress?: () => void;
  
  // Action buttons
  leftAction?: {
    icon: string;
    onPress: () => void;
    badge?: boolean;
  };
  rightActions?: Array<{
    icon: string;
    onPress: () => void;
    badge?: boolean;
    badgeCount?: number;
  }>;
  
  // Custom components
  leftComponent?: React.ReactNode;
  centerComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  
  // Styling
  backgroundColor?: string;
  textColor?: string;
  borderBottom?: boolean;
  
  // Status bar
  statusBarStyle?: 'light-content' | 'dark-content';
  statusBarBackgroundColor?: string;
}

export default function MobileHeader({
  type = 'main',
  title,
  subtitle,
  user,
  showBack = true,
  showCancel = true,
  onBackPress,
  onCancelPress,
  leftAction,
  rightActions = [],
  leftComponent,
  centerComponent,
  rightComponent,
  backgroundColor = 'white',
  textColor = '#3B3B3B',
  borderBottom = true,
  statusBarStyle = 'dark-content',
  statusBarBackgroundColor = 'transparent'
}: MobileHeaderProps) {
  const [avatarError, setAvatarError] = useState(false);
  
  const router = useRouter();
  
  console.log("🔍 MobileHeader: Received user data:", user);
  
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleCancelPress = () => {
    if (onCancelPress) {
      onCancelPress();
    } else {
      router.back();
    }
  };

  const renderMainHeader = () => (
    <View className="flex-row items-center justify-between w-full px-4 py-3">
      {/* Left Side - User Profile */}
      <TouchableOpacity 
        onPress={() => router.push("/Profile/ProfileSwitch")}
        className="flex-row items-center flex-1"
        activeOpacity={0.7}
      >
        <View className="relative">
          {user?.avatar && user.avatar.trim() && user.avatar.startsWith("http") && !avatarError ? (
            <Image
              source={{ uri: user.avatar.trim() }}
              className="w-10 h-10 rounded-lg"
              style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              onError={(error) => {
                console.warn("❌ Failed to load avatar image:", error.nativeEvent.error);
                setAvatarError(true);
              }}
              onLoad={() => {
                console.log("✅ Avatar image loaded successfully:", user?.avatar);
              }}
            />
          ) : (
            <View 
              className="w-10 h-10 rounded-lg justify-center items-center"
              style={{ 
                borderWidth: 1, 
                borderColor: '#E5E7EB',
                backgroundColor: '#F3F4F6'
              }}
            >
              <Text className="text-gray-600 font-rubik-semibold text-sm">
                {user?.firstName?.[0]?.toUpperCase() || user?.lastName?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
          {user?.isOnline && (
            <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-rubik font-semibold text-[#3B3B3B] leading-5">
            {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
          </Text>
          <Text className="text-[12px] text-[#3B3B3B] font-rubik font-medium mt-0.5">
            {user?.section?.toUpperCase() || "USER"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Right Side - Action Buttons */}
      <View className="flex-row items-center space-x-3">
        {rightActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            onPress={action.onPress}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 relative"
            activeOpacity={0.7}
          >
            <Ionicons name={action.icon as any} size={20} color={textColor} />
            {action.badge && (
              <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
            {action.badgeCount && action.badgeCount > 0 && (
              <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full items-center justify-center">
                <Text className="text-white text-[10px] font-rubik font-bold">
                  {action.badgeCount > 99 ? '99+' : action.badgeCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAuthHeader = () => (
    <View className="flex-row items-center justify-between w-full px-4 py-3">
      {/* Left Side - Back Button */}
      <View className="w-10 h-10 items-center justify-center">
        {showBack ? (
          <TouchableOpacity 
            onPress={handleBackPress}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-50"
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Center - Title */}
      <View className="flex-1 items-center">
        <Text className="text-[17px] font-rubik font-semibold text-[#3B3B3B] text-center">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-[13px] text-[#3B3B3B] font-rubik text-center mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Side - Cancel Button or Custom Component */}
      <View className="w-10 h-10 items-center justify-center">
        {rightComponent ? (
          rightComponent
        ) : showCancel ? (
          <TouchableOpacity 
            onPress={handleCancelPress}
            className="w-10 h-10 items-center justify-center rounded-full bg-gray-50"
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderCustomHeader = () => (
    <View className="flex-row items-center justify-between w-full px-4 py-3">
      {/* Left Side */}
      <View className="flex-1">
        {leftComponent || (
          leftAction ? (
            <TouchableOpacity
              onPress={leftAction.onPress}
              className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 relative"
              activeOpacity={0.7}
            >
              <Ionicons name={leftAction.icon as any} size={20} color={textColor} />
              {leftAction.badge && (
                <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
              )}
            </TouchableOpacity>
          ) : null
        )}
      </View>

      {/* Center */}
      <View className="flex-1 items-center">
        {centerComponent || (
          title ? (
            <View>
              <Text className="text-[17px] font-rubik font-semibold text-[#3B3B3B] text-center">
                {title}
              </Text>
              {subtitle && (
                <Text className="text-[13px] text-[#3B3B3B] font-rubik text-center mt-0.5">
                  {subtitle}
                </Text>
              )}
            </View>
          ) : null
        )}
      </View>

      {/* Right Side */}
      <View className="flex-1 items-end">
        {rightComponent || (
          <View className="flex-row items-center space-x-3">
            {rightActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={action.onPress}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-50 relative"
                activeOpacity={0.7}
              >
                <Ionicons name={action.icon as any} size={20} color={textColor} />
                {action.badge && (
                  <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                )}
                {action.badgeCount && action.badgeCount > 0 && (
                  <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full items-center justify-center">
                    <Text className="text-white text-[10px] font-rubik font-bold">
                      {action.badgeCount > 99 ? '99+' : action.badgeCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderHeaderContent = () => {
    switch (type) {
      case 'main':
        return renderMainHeader();
      case 'auth':
        return renderAuthHeader();
      case 'custom':
        return renderCustomHeader();
      default:
        return renderCustomHeader();
    }
  };

  return (
    <SafeAreaView 
      className="w-full" 
      edges={['top']}
      style={{ backgroundColor }}
    >
      {/* Status Bar Configuration */}
      <StatusBar 
        barStyle={statusBarStyle} 
        backgroundColor={statusBarBackgroundColor} 
        translucent={true}
      />
      
      {/* Header Container */}
      <View 
        className={`w-full ${borderBottom ? 'border-b border-gray-100' : ''}`}
        style={{ backgroundColor }}
      >
        {renderHeaderContent()}
      </View>
    </SafeAreaView>
  );
}

