import { Text, View } from "react-native";

export function ArtistsLaneBanner() {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <Text
        style={{
          fontSize: 13,
          color: "#6B7280",
          fontFamily: "Rubik_400Regular",
        }}
      >
        Original gospel from Jevah creators — never mixed with copyright-free
        beds.
      </Text>
    </View>
  );
}
