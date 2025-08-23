import { router } from 'expo-router';
import { Text, View } from 'react-native';
import MobileHeader from './MobileHeader';

// Example usage of MobileHeader component in different scenarios

export const MainHeaderExample = () => {
  const user = {
    firstName: "John",
    lastName: "Doe",
    avatar: "https://example.com/avatar.jpg",
    section: "USER",
    isOnline: true,
  };

  const rightActions = [
    {
      icon: "search-outline",
      onPress: () => router.push("/ExploreSearch/ExploreSearch"),
    },
    {
      icon: "notifications-outline",
      onPress: () => router.push("/noitfication/NotificationsScreen"),
      badge: true,
      badgeCount: 3,
    },
    {
      icon: "download-outline",
      onPress: () => router.push("/downloads/DownloadsScreen"),
    },
  ];

  return (
    <View className="flex-1 bg-white">
      <MobileHeader
        type="main"
        user={user}
        rightActions={rightActions}
      />
      <View className="flex-1 px-4 pt-4">
        <Text className="text-lg font-rubik font-semibold text-[#3B3B3B]">
          Main Header Example
        </Text>
        <Text className="text-base font-rubik text-[#3B3B3B] mt-2">
          This header takes full width and uses Rubik font throughout.
        </Text>
      </View>
    </View>
  );
};

export const AuthHeaderExample = () => {
  return (
    <View className="flex-1 bg-white">
      <MobileHeader
        type="auth"
        title="Sign In"
        subtitle="Welcome back to Jevah"
        showBack={true}
        showCancel={true}
      />
      <View className="flex-1 px-4 pt-4">
        <Text className="text-lg font-rubik font-semibold text-[#3B3B3B]">
          Auth Header Example
        </Text>
        <Text className="text-base font-rubik text-[#3B3B3B] mt-2">
          This header takes full width and uses Rubik font throughout.
        </Text>
      </View>
    </View>
  );
};

export const SearchHeaderExample = () => {
  const rightActions = [
    {
      icon: "options-outline",
      onPress: () => router.push("/ExploreSearch/FilterScreen"),
    },
  ];

  return (
    <View className="flex-1 bg-white">
      <MobileHeader
        type="search"
        title="Explore"
        leftAction={{
          icon: "arrow-back",
          onPress: () => router.back(),
        }}
        rightActions={rightActions}
      />
      <View className="flex-1 px-4 pt-4">
        <Text className="text-lg font-rubik font-semibold text-[#3B3B3B]">
          Search Header Example
        </Text>
        <Text className="text-base font-rubik text-[#3B3B3B] mt-2">
          This header takes full width and uses Rubik font throughout.
        </Text>
      </View>
    </View>
  );
};

export const ProfileHeaderExample = () => {
  const rightActions = [
    {
      icon: "settings-outline",
      onPress: () => router.push("/settings"),
    },
    {
      icon: "share-outline",
      onPress: () => console.log("Share profile"),
    },
  ];

  return (
    <View className="flex-1 bg-white">
      <MobileHeader
        type="profile"
        title="Profile"
        subtitle="John Doe"
        leftAction={{
          icon: "arrow-back",
          onPress: () => router.back(),
        }}
        rightActions={rightActions}
      />
      <View className="flex-1 px-4 pt-4">
        <Text className="text-lg font-rubik font-semibold text-[#3B3B3B]">
          Profile Header Example
        </Text>
        <Text className="text-base font-rubik text-[#3B3B3B] mt-2">
          This header takes full width and uses Rubik font throughout.
        </Text>
      </View>
    </View>
  );
};

export const CustomHeaderExample = () => {
  const customRightComponent = (
    <View className="flex-row items-center space-x-2">
      <Text className="text-blue-500 font-rubik font-semibold">Save</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <MobileHeader
        title="Edit Profile"
        leftAction={{
          icon: "arrow-back",
          onPress: () => router.back(),
        }}
        rightComponent={customRightComponent}
        backgroundColor="#f8fafc"
        textColor="#3B3B3B"
      />
      <View className="flex-1 px-4 pt-4">
        <Text className="text-lg font-rubik font-semibold text-[#3B3B3B]">
          Custom Header Example
        </Text>
        <Text className="text-base font-rubik text-[#3B3B3B] mt-2">
          This header takes full width and uses Rubik font throughout.
        </Text>
      </View>
    </View>
  );
};

export const DarkHeaderExample = () => {
  return (
    <View className="flex-1 bg-gray-900">
      <MobileHeader
        title="Live Stream"
        leftAction={{
          icon: "close",
          onPress: () => router.back(),
        }}
        rightActions={[
          {
            icon: "share-outline",
            onPress: () => console.log("Share"),
          },
          {
            icon: "ellipsis-vertical",
            onPress: () => console.log("More options"),
          },
        ]}
        backgroundColor="#0f172a"
        textColor="white"
        statusBarStyle="light-content"
        statusBarBackgroundColor="#0f172a"
      />
      <View className="flex-1 px-4 pt-4">
        <Text className="text-lg font-rubik font-semibold text-white">
          Dark Header Example
        </Text>
        <Text className="text-base font-rubik text-gray-300 mt-2">
          This header takes full width and uses Rubik font throughout.
        </Text>
      </View>
    </View>
  );
};

// Usage in different screen types:

/*
1. Main App Header (Home Screen):
<View className="flex-1 bg-white">
  <MobileHeader
    type="main"
    user={userData}
    rightActions={[
      { icon: "search-outline", onPress: () => router.push("/search") },
      { icon: "notifications-outline", onPress: () => router.push("/notifications"), badge: true },
      { icon: "download-outline", onPress: () => router.push("/downloads") },
    ]}
  />
  <View className="flex-1 px-4 pt-4">
    // Your content here
  </View>
</View>

2. Authentication Screens:
<View className="flex-1 bg-white">
  <MobileHeader
    type="auth"
    title="Sign In"
    subtitle="Welcome back"
    showBack={true}
    showCancel={true}
  />
  <View className="flex-1 px-4 pt-4">
    // Your content here
  </View>
</View>

3. Search/Explore Screens:
<View className="flex-1 bg-white">
  <MobileHeader
    title="Explore"
    leftAction={{ icon: "arrow-back", onPress: () => router.back() }}
    rightActions={[
      { icon: "options-outline", onPress: () => router.push("/filters") },
    ]}
  />
  <View className="flex-1 px-4 pt-4">
    // Your content here
  </View>
</View>

4. Profile/Detail Screens:
<View className="flex-1 bg-white">
  <MobileHeader
    title="Profile"
    subtitle="John Doe"
    leftAction={{ icon: "arrow-back", onPress: () => router.back() }}
    rightActions={[
      { icon: "settings-outline", onPress: () => router.push("/settings") },
      { icon: "share-outline", onPress: () => console.log("Share") },
    ]}
  />
  <View className="flex-1 px-4 pt-4">
    // Your content here
  </View>
</View>

5. Custom Headers:
<View className="flex-1 bg-white">
  <MobileHeader
    title="Edit Post"
    leftAction={{ icon: "close", onPress: () => router.back() }}
    rightComponent={<Text className="text-blue-500 font-rubik font-semibold">Post</Text>}
  />
  <View className="flex-1 px-4 pt-4">
    // Your content here
  </View>
</View>

6. Dark Theme Headers:
<View className="flex-1 bg-gray-900">
  <MobileHeader
    title="Live Stream"
    backgroundColor="#0f172a"
    textColor="white"
    statusBarStyle="light-content"
    leftAction={{ icon: "close", onPress: () => router.back() }}
    rightActions={[
      { icon: "share-outline", onPress: () => console.log("Share") },
    ]}
  />
  <View className="flex-1 px-4 pt-4">
    // Your content here
  </View>
</View>
*/
