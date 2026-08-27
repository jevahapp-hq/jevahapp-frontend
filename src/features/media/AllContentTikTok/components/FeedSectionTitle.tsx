/**
 * FeedSectionTitle - Small text row ("Most Recent", "All Content (N items)")
 * rendered as a regular row inside the feed's FlashList data.
 */
import React from "react";
import { Text, View } from "react-native";
import { UI_CONFIG } from "../../../../shared/constants";

export function FeedSectionTitle({ title }: { title: string }) {
  return (
    <View style={{ marginTop: UI_CONFIG.SPACING.XL, marginBottom: UI_CONFIG.SPACING.MD }}>
      <Text
        style={{
          fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
          fontFamily: "PlusJakartaSans-Bold",
          fontWeight: "700",
          color: UI_CONFIG.COLORS.TEXT_PRIMARY,
          paddingHorizontal: UI_CONFIG.SPACING.MD,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

export default FeedSectionTitle;
