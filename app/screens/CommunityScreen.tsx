// CommunityScreen.tsx - Coming Soon Version
// NOTE: Original full functionality is preserved at the bottom of this file (commented out)
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { navigateMainTab } from "../utils/navigation";

const { width } = Dimensions.get("window");

// Jevah Premium Theme Colors
const THEME = {
  primary: "#256E63",
  secondary: "#FEA74E",
  gold: "#D4AF37",
  dark: "#1A1A2E",
  surface: "#FFFFFF",
  surfaceAlt: "#F8F9FA",
  text: "#1D2939",
  textMuted: "#667085",
  border: "#E5E7EB",
};

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.surfaceAlt }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 20,
          backgroundColor: THEME.surface,
          borderBottomWidth: 1,
          borderBottomColor: THEME.border,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 14,
              color: THEME.primary,
              fontFamily: "Rubik-Medium",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Welcome to
          </Text>
          <Text
            style={{
              fontSize: 32,
              fontFamily: "Rubik-Bold",
              color: THEME.text,
            }}
          >
            Community
          </Text>
        </View>

        <Text
          style={{
            fontSize: 15,
            color: THEME.textMuted,
            fontFamily: "Rubik-Regular",
            marginTop: 8,
            lineHeight: 22,
          }}
        >
          Connect, share, and grow with fellow believers
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          paddingBottom: 100,
        }}
      >
        {/* Coming Soon Card */}
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            backgroundColor: THEME.surface,
            borderRadius: 24,
            padding: 32,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 4,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 32,
              backgroundColor: `${THEME.primary}15`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Ionicons name="people" size={48} color={THEME.primary} />
          </View>

          {/* Badge */}
          <View
            style={{
              backgroundColor: `${THEME.secondary}20`,
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 20,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Rubik-Bold",
                color: THEME.secondary,
                letterSpacing: 0.5,
              }}
            >
              COMING SOON
            </Text>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 24,
              fontFamily: "Rubik-Bold",
              color: THEME.text,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Community Features
          </Text>

          {/* Description */}
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Rubik-Regular",
              color: THEME.textMuted,
              textAlign: "center",
              lineHeight: 24,
              marginBottom: 24,
            }}
          >
            We're building amazing features to help you connect with fellow believers. Stay tuned for Prayer Wall, Forums, Polls, and Groups!
          </Text>

          {/* Feature Preview */}
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {["Prayer Wall", "Forum", "Polls", "Groups"].map((feature, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: THEME.surfaceAlt,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Rubik-Medium",
                    color: THEME.text,
                  }}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>


        </View>
      </ScrollView>

      <BottomNavOverlay
        selectedTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          navigateMainTab(tab as any);
        }}
      />
    </SafeAreaView>
  );
}

/*
================================================================================
ORIGINAL FULL COMMUNITY SCREEN FUNCTIONALITY - PRESERVED FOR FUTURE USE
================================================================================

To restore the full Community functionality, replace the component above with:

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { navigateMainTab } from "../utils/navigation";

const { width } = Dimensions.get("window");

const THEME = {
  primary: "#256E63",
  secondary: "#FEA74E",
  gold: "#D4AF37",
  dark: "#1A1A2E",
  surface: "#FFFFFF",
  surfaceAlt: "#F8F9FA",
  text: "#1D2939",
  textMuted: "#667085",
  border: "#E5E7EB",
  gradient: ["#256E63", "#1A4A43"],
};

interface CommunityFeature {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  bgGradient: [string, string];
  route: string;
  badge?: string;
}

const communityFeatures: CommunityFeature[] = [
  {
    id: "1",
    title: "Prayer Wall",
    subtitle: "Share requests & pray together",
    icon: "hands-pray",
    color: "#279CCA",
    bgGradient: ["#279CCA", "#1E7A9E"],
    route: "/screens/PrayerWallScreen",
  },
  {
    id: "2",
    title: "Forum",
    subtitle: "Discussions & conversations",
    icon: "forum",
    color: "#CC1CC0",
    bgGradient: ["#CC1CC0", "#9E1695"],
    route: "/screens/ForumScreen",
  },
  {
    id: "3",
    title: "Polls & Surveys",
    subtitle: "Vote & share your opinion",
    icon: "poll",
    color: "#DF930E",
    bgGradient: ["#DF930E", "#B8780B"],
    route: "/screens/PollsScreen",
  },
  {
    id: "4",
    title: "Groups",
    subtitle: "Join faith communities",
    icon: "account-group",
    color: "#666AF6",
    bgGradient: ["#666AF6", "#4E52C4"],
    route: "/screens/GroupsScreen",
    badge: "New",
  },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();

  const handleFeaturePress = (feature: CommunityFeature) => {
    router.push(feature.route as any);
  };

  const handleCreatePress = () => {
    router.push("/screens/CreateGroupScreen" as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.surfaceAlt }}>
      <View style={{
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
        backgroundColor: THEME.surface,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
      }}>
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <View>
            <Text style={{
              fontSize: 14,
              color: THEME.primary,
              fontFamily: "Rubik-Medium",
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 4,
            }}>
              Welcome to
            </Text>
            <Text style={{
              fontSize: 32,
              fontFamily: "Rubik-Bold",
              color: THEME.text,
            }}>
              Community
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleCreatePress}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: THEME.primary,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 24,
              shadowColor: THEME.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={{
              color: "#FFF",
              fontFamily: "Rubik-SemiBold",
              fontSize: 14,
              marginLeft: 6,
            }}>
              Create
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{
          fontSize: 15,
          color: THEME.textMuted,
          fontFamily: "Rubik-Regular",
          marginTop: 8,
          lineHeight: 22,
        }}>
          Connect, share, and grow with fellow believers
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
        <View style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 16,
        }}>
          {communityFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              onPress={() => handleFeaturePress(feature)}
              activeOpacity={0.9}
              style={{
                width: (width - 56) / 2,
                backgroundColor: THEME.surface,
                borderRadius: 20,
                padding: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              {feature.badge && (
                <View style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  backgroundColor: THEME.secondary,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                }}>
                  <Text style={{
                    color: "#FFF",
                    fontSize: 10,
                    fontFamily: "Rubik-Bold",
                  }}>
                    {feature.badge}
                  </Text>
                </View>
              )}

              <View style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: `${feature.color}15`,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}>
                <MaterialCommunityIcons
                  name={feature.icon as any}
                  size={28}
                  color={feature.color}
                />
              </View>

              <Text style={{
                fontSize: 17,
                fontFamily: "Rubik-Bold",
                color: THEME.text,
                marginBottom: 6,
              }}>
                {feature.title}
              </Text>

              <Text style={{
                fontSize: 13,
                fontFamily: "Rubik-Regular",
                color: THEME.textMuted,
                lineHeight: 18,
              }}>
                {feature.subtitle}
              </Text>

              <View style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 16,
              }}>
                <Text style={{
                  fontSize: 13,
                  fontFamily: "Rubik-Medium",
                  color: feature.color,
                  marginRight: 4,
                }}>
                  Explore
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={feature.color}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <BottomNavOverlay
        selectedTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          navigateMainTab(tab as any);
        }}
      />
    </SafeAreaView>
  );
}

================================================================================
*/
