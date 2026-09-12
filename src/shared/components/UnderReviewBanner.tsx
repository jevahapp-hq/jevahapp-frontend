/**
 * Owner-only review-status banner. Full copy wraps on every breakpoint;
 * FlashList row extra is computed from the same layout helpers.
 */
import { useMemo } from "react";
import { Platform, Text, useWindowDimensions, View } from "react-native";
import { ModerationBadge } from "./ModerationBadge";
import { isUnderReview } from "../media/moderationVisibility";
import {
  UNDER_REVIEW_MAX_FONT_MULTIPLIER,
  UNDER_REVIEW_MESSAGE,
  getUnderReviewBannerMetrics,
  getUnderReviewBannerStyles,
} from "../media/underReviewBannerLayout";

const WEB_TEXT_WRAP =
  Platform.OS === "web"
    ? ({
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      } as object)
    : null;

export function UnderReviewBanner({
  status,
  showBadge = false,
}: {
  status?: string | null;
  showBadge?: boolean;
}) {
  const { width } = useWindowDimensions();
  const metrics = useMemo(
    () => getUnderReviewBannerMetrics(width, { withBadge: showBadge }),
    [width, showBadge]
  );
  const styles = useMemo(
    () => getUnderReviewBannerStyles(metrics),
    [metrics]
  );

  if (!isUnderReview({ moderationStatus: status })) return null;

  return (
    <View
      style={styles.box}
      collapsable={false}
      accessibilityRole="text"
      accessibilityLabel={UNDER_REVIEW_MESSAGE}
    >
      {showBadge ? (
        <View style={styles.badge}>
          <ModerationBadge status={status || "under_review"} />
        </View>
      ) : null}
      <Text
        style={[styles.text, WEB_TEXT_WRAP]}
        allowFontScaling
        maxFontSizeMultiplier={UNDER_REVIEW_MAX_FONT_MULTIPLIER}
        adjustsFontSizeToFit={false}
      >
        {UNDER_REVIEW_MESSAGE}
      </Text>
    </View>
  );
}
