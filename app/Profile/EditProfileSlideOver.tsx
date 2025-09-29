import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, Switch, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import AuthHeader from '../components/AuthHeader';

interface EditProfileSlideOverProps {
  visible: boolean;
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function EditProfileSlideOver({ visible, onClose }: EditProfileSlideOverProps) {
  const translateX = useSharedValue(SCREEN_WIDTH);

  const [lockEnabled, setLockEnabled] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [recommendationEnabled, setRecommendationEnabled] = useState(true);

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 300 });
    } else {
      translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 bg-black/20">
        <Animated.View 
          style={[
            animatedStyle, 
            { 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'white'
            }
          ]}
        >
          {/* Header */}
          <View className="mt-8">
            <AuthHeader title="Edit profile" onBackPress={onClose} />
          </View>

          {/* Content */}
          <View className="px-4 py-4">
            {/* Avatar */}
            <View className="items-center">
              <View className="w-28 h-28 rounded-xl overflow-hidden bg-gray-200 items-center justify-center">
                <Image source={require('../../assets/images/Asset 37 (2).png')} className="w-full h-full" resizeMode="cover" />
              </View>
              <View className="absolute right-[62px] top-[86px]">
                <View className="bg-white rounded-xl px-2 py-1 flex-row items-center" style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6 }}>
                  <Ionicons name="pencil-outline" size={14} color="#0A332D" />
                </View>
              </View>
            </View>

            {/* Cards */}
            <View className="mt-4">
              {/* Name Row */}
              <View className="bg-white rounded-2xl px-4 py-4 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="person-outline" size={18} color="#0A332D" />
                    <Text className="ml-3 text-[#111827] font-semibold">Lizzy Dahunsi</Text>
                  </View>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </View>
              </View>

              {/* Toggle Rows */}
              {[
                { icon: 'lock-closed-outline', title: 'Profile lock', subtitle: lockEnabled ? 'On' : 'Off', value: lockEnabled, setter: setLockEnabled },
                { icon: 'radio-outline', title: 'Live settings', subtitle: liveEnabled ? 'On' : 'Off', value: liveEnabled, setter: setLiveEnabled },
                { icon: 'notifications-outline', title: 'Push notifications', subtitle: pushEnabled ? 'On' : 'Off', value: pushEnabled, setter: setPushEnabled },
                { icon: 'options-outline', title: 'Recommendation settings', subtitle: recommendationEnabled ? 'On' : 'Off', value: recommendationEnabled, setter: setRecommendationEnabled },
              ].map((row, idx) => (
                <View key={`toggle-${idx}`} className="bg-white rounded-2xl px-4 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, height: 67 }}>
                  <View className="flex-row items-center justify-between h-full">
                    <View className="flex-row items-center">
                      <Ionicons name={row.icon as any} size={18} color="#0A332D" />
                      <View className="ml-3">
                        <Text className="text-[#111827] font-semibold">{row.title}</Text>
                        <Text className="text-[#6B7280] text-xs">{row.subtitle}</Text>
                      </View>
                    </View>
                    <Switch
                      value={row.value}
                      onValueChange={row.setter as any}
                      trackColor={{ false: '#CBD5E1', true: '#0A332D' }}
                      thumbColor={'#ffffff'}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}


