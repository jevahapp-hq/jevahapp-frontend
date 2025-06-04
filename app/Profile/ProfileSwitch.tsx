import React, { useState } from 'react';
import { View, Text, Image, Pressable, ScrollView } from 'react-native';
import { Lock, Pencil } from 'lucide-react-native';
import AuthHeader from '../components/AuthHeader';

const ProfileSwitch = () => {
  const [selected, setSelected] = useState<'ADULTS' | 'KIDS'>('ADULTS');

  const profiles = [
    {
      key: 'ADULTS',
      image: require('../../assets/images/image (4).png'), // Replace with your actual path
      label: 'ADULTS',
    },
    {
      key: 'KIDS',
      image: require('../../assets/images/Asset 37 (2).png'), // Replace with your actual path
      label: 'KIDS',
    },
  ];

  return (
    <ScrollView className="flex-1 bg-[#FCFCFD] px-6 pt-">
      {/* Header */}
      <AuthHeader title="Profile Switch" />

      {/* Title */}
      <Text className="text-xl font-bold text-center text-gray-900 mb-6">
        Choose your section
      </Text>

      {/* Profiles */}
      <View className="flex-row justify-between">
        {profiles.map((profile) => (
          <Pressable
            key={profile.key}
            onPress={() => setSelected(profile.key as 'ADULTS' | 'KIDS')}
            className={`items-center rounded-xl p-4 w-[48%] ${
              selected === profile.key ? 'border-2 border-indigo-500' : ''
            }`}
          >
            <Image
              source={profile.image}
              className="w-24 h-24 rounded-full"
              resizeMode="cover"
            />
            <Text className="text-sm font-semibold mt-2 text-gray-800">
              {profile.label}
            </Text>
            <Text className="text-xs text-gray-400">Name your profile</Text>
            <View className="flex-row space-x-2 mt-2">
              <View className="bg-gray-100 p-2 rounded-full">
                <Lock size={14} />
              </View>
              <View className="bg-gray-100 p-2 rounded-full">
                <Pencil size={14} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Learn more */}
      <Pressable className="mt-16 border border-black py-3 rounded-full items-center">
        <Text className="text-base font-semibold text-black">Learn more</Text>
      </Pressable>
    </ScrollView>
  );
};

export default ProfileSwitch;










