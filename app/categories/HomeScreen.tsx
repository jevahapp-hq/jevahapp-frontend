import BottomNav from "@/app/components/BottomNav";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import BibleScreen from "../screens/BibleScreen";
import CommunityScreen from "../screens/CommunityScreen";
import LibraryScreen from "../screens/library/LibraryScreen";
import HomeTabContent from "./HomeTabContent";

const tabList = ["Home", "Community", "Library", "Bible"];

/**
 * Keep visited tabs mounted. Home uses opacity (not display:none) so
 * native video textures survive Bible/Library/Community round-trips —
 * matching Instagram/TikTok tab behavior (same scroll position + video).
 */
export default function HomeScreen() {
  const [selectedTab, setSelectedTab] = useState("Home");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    () => new Set(["Home"])
  );
  const { default: defaultTabParamRaw } = useLocalSearchParams();
  const defaultTabParam = Array.isArray(defaultTabParamRaw)
    ? defaultTabParamRaw[0]
    : defaultTabParamRaw;

  function handleTabChange(tab: string) {
    setSelectedTab(tab);
    setVisitedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
  }

  useEffect(() => {
    if (defaultTabParam && tabList.includes(defaultTabParam)) {
      handleTabChange(defaultTabParam);
    }
  }, [defaultTabParam]);

  const isHome = selectedTab === "Home";

  return (
    <View style={{ flex: 1 }} className="w-full">
      <View style={styles.tabHost}>
        <View
          style={[
            styles.tabPane,
            {
              opacity: isHome ? 1 : 0,
              pointerEvents: isHome ? "auto" : "none",
              zIndex: isHome ? 2 : 0,
            },
          ]}
          // Keep the native hierarchy alive while hidden (iOS AVPlayer).
          collapsable={false}
        >
          <HomeTabContent />
        </View>

        {visitedTabs.has("Community") && (
          <View
            style={[
              styles.tabPane,
              {
                opacity: selectedTab === "Community" ? 1 : 0,
                pointerEvents: selectedTab === "Community" ? "auto" : "none",
                zIndex: selectedTab === "Community" ? 2 : 0,
              },
            ]}
          >
            <CommunityScreen />
          </View>
        )}

        {visitedTabs.has("Library") && (
          <View
            style={[
              styles.tabPane,
              {
                opacity: selectedTab === "Library" ? 1 : 0,
                pointerEvents: selectedTab === "Library" ? "auto" : "none",
                zIndex: selectedTab === "Library" ? 2 : 0,
              },
            ]}
          >
            <LibraryScreen />
          </View>
        )}

        {visitedTabs.has("Bible") && (
          <View
            style={[
              styles.tabPane,
              {
                opacity: selectedTab === "Bible" ? 1 : 0,
                pointerEvents: selectedTab === "Bible" ? "auto" : "none",
                zIndex: selectedTab === "Bible" ? 2 : 0,
              },
            ]}
          >
            <BibleScreen />
          </View>
        )}
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          backgroundColor: "#fff",
        }}
      >
        <BottomNav selectedTab={selectedTab} setSelectedTab={handleTabChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabHost: {
    flex: 1,
  },
  tabPane: {
    ...StyleSheet.absoluteFillObject,
  },
});
