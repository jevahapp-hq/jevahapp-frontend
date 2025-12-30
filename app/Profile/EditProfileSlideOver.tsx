import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useUserProfile } from '../hooks/useUserProfile';
import { apiClient } from '../utils/dataFetching';
import { getApiBaseUrl } from '../utils/api';
import AuthHeader from '../components/AuthHeader';
import * as ImagePicker from 'expo-image-picker';

interface EditProfileSlideOverProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingConfig {
  type: 'image' | 'editable_text' | 'toggle';
  currentValue: any;
  label?: string;
  description?: string;
  updateEndpoint?: string;
  enabled?: boolean;
  comingSoon?: boolean;
  uploadEndpoint?: string;
  maxSizeBytes?: number;
  allowedFormats?: string[];
  previewUrl?: string;
  fieldType?: 'name' | 'text' | 'email' | 'bio';
  maxLength?: number | { [key: string]: number };
}

interface SettingsConfig {
  [key: string]: SettingConfig;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function EditProfileSlideOver({ visible, onClose }: EditProfileSlideOverProps) {
  const router = useRouter();
  const translateX = useSharedValue(SCREEN_WIDTH);
  const { user, refreshUserProfile } = useUserProfile();

  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SettingsConfig | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [editingName, setEditingName] = useState(false);
  const [nameValues, setNameValues] = useState({ firstName: '', lastName: '' });

  // Fetch settings config when modal opens
  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 300 });
      fetchSettingsConfig();
    } else {
      translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 });
      setConfig(null);
      setLocalValues({});
      setEditingName(false);
    }
  }, [visible]);

  // Initialize local values from config
  useEffect(() => {
    if (config) {
      const initialValues: Record<string, any> = {};
      Object.keys(config).forEach((key) => {
        if (config[key].type === 'editable_text' && config[key].fieldType === 'name') {
          const nameValue = config[key].currentValue || {};
          initialValues[`${key}_firstName`] = nameValue.firstName || '';
          initialValues[`${key}_lastName`] = nameValue.lastName || '';
          setNameValues({
            firstName: nameValue.firstName || user?.firstName || '',
            lastName: nameValue.lastName || user?.lastName || '',
          });
        } else {
          initialValues[key] = config[key].currentValue;
        }
      });
      setLocalValues(initialValues);
    }
  }, [config, user]);

  const fetchSettingsConfig = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfileSettingsConfig();
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings config:', error);
      Alert.alert('Error', 'Failed to load profile settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: string, value: boolean, setting: SettingConfig) => {
    if (!setting.enabled || setting.comingSoon || !setting.updateEndpoint) {
      if (setting.comingSoon) {
        Alert.alert('Coming Soon', 'This feature will be available soon!');
      }
      return;
    }

    // Optimistic update
    setLocalValues((prev) => ({ ...prev, [key]: value }));
    setUpdating((prev) => ({ ...prev, [key]: true }));

    try {
      const endpoint = setting.updateEndpoint!;
      let response;

      if (endpoint.includes('update-lock')) {
        response = await apiClient.updateProfileLock(value);
      } else if (endpoint.includes('update-push-notifications')) {
        response = await apiClient.updatePushNotifications(value);
      } else if (endpoint.includes('update-recommendations')) {
        response = await apiClient.updateRecommendations(value);
      } else if (endpoint.includes('update-live-settings')) {
        response = await apiClient.updateLiveSettings(value);
        if (!response.success && response.comingSoon) {
          Alert.alert('Coming Soon', 'This feature will be available soon!');
          setLocalValues((prev) => ({ ...prev, [key]: !value })); // Revert
          return;
        }
      }

      if (response?.success) {
        // Refresh config to get updated values
        await fetchSettingsConfig();
        await refreshUserProfile();
      } else {
        throw new Error(response?.error || 'Update failed');
      }
    } catch (error: any) {
      console.error('Failed to update setting:', error);
      // Revert optimistic update
      setLocalValues((prev) => ({ ...prev, [key]: !value }));
      Alert.alert('Error', error.message || 'Failed to update setting');
    } finally {
      setUpdating((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleNameEdit = () => {
    setEditingName(true);
  };

  const handleNameSave = async () => {
    if (!nameValues.firstName.trim() && !nameValues.lastName.trim()) {
      Alert.alert('Error', 'At least one name field is required');
      return;
    }

    setUpdating((prev) => ({ ...prev, name: true }));
    try {
      const response = await apiClient.updateProfileName(
        nameValues.firstName.trim() || undefined,
        nameValues.lastName.trim() || undefined
      );

      if (response.success) {
        setEditingName(false);
        await fetchSettingsConfig();
        await refreshUserProfile();
        Alert.alert('Success', 'Name updated successfully');
      } else {
        throw new Error(response.data?.message || 'Update failed');
      }
    } catch (error: any) {
      console.error('Failed to update name:', error);
      Alert.alert('Error', error.message || 'Failed to update name');
    } finally {
      setUpdating((prev) => ({ ...prev, name: false }));
    }
  };

  const handleAvatarUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload avatar');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUpdating((prev) => ({ ...prev, avatar: true }));
        const response = await apiClient.uploadProfileAvatar(result.assets[0].uri);

        if (response.success) {
          await fetchSettingsConfig();
          await refreshUserProfile();
          Alert.alert('Success', 'Avatar updated successfully');
        } else {
          throw new Error('Upload failed');
        }
      }
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      Alert.alert('Error', error.message || 'Failed to upload avatar');
    } finally {
      setUpdating((prev) => ({ ...prev, avatar: false }));
    }
  };

  const getIconForSetting = (key: string): string => {
    const iconMap: Record<string, string> = {
      profileLock: 'lock-closed-outline',
      liveSettings: 'radio-outline',
      pushNotifications: 'notifications-outline',
      recommendationSettings: 'options-outline',
      name: 'person-outline',
      profileImage: 'image-outline',
    };
    return iconMap[key] || 'settings-outline';
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'
    : 'User';
  const avatarUrl = config?.profileImage?.currentValue || 
                   config?.profileImage?.previewUrl || 
                   user?.avatar || 
                   null;

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
              backgroundColor: 'white',
            },
          ]}
        >
          {/* Header */}
          <View className="mt-8">
            <AuthHeader title="Edit profile" onBackPress={onClose} />
          </View>

          {/* Content */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="px-4 py-4 mt-8">
              {loading ? (
                <View className="items-center justify-center py-20">
                  <ActivityIndicator size="large" color="#0A332D" />
                  <Text className="mt-4 text-[#6B7280]">Loading settings...</Text>
                </View>
              ) : config ? (
                <>
                  {/* Avatar */}
                  {config.profileImage && (
                    <View className="items-center mb-6">
                      <View className="w-28 h-28 rounded-xl overflow-hidden bg-gray-200 items-center justify-center relative">
                        {updating.avatar ? (
                          <View className="absolute inset-0 items-center justify-center bg-black/20">
                            <ActivityIndicator size="small" color="#ffffff" />
                          </View>
                        ) : avatarUrl ? (
                          <Image
                            source={{ uri: avatarUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="person" size={48} color="#9CA3AF" />
                        )}
                        <View className="absolute bottom-1 right-1">
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleAvatarUpload}
                            disabled={updating.avatar || !config.profileImage.enabled}
                            style={{ opacity: config.profileImage.enabled ? 1 : 0.5 }}
                          >
                            <View
                              className="bg-white rounded-full p-1.5 flex-row items-center"
                              style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6 }}
                            >
                              <Ionicons name="pencil-outline" size={12} color="#0A332D" />
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Name Row */}
                  {config.name && (
                    <View
                      className="bg-white rounded-2xl px-4 py-4 mb-4"
                      style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 }}
                    >
                      {editingName ? (
                        <View>
                          <View className="flex-row items-center mb-3">
                            <Ionicons name={getIconForSetting('name')} size={18} color="#0A332D" />
                            <Text className="ml-3 text-[#111827] font-semibold">Name</Text>
                          </View>
                          <TextInput
                            className="bg-gray-50 rounded-lg px-3 py-2 mb-2 text-[#111827]"
                            placeholder="First Name"
                            value={nameValues.firstName}
                            onChangeText={(text) => setNameValues((prev) => ({ ...prev, firstName: text }))}
                            maxLength={50}
                            editable={!updating.name}
                          />
                          <TextInput
                            className="bg-gray-50 rounded-lg px-3 py-2 mb-3 text-[#111827]"
                            placeholder="Last Name"
                            value={nameValues.lastName}
                            onChangeText={(text) => setNameValues((prev) => ({ ...prev, lastName: text }))}
                            maxLength={50}
                            editable={!updating.name}
                          />
                          <View className="flex-row justify-end gap-2">
                            <TouchableOpacity
                              onPress={() => {
                                setEditingName(false);
                                setNameValues({
                                  firstName: user?.firstName || '',
                                  lastName: user?.lastName || '',
                                });
                              }}
                              disabled={updating.name}
                            >
                              <Text className="text-[#6B7280] font-medium px-4 py-2">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleNameSave}
                              disabled={updating.name}
                              className="bg-[#0A332D] rounded-lg px-4 py-2"
                            >
                              {updating.name ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <Text className="text-white font-medium">Save</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center flex-1">
                            <Ionicons name={getIconForSetting('name')} size={18} color="#0A332D" />
                            <Text className="ml-3 text-[#111827] font-semibold flex-1" numberOfLines={1}>
                              {displayName}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={handleNameEdit}
                            disabled={!config.name.enabled}
                            style={{ opacity: config.name.enabled ? 1 : 0.5 }}
                          >
                            <Ionicons name="pencil-outline" size={18} color="#6B7280" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Toggle Rows */}
                  {Object.entries(config)
                    .filter(([key]) => key !== 'profileImage' && key !== 'name')
                    .map(([key, setting]) => {
                      if (setting.type !== 'toggle') return null;

                      const isDisabled = !setting.enabled || setting.comingSoon;
                      const currentValue = localValues[key] ?? setting.currentValue ?? false;
                      const isUpdating = updating[key] || false;

                      return (
                        <View
                          key={key}
                          className="bg-white rounded-2xl px-4 mb-4"
                          style={{
                            shadowColor: '#000',
                            shadowOpacity: 0.03,
                            shadowRadius: 8,
                            height: 67,
                            opacity: isDisabled ? 0.6 : 1,
                          }}
                        >
                          <View className="flex-row items-center justify-between h-full">
                            <View className="flex-row items-center flex-1">
                              <Ionicons
                                name={getIconForSetting(key) as any}
                                size={18}
                                color={isDisabled ? '#9CA3AF' : '#0A332D'}
                              />
                              <View className="ml-3 flex-1">
                                <View className="flex-row items-center gap-2">
                                  <Text
                                    className="text-[#111827] font-semibold"
                                    style={{ color: isDisabled ? '#9CA3AF' : '#111827' }}
                                  >
                                    {setting.label || key}
                                  </Text>
                                  {setting.comingSoon && (
                                    <View className="bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                                      <Text className="text-[#92400E] text-xs font-medium">Coming Soon</Text>
                                    </View>
                                  )}
                                </View>
                                <Text className="text-[#6B7280] text-xs" numberOfLines={1}>
                                  {setting.description || (currentValue ? 'On' : 'Off')}
                                </Text>
                              </View>
                            </View>
                            {isUpdating ? (
                              <ActivityIndicator size="small" color="#0A332D" />
                            ) : (
                              <Switch
                                value={currentValue}
                                onValueChange={(value) => handleToggle(key, value, setting)}
                                trackColor={{ false: '#CBD5E1', true: '#0A332D' }}
                                thumbColor="#ffffff"
                                disabled={isDisabled}
                              />
                            )}
                          </View>
                        </View>
                      );
                    })}
                </>
              ) : (
                <View className="items-center justify-center py-20">
                  <Text className="text-[#6B7280]">Failed to load settings</Text>
                  <TouchableOpacity
                    onPress={fetchSettingsConfig}
                    className="mt-4 bg-[#0A332D] rounded-lg px-6 py-2"
                  >
                    <Text className="text-white font-medium">Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
