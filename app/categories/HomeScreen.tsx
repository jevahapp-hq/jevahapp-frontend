import BottomNav from "@/app/components/BottomNav";
import MiniAudioPlayer from "@/app/components/MiniAudioPlayer";
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
    // Only render the active tab - React Native compatible approach
    // This still provides performance benefits without breaking lazy loading
    switch (selectedTab) {
      case "Home":
        return <HomeTabContent />;
      case "Community":
        return <CommunityScreen />;
      case "Library":
        return <LibraryScreen />;
      case "Bible":
        return <BibleScreen />;
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
