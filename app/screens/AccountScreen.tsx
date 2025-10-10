// AccountScreen.tsx
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AccountHeader from "../components/account/AccountHeader";
import ContentSection from "../components/account/ContentSection";
import ContentTabs from "../components/account/ContentTabs";
import ProfileSummary from "../components/account/ProfileSummary";
import ProfileSwitchModal from "../components/account/ProfileSwitchModal";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import useAccountContent from "../hooks/useAccountContent";
import { useUserProfile } from "../hooks/useUserProfile";
import EditProfileSlideOver from "../Profile/EditProfileSlideOver";
import { authUtils } from "../utils/authUtils";
import { navigateMainTab } from "../utils/navigation";
import { useOptimizedButton } from "../utils/performance";

export default function AccountScreen() {
  const [activeTab, setActiveTab] = useState<string>("Account");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedContentTab, setSelectedContentTab] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, getAvatarUrl, getFullName, getUserSection } = useUserProfile();
  const { analytics } = useAccountContent();

  // Normalize null -> undefined for consumers expecting undefined
  const getAvatarUrlAsUndef = (u: any) => getAvatarUrl(u) ?? undefined;

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

  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <AccountHeader
          user={user}
          getAvatarUrl={getAvatarUrlAsUndef}
          getFullName={getFullName}
          getUserSection={getUserSection}
          onPressProfile={handleProfilePress}
        />

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
          className="bg-[#dcdfe418]"
        >
          <ProfileSummary
            user={user}
            getAvatarUrl={getAvatarUrlAsUndef}
            getFullName={getFullName}
            onEdit={() => setIsEditOpen(true)}
            onLogout={optimizedLogoutHandler}
          />

          <ContentTabs
            selectedIndex={selectedContentTab}
            onSelect={setSelectedContentTab}
          />

          <ContentSection
            selectedIndex={selectedContentTab}
            analytics={analytics}
          />
        </ScrollView>

        <ProfileSwitchModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />

        <BottomNavOverlay
          selectedTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            navigateMainTab(tab as any);
          }}
        />
      </SafeAreaView>

      <EditProfileSlideOver
        visible={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />
    </>
  );
}
