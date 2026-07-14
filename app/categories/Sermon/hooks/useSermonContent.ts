import { useMemo } from "react";
import { getDisplayName } from "../../../utils/userValidation";
import { RecommendedItem } from "../types";

export function useSermonContent(mediaList: any[]) {
  const sermonContent = useMemo(
    () => mediaList.filter((item) => item.contentType === "sermon"),
    [mediaList]
  );

  const recentSermons = useMemo(
    () => sermonContent.slice(0, 1),
    [sermonContent]
  );

  const exploreMoreSermons = useMemo(
    () => sermonContent.slice(1, 5),
    [sermonContent]
  );

  const trendingSermons = useMemo(
    () => sermonContent.slice(5, 9),
    [sermonContent]
  );

  const recommendedSermons = useMemo(
    () => sermonContent.slice(9, 12),
    [sermonContent]
  );

  const previouslyViewed: RecommendedItem[] = useMemo(
    () =>
      sermonContent.slice(0, 3).map((item, index) => ({
        key: `previously-viewed-${item._id || index}`,
        fileUrl: item.fileUrl,
        title: item.title,
        imageUrl: item.imageUrl || { uri: item.fileUrl },
        subTitle: getDisplayName(item.speaker, item.uploadedBy),
        views: (item as any).views || 0,
        onPress: () => console.log("Viewing", item.title),
      })),
    [sermonContent]
  );

  return {
    sermonContent,
    recentSermons,
    exploreMoreSermons,
    trendingSermons,
    recommendedSermons,
    previouslyViewed,
  };
}
