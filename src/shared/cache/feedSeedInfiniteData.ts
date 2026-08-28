/**
 * Disk seed → React Query infinite shape.
 * Frame 0 paints pages[0].media; network appends later.
 */
export function buildFeedInfiniteData<T extends { media: unknown[] }>(
  result: T,
  forYou: boolean
): {
  pages: Array<T & { source: "for_you" | "all_content" }>;
  pageParams: Array<number | null>;
} {
  return {
    pages: [
      {
        ...result,
        source: forYou ? "for_you" : "all_content",
      },
    ],
    pageParams: [forYou ? null : 1],
  };
}

export function shouldSeedFeedPage(media: unknown[] | undefined | null): boolean {
  return Array.isArray(media) && media.length > 0;
}
