// CommunityScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { navigateMainTab } from "../utils/navigation";
import communityService, { CommunityModuleDescriptor, CommunityModuleKey } from "../services/communityService";

interface CommunityCard {
  id: string;
  title: string;
  color: string;
  key: CommunityModuleKey;
  route?: string;
}

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();
  const PADDING_X = 20; // matches screen paddingHorizontal
  const ITEM_GAP = 16;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<CommunityModuleDescriptor[]>([]);

  useEffect(() => {
    let mounted = true;
    setError(null);
    setLoading(true);
    communityService
      .fetchModules()
      .then((res) => {
        if (!mounted) return;
        if ((res as any)?.success && Array.isArray(res.modules)) {
          const visible = res.modules
            .filter((m) => m.visible !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          setModules(visible);
        } else {
          setError("Failed to load modules");
        }
      })
      .catch((e) => {
        if (!mounted) return;
        setError(String(e?.message || e || "Failed to load modules"));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const communityCards: CommunityCard[] = useMemo(() => {
    if (!modules || !modules.length) return [] as CommunityCard[];
    return modules.map((m) => ({
      id: m.id,
      title: m.title,
      color: m.color || mapColorForKey(m.key),
      key: m.key,
      route: m.route,
    }));
  }, [modules]);

  function mapColorForKey(key: CommunityModuleKey): string {
    switch (key) {
      case "prayer_wall":
        return "#279CCA";
      case "forum":
        return "#CC1CC0";
      case "polls":
        return "#DF930E";
      case "groups":
        return "#666AF6";
      default:
        return "#279CCA";
    }
  }

  const handleCardPress = (card: CommunityCard) => {
    if (card.route) {
      router.push(card.route as any);
      return;
    }
    switch (card.key) {
      case "prayer_wall":
        router.push("/screens/PrayerWallScreen");
        break;
      case "forum":
        router.push("/screens/ForumScreen");
        break;
      case "polls":
        router.push("/screens/PollsScreen");
        break;
      case "groups":
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

      {/* Cards Grid */}
      <View
        style={{
          flex: 1,
          paddingHorizontal: PADDING_X,
          paddingTop: 20,
          paddingBottom: 100,
        }}
      >
        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="small" color="#666" />
          </View>
        ) : error ? (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 12,
            }}
          >
            <Text
              style={{
                color: "#C00",
                textAlign: "center",
                fontFamily: "Rubik-Regular",
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}
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
