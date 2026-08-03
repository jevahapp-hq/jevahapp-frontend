import { Dimensions, ScrollView, View } from "react-native";
import { discoverCards } from "../constants/discoverCards";
import { DiscoverCardItem } from "./DiscoverCardItem";

type MusicDiscoverShelfProps = {
  screenWidth?: number;
};

/** Discover Weekly — copyright-free shelf only */
export function MusicDiscoverShelf({
  screenWidth = Dimensions.get("window").width,
}: MusicDiscoverShelfProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        {discoverCards.map((card) => (
          <View key={card.id}>
            <DiscoverCardItem item={card} screenWidth={screenWidth} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
