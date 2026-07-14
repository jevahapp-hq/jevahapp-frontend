import BottomNav from "@/app/components/BottomNav";
import { useLocalSearchParams } from "expo-router";
import { Suspense, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import HomeTabContent from "./HomeTabContent";
import {
  BibleScreenWithSuspense,
  CommunityScreenWithSuspense,
  LibraryScreenWithSuspense,
} from "../utils/lazyImports";

// Loading fallback for lazy-loaded tabs
const TabLoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
    <ActivityIndicator size="large" color="#000" />
  </View>
);

const tabList = ["Home", "Community", "Library", "Bible"];

export default function HomeScreen() {
  const [selectedTab, setSelectedTab] = useState("Home");
  const { default: defaultTabParamRaw } = useLocalSearchParams();
  const defaultTabParam = Array.isArray(defaultTabParamRaw)
    ? defaultTabParamRaw[0]
    : defaultTabParamRaw;

  function handleTabChange(tab: string) {
    setSelectedTab(tab);
  }

  useEffect(() => {
    if (defaultTabParam && tabList.includes(defaultTabParam)) {
      handleTabChange(defaultTabParam);
    }
  }, [defaultTabParam]);

  const renderTabContent = () => {
    switch (selectedTab) {
      case "Home":
        return <HomeTabContent />;
      case "Community":
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <CommunityScreenWithSuspense />
          </Suspense>
        );
      case "Library":
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <LibraryScreenWithSuspense />
          </Suspense>
        );
      case "Bible":
        return (
          <Suspense fallback={<TabLoadingFallback />}>
            <BibleScreenWithSuspense />
          </Suspense>
        );
      default:
        return <HomeTabContent />;
    }
  };

  return (
    <View style={{ flex: 1 }} className="w-full">
      {renderTabContent()}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#fff",
        }}
      >
        <BottomNav selectedTab={selectedTab} setSelectedTab={handleTabChange} />
      </View>
    </View>
  );
}
