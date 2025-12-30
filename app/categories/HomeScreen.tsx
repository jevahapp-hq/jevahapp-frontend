import BottomNav from "@/app/components/BottomNav";
import MiniAudioPlayer from "@/app/components/MiniAudioPlayer";
import { useLocalSearchParams } from "expo-router";
import { Suspense, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { CommunityScreenWithSuspense, LibraryScreenWithSuspense, BibleScreenWithSuspense } from "../utils/lazyImports";
import HomeTabContent from "./HomeTabContent";

// Loading fallback for lazy-loaded tabs
const TabLoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
    // Lazy load heavy screens for better performance
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
      <MiniAudioPlayer />
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
