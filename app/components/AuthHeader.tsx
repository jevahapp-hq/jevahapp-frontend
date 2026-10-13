









import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts } from '../../src/shared/theme/fonts';
import { safeGoBack } from '../../src/shared/navigation/safeGoBack';

interface AuthHeaderProps {
  title?: string;
  showCancel?: boolean;
  showBack?: boolean;
  onBackPress?: () => void;
  onCancelPress?: () => void;
  rightComponent?: React.ReactNode;
}

export default function AuthHeader({ 
  title, 
  showCancel = true, 
  showBack = true,
  onBackPress,
  onCancelPress,
  rightComponent
}: AuthHeaderProps) {
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      safeGoBack();
    }
  };

  const handleCancelPress = () => {
    if (onCancelPress) {
      onCancelPress();
    } else {
      safeGoBack();
    }
  };

  return (
    <SafeAreaView 
      className="w-full" 
      edges={['top']}
      style={{ backgroundColor: 'white' }}
    >
      {/* Status Bar Configuration */}
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      
      {/* Header Container */}
      <View className="w-full bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between w-full px-4 py-3" style={{ paddingTop: 20 }}>
          {/* Left Side - Back Button */}
          <View className="w-10 h-10 items-center justify-center">
            {showBack ? (
              <TouchableOpacity 
                onPress={handleBackPress}
                className="w-10 h-10 items-center justify-center rounded-full bg-gray-50"
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={20} color="#3B3B3B" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Center - Title */}
          <View className="flex-1 items-center">
            {title ? (
              <Text
                className="text-[17px] text-[#3B3B3B] text-center"
                style={{ fontFamily: Fonts.bold }}
              >
                {title}
              </Text>
            ) : null}
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
                <MaterialIcons name="close" size={20} color="#3B3B3B" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
