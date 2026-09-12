/**
 * Resolve which reel to show when fullscreen opens.
 * Store `currentIndex` defaults to 0, so navigation params / content id
 * must win over that placeholder — otherwise fullscreen always starts (and
 * later restores) the first video.
 */

export function parseNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export function findReelsIndexByContentId(
  videoList: Array<{ _id?: string; id?: string }> | undefined,
  contentId?: string | null
): number {
  const id = String(contentId || "").trim();
  if (!id || !videoList?.length) return -1;
  return videoList.findIndex(
    (item) =>
      String(item?._id || "") === id || String((item as { id?: string })?.id || "") === id
  );
}

export function resolveReelsStartIndex(options: {
  paramIndex?: unknown;
  storeIndex?: unknown;
  resumeIndex?: unknown;
  contentId?: string | null;
  videoList?: Array<{ _id?: string; id?: string }>;
}): number {
  const length = options.videoList?.length ?? 0;
  const clamp = (n: number) => (length > 0 ? Math.min(n, length - 1) : n);

  const byId = findReelsIndexByContentId(options.videoList, options.contentId);
  if (byId >= 0) return byId;

  const fromParam = parseNonNegativeInt(options.paramIndex);
  if (fromParam != null) return clamp(fromParam);

  const fromResume = parseNonNegativeInt(options.resumeIndex);
  if (fromResume != null) return clamp(fromResume);

  const fromStore = parseNonNegativeInt(options.storeIndex);
  if (fromStore != null) return clamp(fromStore);

  return 0;
}
