/** Normalize varied backend list shapes into a single { media, total, ... } */
export function parseMediaListPayload(response: any): {
  media: any[];
  total: number;
  page: number;
  limit: number;
  pagination: any;
} {
  const root = response?.data;
  // apiClient wraps JSON as { success, data: <body> }. Body may itself be
  // { data: { media } }, { media }, { data: [...] }, or a bare array.
  const body =
    root && typeof root === "object" && !Array.isArray(root) && "data" in root
      ? (root as any).data ?? root
      : root;

  let mediaArr: any[] = [];
  let pagination: any = null;

  if (Array.isArray(body)) {
    mediaArr = body;
  } else if (body?.media && Array.isArray(body.media)) {
    mediaArr = body.media;
    pagination = body.pagination;
  } else if (body?.data?.media && Array.isArray(body.data.media)) {
    mediaArr = body.data.media;
    pagination = body.data?.pagination || body.pagination;
  } else if (Array.isArray(body?.data)) {
    mediaArr = body.data;
    pagination = body.pagination;
  } else if (Array.isArray(root)) {
    mediaArr = root;
  } else if (root?.media && Array.isArray(root.media)) {
    mediaArr = root.media;
    pagination = root.pagination;
  }

  // Merge recommendations.sections when main media is sparse
  const recommendations =
    body?.recommendations?.sections ||
    root?.recommendations?.sections ||
    body?.data?.recommendations?.sections ||
    [];
  if (Array.isArray(recommendations) && recommendations.length > 0) {
    const seenIds = new Set(mediaArr.map((m) => m?._id || m?.id));
    const supplemental: any[] = [];
    for (const section of recommendations) {
      const sectionItems = section?.media || section?.items || [];
      if (!Array.isArray(sectionItems)) continue;
      for (const item of sectionItems) {
        const id = item?._id || item?.id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          supplemental.push(item);
        }
      }
    }
    if (supplemental.length > 0) {
      mediaArr = [...mediaArr, ...supplemental];
    }
  }

  const total =
    pagination?.total ??
    body?.total ??
    body?.data?.total ??
    root?.total ??
    mediaArr.length;
  const page =
    pagination?.page ?? body?.page ?? body?.data?.page ?? root?.page ?? 1;
  const limit =
    pagination?.limit ??
    body?.limit ??
    body?.data?.limit ??
    root?.limit ??
    50;

  return { media: mediaArr, total, page, limit, pagination };
}
