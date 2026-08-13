import { Text, View } from "react-native";

/** Artists Discover shelf header — Spotify/YTM “For You” tone. */
export function ArtistsLaneBanner({
  personalized = false,
}: {
  personalized?: boolean;
}) {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 12, marginTop: 4 }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: "#0F1C1A",
          fontFamily: "Rubik_700Bold",
          marginBottom: 4,
        }}
      >
        {personalized ? "For You" : "Artists"}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: "#6B7280",
          fontFamily: "Rubik_400Regular",
          lineHeight: 18,
        }}
      >
        {personalized
          ? "Made for you — gospel from creators you vibe with."
          : "Original gospel from Jevah creators — never mixed with copyright-free beds."}
      </Text>
    </View>
  );
}
