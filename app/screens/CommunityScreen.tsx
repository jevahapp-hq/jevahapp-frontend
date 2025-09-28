// CommunityScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import BottomNav from "../components/BottomNav";

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
            backgroundColor: "#6663FD",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </View>
      </View>

      {/* Cards Grid */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: PADDING_X,
          paddingTop: 20,
          paddingBottom: 100,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {communityCards.map((card, idx) => (
            <TouchableOpacity
              key={card.id}
              onPress={() => handleCardPress(card)}
              style={{
                width: "48%",
                height: 194,
                backgroundColor: card.color,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                marginBottom: ITEM_GAP,
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: "bold",
                  textAlign: "center",
                  fontFamily: "Rubik-Bold",
                  paddingHorizontal: 10,
                }}
              >
                {card.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
                router.replace({ pathname: "/screens/PrayerWallScreen" });
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
    </SafeAreaView>
  );
}
