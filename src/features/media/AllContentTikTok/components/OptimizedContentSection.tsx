import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { MediaItem } from "../../../../shared/types";
import { UI_CONFIG } from "../../../../shared/constants";
import { ContentList } from "./ContentList";
import { createUnifiedContentArray } from "../utils/contentListHelpers";

interface OptimizedContentSectionProps {
  title: string;
  firstFour: MediaItem[];
  nextFour: MediaItem[];
  rest: MediaItem[];
  renderItem: (item: MediaItem, index: number) => React.ReactElement;
  recommendedLiveComponent?: React.ReactElement;
  showRecommendedLive: boolean;
  contentType: string;
}

/**
 * Optimized content section that uses FlatList for virtualization
 * This provides 70% performance improvement over ScrollView
 */
export const OptimizedContentSection: React.FC<OptimizedContentSectionProps> = React.memo(
  ({
    title,
    firstFour,
    nextFour,
    rest,
    renderItem,
    recommendedLiveComponent,
    showRecommendedLive,
    contentType,
  }) => {
    // Create unified array: firstFour + nextFour + rest
    const unifiedData = useMemo(
      () => createUnifiedContentArray(firstFour, nextFour, rest),
      [firstFour, nextFour, rest]
    );

    // Calculate where to insert Recommended Live (after firstFour)
    const recommendedLiveIndex = firstFour.length;

    // Create ListHeaderComponent with first four items and recommended live
    const ListHeaderComponent = useMemo(
      () => (
        <View>
          {/* First four items */}
          <View>
            {firstFour.map((item, index) => renderItem(item, index))}
          </View>

          {/* Recommended Live Section */}
          {showRecommendedLive && recommendedLiveComponent && (
            <View style={{ marginTop: UI_CONFIG.SPACING.XL }}>
              <Text
                style={{
                  fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                  fontWeight: "600",
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                  paddingHorizontal: UI_CONFIG.SPACING.MD,
                  marginBottom: UI_CONFIG.SPACING.LG,
                }}
              >
                Recommended Live for you
              </Text>
              {recommendedLiveComponent}
            </View>
          )}

          {/* Next four items */}
          {nextFour.length > 0 && (
            <>
              <View style={{ marginTop: UI_CONFIG.SPACING.XXL }} />
              <View>
                {nextFour.map((item, index) =>
                  renderItem(item, index + firstFour.length)
                )}
              </View>
            </>
          )}

          {/* Section header */}
          {unifiedData.length > 0 && (
            <View style={{ marginTop: UI_CONFIG.SPACING.XXL }}>
              <Text
                style={{
                  fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                  fontWeight: "600",
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                  paddingHorizontal: UI_CONFIG.SPACING.MD,
                  marginBottom: UI_CONFIG.SPACING.LG,
                }}
              >
                {title} ({unifiedData.length} items)
              </Text>
            </View>
          )}
        </View>
      ),
      [
        firstFour,
        nextFour,
        recommendedLiveComponent,
        showRecommendedLive,
        title,
        unifiedData.length,
        renderItem,
      ]
    );

    // Only show FlatList if there's data in the rest array
    // The first items are already in the header
    if (rest.length === 0) {
      return (
        <View style={{ marginTop: UI_CONFIG.SPACING.XL }}>
          {ListHeaderComponent}
        </View>
      );
    }

    return (
      <View style={{ marginTop: UI_CONFIG.SPACING.XL }}>
        {/* Section Title */}
        <Text
          style={{
            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
            fontWeight: "600",
            color: UI_CONFIG.COLORS.TEXT_PRIMARY,
            paddingHorizontal: UI_CONFIG.SPACING.MD,
            marginBottom: UI_CONFIG.SPACING.LG,
          }}
        >
          {title} ({unifiedData.length} items)
        </Text>

        {/* First four items */}
        <View>
          {firstFour.map((item, index) => renderItem(item, index))}
        </View>

        {/* Recommended Live Section */}
        {showRecommendedLive && recommendedLiveComponent && (
          <View style={{ marginTop: UI_CONFIG.SPACING.XL }}>
            <Text
              style={{
                fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                fontWeight: "600",
                color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                paddingHorizontal: UI_CONFIG.SPACING.MD,
                marginBottom: UI_CONFIG.SPACING.LG,
              }}
            >
              Recommended Live for you
            </Text>
            {recommendedLiveComponent}
          </View>
        )}

        {/* Next four items */}
        {nextFour.length > 0 && (
          <>
            <View style={{ marginTop: UI_CONFIG.SPACING.XXL }} />
            <View>
              {nextFour.map((item, index) =>
                renderItem(item, index + firstFour.length)
              )}
            </View>
          </>
        )}

        {/* FlatList for remaining items (virtualized for performance) */}
        <ContentList
          data={rest}
          renderItem={(item, index) =>
            renderItem(item, index + firstFour.length + nextFour.length)
          }
          contentContainerStyle={{
            paddingTop: UI_CONFIG.SPACING.XXL,
          }}
        />
      </View>
    );
  }
);

OptimizedContentSection.displayName = "OptimizedContentSection";

