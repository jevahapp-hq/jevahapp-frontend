/**
 * The all-content endpoints return the media array under several different
 * shapes depending on backend version, and both variants merge recommendation
 * sections into the feed. Kept in one place so the public and authenticated
 * readers cannot drift apart.
 */

export function extractMediaArray(data: any): {
  media: any[];
  pagination: any;
} {
  if (data?.media && Array.isArray(data.media)) {
    return { media: data.media, pagination: data.pagination };
  }
  if (data?.data?.media && Array.isArray(data.data.media)) {
    return {
      media: data.data.media,
      pagination: data.data?.pagination || data.pagination,
    };
  }
  if (Array.isArray(data)) return { media: data, pagination: null };
  if (Array.isArray(data?.data)) return { media: data.data, pagination: null };
  return { media: [], pagination: null };
}

/**
 * TEMPORARY WORKAROUND: fold `recommendations.sections` into the main feed,
 * skipping anything already present.
 */
export function mergeRecommendations(media: any[], data: any): any[] {
  const sections =
    data?.recommendations?.sections ||
    data?.data?.recommendations?.sections ||
    [];
  if (!sections.length) return media;

  const seenIds = new Set(media.map((m: any) => m._id || m.id));
  const supplemental: any[] = [];

  sections.forEach((section: any) => {
    const sectionItems = section.media || section.items || [];
    if (!Array.isArray(sectionItems)) return;
    sectionItems.forEach((item: any) => {
      const id = item._id || item.id;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        supplemental.push(item);
      }
    });
  });

  return supplemental.length ? [...media, ...supplemental] : media;
}

export function totalFrom(pagination: any, data: any, media: any[]): number {
  return (
    pagination?.total || data?.data?.total || data?.total || media.length
  );
}
