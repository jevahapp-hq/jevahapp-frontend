import { useClerk, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View className="flex-1 bg-white p-5 md:p-8 lg:p-10">
      <View className="items-center justify-center flex-1 max-w-2xl mx-auto w-full">
        <Text className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6 lg:mb-8 text-center">
          Welcome to Tevah App!
        </Text>
        <Text className="text-gray-600 mb-8 md:mb-10 lg:mb-12 text-center text-base md:text-lg lg:text-xl">
          You are signed in as {user?.emailAddresses[0].emailAddress}
        </Text>

        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-red-500 rounded-full px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5"
        >
          <Text className="text-white font-semibold text-base md:text-lg lg:text-xl">
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 