 // components/AllowPermissionsScreen.tsx


import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsiveTextStyle,
  getResponsiveBorderRadius,
  getResponsiveShadow,
  getIconSize,
  getResponsiveSize,
} from "../../utils/responsive";

const AllowPermissionsScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.back();
    }
  };

  const handleCancelPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: 'white',
      paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
      paddingTop: getResponsiveSpacing(40, 44, 48, 52),
      paddingBottom: getResponsiveSpacing(20, 24, 28, 32),
    }}>
      {/* Header - Same pattern as GoLive */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: getResponsiveSpacing(20, 24, 28, 32),
        paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
      }}>
        {/* Back Button */}
        <TouchableOpacity 
          onPress={handleBackPress} 
          activeOpacity={0.7}
          style={{
            padding: getResponsiveSpacing(4, 6, 8, 10),
          }}
        >
          <Ionicons 
            name="arrow-back" 
            size={getIconSize('medium')} 
            color="#000" 
          />
        </TouchableOpacity>
        
        {/* Title */}
        <Text style={[
          getResponsiveTextStyle('subtitle'),
          {
            color: '#3B3B3B',
            fontWeight: '600',
          }
        ]}>
          Allow Permissions
        </Text>
        
        {/* Cancel Button */}
        <TouchableOpacity 
          onPress={handleCancelPress} 
          activeOpacity={0.7}
          style={{
            padding: getResponsiveSpacing(4, 6, 8, 10),
          }}
        >
          <Feather 
            name="x" 
            size={getIconSize('medium')} 
            color="#000" 
          />
        </TouchableOpacity>
      </View>

      {/* Main Card */}
      <View style={{
        backgroundColor: '#F3F4F6',
        borderRadius: getResponsiveBorderRadius('large'),
        padding: getResponsiveSpacing(20, 24, 28, 32),
        flex: 1,
        justifyContent: 'space-between',
      }}>
        {/* Icon + Title */}
        <View style={{
          alignItems: 'center',
          marginTop: getResponsiveSpacing(32, 36, 40, 44),
        }}>
          <View style={{
            backgroundColor: '#6366F1',
            borderRadius: getResponsiveBorderRadius('round'),
            padding: getResponsiveSpacing(16, 20, 24, 28),
            marginBottom: getResponsiveSpacing(16, 20, 24, 28),
          }}>
            <Feather 
              name="help-circle" 
              size={getResponsiveSize(32, 36, 40, 44)} 
              color="#fff" 
            />
          </View>
          <Text style={[
            getResponsiveTextStyle('subtitle'),
            {
              textAlign: 'center',
              color: '#344054',
              marginBottom: getResponsiveSpacing(16, 20, 24, 28),
            }
          ]}>
            Allow JevahApp to access your{"\n"}camera and microphone
          </Text>
        </View>

        {/* Features */}
        <View style={{
          marginBottom: getResponsiveSpacing(96, 100, 104, 108),
        }}>
          <View style={{
            flexDirection: 'row',
            marginBottom: getResponsiveSpacing(12, 16, 20, 24),
          }}>
            <Feather 
              name="camera" 
              size={getIconSize('medium')} 
              color="#000" 
            />
            <View style={{
              flex: 1,
              marginLeft: getResponsiveSpacing(12, 16, 20, 24),
            }}>
              <Text style={[
                getResponsiveTextStyle('body'),
                {
                  fontWeight: '600',
                  color: '#475467',
                }
              ]}>
                Enjoy certain features using Jevah App
              </Text>
              <Text style={[
                getResponsiveTextStyle('caption'),
                {
                  color: '#344054',
                }
              ]}>
                Allow permissions to take pictures, photos, record sounds, and
                videos from your phone.
              </Text>
            </View>
          </View>

          <View style={{
            flexDirection: 'row',
            marginTop: getResponsiveSpacing(12, 16, 20, 24),
          }}>
            <Feather 
              name="settings" 
              size={getIconSize('medium')} 
              color="#000" 
            />
            <View style={{
              flex: 1,
              marginLeft: getResponsiveSpacing(12, 16, 20, 24),
            }}>
              <Text style={[
                getResponsiveTextStyle('body'),
                {
                  fontWeight: '600',
                  color: '#475467',
                }
              ]}>
                Manage permissions
              </Text>
              <Text style={[
                getResponsiveTextStyle('caption'),
                {
                  color: '#344054',
                }
              ]}>
                Not to worry, you can always go back to your settings at any
                time to change your preference.
              </Text>
            </View>
          </View>
        </View>

        {/* Allow Button */}
        <Pressable
          onPress={() => router.push("/goLlive/GoLive")}
          style={{
            backgroundColor: 'black',
            borderRadius: getResponsiveBorderRadius('round'),
            marginTop: getResponsiveSpacing(32, 36, 40, 44),
            paddingVertical: getResponsiveSpacing(16, 20, 24, 28),
          }}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
        >
          <Text style={[
            getResponsiveTextStyle('button'),
            {
              textAlign: 'center',
              color: 'white',
              fontWeight: '600',
            }
          ]}>
            Allow Permissions
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default AllowPermissionsScreen;

