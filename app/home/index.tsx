import { useClerk, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { usePublicMedia, usePublicMediaConnection } from '../hooks/usePublicMedia';

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  // Fetch all public media from all users
  const { 
    publicMedia, 
    loading: mediaLoading, 
    error: mediaError, 
    refetch: refetchMedia,
    total: totalMedia,
    success: mediaSuccess 
  } = usePublicMedia({ autoFetch: true, transformToStore: true });

  // Test connection to public media API
  const { 
    isConnected, 
    isLoading: connectionLoading, 
    error: connectionError 
  } = usePublicMediaConnection();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRefreshMedia = async () => {
    console.log('🔄 Refreshing public media...');
    await refetchMedia();
  };

  return (
    <View className="flex-1 bg-white p-5 md:p-8 lg:p-10">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center justify-center flex-1 max-w-2xl mx-auto w-full">
          <Text className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6 lg:mb-8 text-center">
            Welcome to Tevah App!
          </Text>
          <Text className="text-gray-600 mb-4 md:mb-6 lg:mb-8 text-center text-base md:text-lg lg:text-xl">
            You are signed in as {user?.emailAddresses[0].emailAddress}
          </Text>

          {/* Public Media Status */}
          <View className="w-full mb-6 p-4 bg-gray-50 rounded-lg">
            <Text className="text-lg font-semibold mb-3 text-center">Public Media Status</Text>
            
            {/* Connection Status */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base">API Connection:</Text>
              {connectionLoading ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text className={`text-base font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? '✅ Connected' : '❌ Disconnected'}
                </Text>
              )}
            </View>

            {/* Media Loading Status */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base">Public Media:</Text>
              {mediaLoading ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text className={`text-base font-medium ${mediaSuccess ? 'text-green-600' : 'text-red-600'}`}>
                  {mediaSuccess ? `✅ ${totalMedia} items loaded` : '❌ Failed to load'}
                </Text>
              )}
            </View>

            {/* Error Messages */}
            {connectionError && (
              <Text className="text-red-600 text-sm mt-2">Connection: {connectionError}</Text>
            )}
            {mediaError && (
              <Text className="text-red-600 text-sm mt-2">Media: {mediaError}</Text>
            )}

            {/* Refresh Button */}
            <TouchableOpacity
              onPress={handleRefreshMedia}
              className="bg-blue-500 rounded-lg px-4 py-2 mt-3"
              disabled={mediaLoading}
            >
              <Text className="text-white font-medium text-center">
                {mediaLoading ? 'Loading...' : 'Refresh Public Media'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Public Media Preview */}
          {mediaSuccess && publicMedia.length > 0 && (
            <View className="w-full mb-6 p-4 bg-blue-50 rounded-lg">
              <Text className="text-lg font-semibold mb-3 text-center">Latest Public Content</Text>
              <Text className="text-sm text-gray-600 mb-2">
                Showing {Math.min(3, publicMedia.length)} of {totalMedia} total posts from all users:
              </Text>
              {publicMedia.slice(0, 3).map((item, index) => (
                <View key={item._id} className="flex-row items-center mb-2 p-2 bg-white rounded">
                  <View className="flex-1">
                    <Text className="font-medium text-sm" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-xs text-gray-500" numberOfLines={1}>
                      by {item.authorInfo?.fullName || 'Unknown User'} • {item.contentType}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400 ml-2">
                    {item.viewCount || 0} views
                  </Text>
                </View>
              ))}
              {publicMedia.length > 3 && (
                <Text className="text-xs text-gray-500 text-center mt-2">
                  +{publicMedia.length - 3} more posts available
                </Text>
              )}
            </View>
          )}

          {/* Instructions */}
          <View className="w-full mb-6 p-4 bg-green-50 rounded-lg">
            <Text className="text-lg font-semibold mb-3 text-center">🎉 ViweContent Branch Updated!</Text>
            <Text className="text-sm text-gray-700 mb-2">
              ✅ Updated to use public media endpoints
            </Text>
            <Text className="text-sm text-gray-700 mb-2">
              ✅ All posts from all users are now available
            </Text>
            <Text className="text-sm text-gray-700 mb-2">
              ✅ Media interactions (like, save, share) work with backend
            </Text>
            <Text className="text-sm text-gray-700 mb-2">
              ✅ Enhanced URL validation for public media
            </Text>
            <Text className="text-sm text-gray-700">
              ✅ Maintains existing structure and functionality
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-red-500 rounded-full px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5"
          >
            <Text className="text-white font-semibold text-base md:text-lg lg:text-xl">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
} 