// AccountScreen.tsx
import { useClerk } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Lock, Pencil } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";
import { useUserProfile } from "../hooks/useUserProfile";
import EditProfileSlideOver from "../Profile/EditProfileSlideOver";
import { authUtils } from "../utils/authUtils";
import { useOptimizedButton } from "../utils/performance";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function AccountScreen() {
  const [activeTab, setActiveTab] = useState<string>("Account");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedContentTab, setSelectedContentTab] = useState(0);
  const [avatarError, setAvatarError] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, getAvatarUrl, getFullName, getUserSection } = useUserProfile();

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            // Clear all stored tokens and user data using authUtils
            await authUtils.clearAuthData();

            // Sign out from Clerk
            await signOut();

            // Navigate to welcome screen
            router.replace("/");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  // Use optimized button handler
  const optimizedLogoutHandler = useOptimizedButton(handleLogout, {
    debounceMs: 200,
    key: "logout-button",
  });

  const handleProfilePress = () => {
    setShowProfileModal(true);
  };

  const contentTabs = [
    { icon: "grid-outline", label: "Posts" },
    { icon: "camera-outline", label: "Media" },
    { icon: "play-outline", label: "Videos" },
    { icon: "stats-chart-outline", label: "Analytics" },
  ];

  // Local images for each tab (3 tiles). Adjust paths to images in assets/images
  const tabImages: Record<number, any[]> = {
    0: [
      require("../../assets/images/image (4).png"),
      require("../../assets/images/Asset 37 (2).png"),
      require("../../assets/images/image (4).png"),
    ],
    1: [
      require("../../assets/images/Asset 37 (2).png"),
      require("../../assets/images/image (4).png"),
      require("../../assets/images/Asset 37 (2).png"),
    ],
    2: [
      require("../../assets/images/image (4).png"),
      require("../../assets/images/image (4).png"),
      require("../../assets/images/Asset 37 (2).png"),
    ],
    3: [
      require("../../assets/images/Asset 37 (2).png"),
      require("../../assets/images/Asset 37 (2).png"),
      require("../../assets/images/image (4).png"),
    ],
  };

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        {/* Header */}
        <View className="flex-row items-center justify-between w-full px-4 py-3 border-b border-gray-100">
          {/* Left Side - User Profile */}
          <TouchableOpacity
            onPress={handleProfilePress}
            className="flex-row items-center flex-1"
            activeOpacity={0.7}
          >
            <View className="relative">
              {user && getAvatarUrl(user) && !avatarError ? (
                <Image
                  source={{ uri: getAvatarUrl(user) }}
                  className="w-10 h-10 rounded-lg"
                  style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <View
                  className="w-10 h-10 rounded-lg justify-center items-center"
                  style={{
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    backgroundColor: "#F3F4F6",
                  }}
                >
                  <Text className="text-gray-600 font-semibold text-sm">
                    {user?.firstName?.[0]?.toUpperCase() ||
                      user?.lastName?.[0]?.toUpperCase() ||
                      "U"}
                  </Text>
                </View>
              )}
            </View>

            <View className="ml-3 flex-1">
              <View className="flex-row items-center">
                <Text className="text-[15px] font-semibold text-[#3B3B3B] leading-5">
                  {user ? getFullName(user) : "Loading..."}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="#6B7280"
                  style={{ marginLeft: 8 }}
                />
              </View>
              <Text className="text-[12px] text-[#3B3B3B] font-medium mt-0.5">
                {user ? getUserSection().toUpperCase() : "USER"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right Side - Action Buttons */}
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
              <Ionicons name="send" size={20} color="#3B3B3B" />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#3B3B3B"
              />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-gray-50">
              <Ionicons name="menu-outline" size={20} color="#3B3B3B" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
          className="bg-[#dcdfe418]"
        >
          {/* Profile Section */}
          <View className="px-4 py-8">
            {/* Profile Picture and Edit Button Row */}
            <View className="flex-row items-center mb-4">
              {/* Left spacer - tiny nudge back left */}
              <View style={{ flex: 1.02 }} />

              {/* Main Profile Picture - Moved further left */}
              <View className="relative">
                {user && getAvatarUrl(user) && !avatarError ? (
                  <Image
                    source={{ uri: getAvatarUrl(user) }}
                    className="w-24 h-24 rounded-full"
                    style={{ borderWidth: 3, borderColor: "#E5E7EB" }}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <View
                    className="w-24 h-24 rounded-full justify-center items-center"
                    style={{
                      borderWidth: 3,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#F3F4F6",
                    }}
                  >
                    <Text className="text-gray-600 font-semibold text-3xl">
                      {user?.firstName?.[0]?.toUpperCase() ||
                        user?.lastName?.[0]?.toUpperCase() ||
                        "U"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Right spacer - tiny increase to balance */}
              <View style={{ flex: 0.98 }} className="items-end">
                <TouchableOpacity
                  className="flex-row items-center bg-gray-400 px-4 py-2 rounded-full"
                  activeOpacity={0.7}
                  onPress={() => setIsEditOpen(true)}
                >
                  <Text className="font-medium" style={{ color: "#0A332D" }}>
                    Edit
                  </Text>
                  <Ionicons
                    name="pencil-outline"
                    size={16}
                    style={{ marginLeft: 6 }}
                    color="#0A332D"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Name and Bio */}
            <View className="items-center">
              <Text className="text-2xl font-bold text-[#3B3B3B] mb-2">
                {user ? getFullName(user) : "Loading..."}
              </Text>

              <TouchableOpacity className="mb-2">
                <Text className="text-[#FEA74E] font-medium">+ Add bio</Text>
              </TouchableOpacity>
            </View>

            {/* Logout Button - Close to profile */}
            <View className="items-center">
              <TouchableOpacity
                onPress={optimizedLogoutHandler}
                className="flex-row items-center bg-red-50 px-4 py-2 rounded-lg mt-1"
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={16} color="#EF4444" />
                <Text className="text-[#EF4444] font-medium ml-2">Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Navigation Tabs */}
          <View className="px-4 mt-0 mb-3">
            {/* Darker group background with evenly spaced, full-width icons */}
            <View className="bg-gray-200 rounded-xl px-2 py-1 flex-row items-center justify-between w-10/12 self-center">
              {contentTabs.map((tab, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedContentTab(index)}
                  className={`flex-1 h-8 mx-1 rounded-md items-center justify-center`}
                  activeOpacity={0.7}
                  style={
                    selectedContentTab === index
                      ? { backgroundColor: "#0A332D" }
                      : {}
                  }
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={selectedContentTab === index ? "white" : "#4B5563"}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Content Section - images for tabs 0-2, analytics list for tab 3 */}
          <View className="px-4 mb-8">
            {selectedContentTab !== 3 ? (
              <View className="flex-row justify-between">
                {tabImages[selectedContentTab].map((imgSrc, index) => (
                  <View
                    key={`tile-${selectedContentTab}-${index}`}
                    className="flex-1 mx-1"
                  >
                    <View className="aspect-square bg-gray-200 rounded-lg mb-2 overflow-hidden">
                      <Image
                        source={imgSrc}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View>
                {[
                  {
                    icon: "albums-outline",
                    label: "Posts",
                    value: "1200",
                    sub: "Total published posts",
                  },
                  {
                    icon: "heart-outline",
                    label: "Likes",
                    value: "16.8k",
                    sub: 'Number of "Like" engagements on all posts',
                  },
                  {
                    icon: "radio-outline",
                    label: "Live sessions",
                    value: "32",
                    sub: "Number of times you went Live",
                  },
                  {
                    icon: "chatbubble-ellipses-outline",
                    label: "Comments",
                    value: "20k",
                    sub: 'Number of "comments" on all posts',
                  },
                  {
                    icon: "document-text-outline",
                    label: "Drafts",
                    value: "25",
                    sub: "Unpublished posts",
                  },
                  {
                    icon: "share-social-outline",
                    label: "Shares",
                    value: "0",
                    sub: "Number of times people shared your contents",
                  },
                ].map((row, idx) => (
                  <View
                    key={`row-${idx}`}
                    className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-4"
                    style={{
                      shadowColor: "#000",
                      shadowOpacity: 0.03,
                      shadowRadius: 8,
                      marginBottom: 16,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons
                        name={row.icon as any}
                        size={18}
                        color="#0A332D"
                      />
                      <View className="ml-3">
                        <Text className="text-[#111827] font-semibold">
                          {row.label}
                        </Text>
                        <Text className="text-[#6B7280] text-xs">
                          {row.sub}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[#111827] font-semibold">
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Profile Switch Modal */}
        <Modal
          visible={showProfileModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowProfileModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowProfileModal(false)}>
            <View className="flex-1 bg-black/30 justify-end">
              <TouchableWithoutFeedback>
                <View className="bg-[#FCFCFD] rounded-t-3xl p-6">
                  {/* Close Button */}
                  <TouchableOpacity
                    onPress={() => setShowProfileModal(false)}
                    className="self-end mb-4"
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>

                  {/* Title */}
                  <Text className="text-xl font-bold text-center text-gray-900 mb-6">
                    Switch Profile
                  </Text>

                  {/* Profiles */}
                  <View className="flex-row justify-between">
                    {/* Adult Profile */}
                    <Pressable
                      onPress={() => {
                        setShowProfileModal(false);
                        // Handle adult profile selection
                      }}
                      className="items-center rounded-xl p-4 w-[48%]"
                    >
                      <View className="relative mb-3">
                        <Image
                          source={require("../../assets/images/image (4).png")}
                          className="w-24 h-24 rounded-lg"
                          resizeMode="cover"
                        />
                      </View>
                      <Text className="text-sm font-semibold mt-2 text-gray-800">
                        ADULTS
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Name your profile
                      </Text>
                      <View className="flex-row space-x-2 mt-2">
                        <View className="bg-gray-100 p-2 rounded-full">
                          <Lock size={14} />
                        </View>
                        <View className="bg-gray-100 p-2 rounded-full">
                          <Pencil size={14} />
                        </View>
                      </View>
                    </Pressable>

                    {/* Kids Profile */}
                    <Pressable
                      onPress={() => {
                        setShowProfileModal(false);
                        // Handle kids profile selection
                      }}
                      className="items-center rounded-xl p-4 w-[48%]"
                    >
                      <View className="relative mb-3">
                        <Image
                          source={require("../../assets/images/Asset 37 (2).png")}
                          className="w-24 h-24 rounded-lg"
                          resizeMode="cover"
                        />
                      </View>
                      <Text className="text-sm font-semibold mt-2 text-gray-800">
                        KIDS
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Name your profile
                      </Text>
                      <View className="flex-row space-x-2 mt-2">
                        <View className="bg-gray-100 p-2 rounded-full">
                          <Lock size={14} />
                        </View>
                        <View className="bg-gray-100 p-2 rounded-full">
                          <Pencil size={14} />
                        </View>
                      </View>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Bottom Nav overlay */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: "transparent",
          }}
        >
          <BottomNav
            selectedTab={activeTab}
            setSelectedTab={(tab) => {
              setActiveTab(tab);
              switch (tab) {
                case "Home":
                  router.replace({ pathname: "/categories/HomeScreen" });
                  break;
                case "Community":
                  router.replace({ pathname: "/screens/CommunityScreen" });
                  break;
                case "Library":
                  router.replace({
                    pathname: "/screens/library/LibraryScreen",
                  });
                  break;
                case "Account":
                  router.replace({ pathname: "/screens/AccountScreen" });
                  break;
                default:
                  break;
              }
            }}
          />
        </View>
      </SafeAreaView>

      <EditProfileSlideOver
        visible={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
}
