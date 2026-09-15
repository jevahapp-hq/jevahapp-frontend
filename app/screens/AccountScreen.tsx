// AccountScreen.tsx
import { useClerk } from "@clerk/clerk-expo";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AccountHeader from "../components/account/AccountHeader";
import ContentSection from "../components/account/ContentSection";
import ContentTabs from "../components/account/ContentTabs";
import ProfileSummary from "../components/account/ProfileSummary";
import ProfileSwitchModal from "../components/account/ProfileSwitchModal";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { useUserProfile } from "../hooks/useUserProfile";
import EditProfileSlideOver from "../Profile/EditProfileSlideOver";
import { navigateMainTab } from "../utils/navigation";
import {
  clearBackendSession,
  clearBackendSessionPresent,
} from "../utils/sessionAuth";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";

export default function AccountScreen() {
  const [activeTab, setActiveTab] = useState<string>("Account");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedContentTab, setSelectedContentTab] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, getAvatarUrl, getFullName, getUserSection, refreshUserProfile } = useUserProfile();

  useFocusEffect(
    useCallback(() => {
      void refreshUserProfile();
    }, [refreshUserProfile])
  );

  const isAdminUser = useMemo(() => {
    const role = String(
      (user as any)?.role || (user as any)?.userRole || ""
    ).toLowerCase();
    return role === "admin" || role === "moderator" || role === "superadmin";
  }, [user]);

  // Normalize null -> undefined for consumers expecting undefined
  const getAvatarUrlAsUndef = (u: any) => getAvatarUrl(u) ?? undefined;

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          try {
            try {
              useGlobalVideoStore.getState().pauseAllVideos();
            } catch {
              // no-op
            }
            // Drop the sync session flag first so auth routes paint login
            // immediately instead of waiting on Clerk / SecureStore / APIs.
            clearBackendSessionPresent();
            router.replace("/auth/login");
            void (async () => {
              try {
                await clearBackendSession();
              } catch {
                // already on login
              }
              try {
                await signOut();
              } catch {
                // Email/password users may have no Clerk session
              }
            })();
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

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

        {isAdminUser ? (
          <TouchableOpacity
            onPress={() => router.push("/admin")}
            style={{
              marginHorizontal: 16,
              marginTop: 8,
              marginBottom: 4,
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: "#0A332D",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                Admin console
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
                Reports · Releases
              </Text>
            </View>
            <Text style={{ color: "#FEA74E", fontWeight: "700" }}>Open</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ flex: 1 }} className="bg-[#dcdfe418]">
          <View style={{ paddingHorizontal: 16 }}>
            <ProfileSummary
              user={user}
              getAvatarUrl={getAvatarUrlAsUndef}
              getFullName={getFullName}
              onEdit={() => setIsEditOpen(true)}
              onChangeAvatar={() =>
                router.push({
                  pathname: "/avatars/indexAvatar",
                  params: { from: "profile" },
                })
              }
              onLogout={handleLogout}
              onProfileUpdate={refreshUserProfile}
            />

            <ContentTabs
              selectedIndex={selectedContentTab}
              onSelect={setSelectedContentTab}
            />
          </View>

          <View style={{ flex: 1 }}>
            <ContentSection
              selectedIndex={selectedContentTab}
            />
          </View>
        </View>

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
