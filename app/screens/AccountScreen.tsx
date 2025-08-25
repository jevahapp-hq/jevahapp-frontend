// AccountScreen.tsx
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import BottomNav from "../components/BottomNav";
import { authUtils } from "../utils/authUtils";
import { useOptimizedButton } from "../utils/performance";

export default function AccountScreen() {
  const [activeTab, setActiveTab] = useState<string>("Account");
  const router = useRouter();
  const { signOut } = useClerk();

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
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
      ]
    );
  };

  // Use optimized button handler
  const optimizedLogoutHandler = useOptimizedButton(handleLogout, {
    debounceMs: 200,
    key: 'logout-button',
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#FCFCFD" }}>
      <View style={{ 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center",
        paddingHorizontal: 20,
      }}>
        <Text style={{ 
          fontSize: 24, 
          fontWeight: "bold", 
          color: "#3B3B3B",
          marginBottom: 40,
        }}>
          Account Settings
        </Text>
        
        {/* Logout Button */}
        <TouchableOpacity
          onPress={optimizedLogoutHandler}
          style={{
            backgroundColor: "#EF4444",
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#DC2626",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
          activeOpacity={0.8}
        >
          <Text style={{
            color: "white",
            fontSize: 16,
            fontWeight: "600",
            textAlign: "center",
          }}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>

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
                router.replace({ pathname: "/screens/library/LibraryScreen" });
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
    </View>
  );
}