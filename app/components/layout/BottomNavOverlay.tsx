import { View } from "react-native";
import BottomNav from "../BottomNav";

type BottomNavOverlayProps = {
  selectedTab: string;
  onTabChange: (tab: string) => void;
};

export default function BottomNavOverlay({
  selectedTab,
  onTabChange,
}: BottomNavOverlayProps) {
  return (
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
      <BottomNav selectedTab={selectedTab} setSelectedTab={onTabChange} />
    </View>
  );
}


