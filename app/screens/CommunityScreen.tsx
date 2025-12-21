// CommunityScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, Text, View } from "react-native";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { navigateMainTab } from "../utils/navigation";

interface CommunityCard {
  id: string;
  title: string;
  color: string;
}

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();
  const PADDING_X = 20; // matches screen paddingHorizontal
  const ITEM_GAP = 16;

  const communityCards: CommunityCard[] = [
    { id: "1", title: "Prayer Wall", color: "#279CCA" },
    { id: "2", title: "Forum", color: "#CC1CC0" },
    { id: "3", title: "Polls/surveys", color: "#DF930E" },
    { id: "4", title: "Groups", color: "#666AF6" },
  ];

  const handleCardPress = (card: CommunityCard) => {
    switch (card.title) {
      case "Prayer Wall":
        router.push("/screens/PrayerWallScreen");
        break;
      case "Forum":
        router.push("/screens/ForumScreen");
        break;
      case "Polls/surveys":
        router.push("/screens/PollsScreen");
        break;
      case "Groups":
        router.push("/screens/GroupsScreen");
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#FCFCFD", paddingTop: 20 }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 20,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: "#000",
            fontFamily: "Rubik-Bold",
          }}
        >
          Community
        </Text>

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#FEA74E",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </View>
      </View>

      {/* Coming Soon Screen */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: PADDING_X,
          paddingTop: 20,
          paddingBottom: 100,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            paddingHorizontal: 24,
            paddingVertical: 32,
            width: "100%",
            maxWidth: 320,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {/* Community Icon */}
          <View
            style={{
              marginBottom: 24,
            }}
          >
            <Ionicons
              name="people-circle-outline"
              size={64}
              color="#279CCA"
            />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 24,
              fontFamily: "Rubik-Bold",
              color: "#000",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Community Features Coming Soon
          </Text>

          {/* Subtitle */}
          <Text
            style={{
              fontSize: 16,
              color: "#666",
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 24,
            }}
          >
            We're working hard to bring you amazing community features including prayer walls, forums, polls, and groups. Stay tuned for the next update!
          </Text>

          {/* Feature Preview */}
          <View
            style={{
              width: "100%",
              marginTop: 8,
            }}
          >
            <Text
              style={{
                color: "#000",
                marginBottom: 8,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Coming in the next update:
            </Text>
            <Text
              style={{
                color: "#666",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              • Connect with fellow believers
            </Text>
            <Text
              style={{
                color: "#666",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              • Share prayers and get support
            </Text>
            <Text
              style={{
                color: "#666",
                fontSize: 14,
              }}
            >
              • Join groups and discussions
            </Text>
          </View>
        </View>
      </View>

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
