/**
 * FeedSectionTitle - Small text row ("Most Recent", "All Content (N items)")
 * rendered as a regular row inside the feed's FlashList data.
 */
import React from "react";
import { Text, View } from "react-native";

export function FeedSectionTitle({ title }: { title: string }) {
  return (
    <View style={{ marginTop: 12, marginBottom: 8 }}>
      <Text
        style={{
          fontSize: 16,
          fontFamily: "PlusJakartaSans_600SemiBold",
          fontWeight: "600",
          color: "#344054",
          paddingHorizontal: 16,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

export default FeedSectionTitle;
