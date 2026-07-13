import BottomNav from "@/app/components/BottomNav";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import BibleScreen from "../screens/BibleScreen";
import CommunityScreen from "../screens/CommunityScreen";
import LibraryScreen from "../screens/library/LibraryScreen";
import HomeTabContent from "./HomeTabContent";

const tabList = ["Home", "Community", "Library", "Bible"];

export default function HomeScreen() {
  const [selectedTab, setSelectedTab] = useState("Home");
  // Track every tab the user has visited so far. Once a tab has been
  // visited, we keep it mounted (just hidden via `display: none`) instead
  // of unmounting it - this matches how social apps keep tab screens alive
  // in the background so switching between them is instant, with no
  // reload/refetch and no loading screen on every visit.
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

  return (
    <View style={{ flex: 1 }} className="w-full">
      <View style={{ flex: 1, display: selectedTab === "Home" ? "flex" : "none" }}>
        <HomeTabContent />
      </View>
      {visitedTabs.has("Community") && (
        <View style={{ flex: 1, display: selectedTab === "Community" ? "flex" : "none" }}>
          <CommunityScreen />
        </View>
      )}
      {visitedTabs.has("Library") && (
        <View style={{ flex: 1, display: selectedTab === "Library" ? "flex" : "none" }}>
          <LibraryScreen />
        </View>
      )}
      {visitedTabs.has("Bible") && (
        <View style={{ flex: 1, display: selectedTab === "Bible" ? "flex" : "none" }}>
          <BibleScreen />
        </View>
      )}
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
