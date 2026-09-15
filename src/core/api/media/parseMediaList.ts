function firstArray(...candidates: unknown[]): any[] | undefined {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return undefined;
}

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
  // { data: { media } }, { media }, { items }, { content }, { data: [...] },
  // or a bare array.
  const body =
    root && typeof root === "object" && !Array.isArray(root) && "data" in root
      ? (root as any).data ?? root
      : root;

  const pagination =
    body?.pagination ||
    body?.data?.pagination ||
    root?.pagination ||
    null;

  let mediaArr =
    firstArray(
      body?.items,
      body?.content,
      body?.media,
      body?.tracks,
      body?.sermons,
      body?.ebooks,
      body?.books,
      body?.data?.items,
      body?.data?.content,
      body?.data?.media,
      body?.data?.tracks,
      body?.data?.sermons,
      body?.data?.ebooks,
      body?.data?.books,
      Array.isArray(body?.data) ? body.data : undefined,
      Array.isArray(body) ? body : undefined,
      root?.items,
      root?.content,
      root?.media,
      root?.tracks,
      Array.isArray(root) ? root : undefined
    ) ?? [];

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
