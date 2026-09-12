type ResumeFeedRow = {
  rowType: string;
  key: string;
  item?: { _id?: string; id?: string };
};

/** Strip the `${tab}::` namespace used by feed playback keys. */
export function playbackKeyToContentKey(key: string): string {
  if (!key) return "";
  return key.includes("::") ? key.split("::").slice(1).join("::") : key;
}

/**
 * When the user swipes to a different reel, keep the feed tab prefix
 * (`ALL::…`) and retarget it at the video they actually exited on.
 */
export function remapResumeFeedKey(
  previousFeedKey: string | undefined,
  contentId: string
): string | undefined {
  const id = String(contentId || "").trim();
  if (!id) return previousFeedKey;
  if (!previousFeedKey) return undefined;
  const sep = previousFeedKey.indexOf("::");
  if (sep <= 0) return id;
  return `${previousFeedKey.slice(0, sep)}::${id}`;
}

export function findMediaRowIndex(
  listData: ResumeFeedRow[] | undefined,
  resumeKey: string | null | undefined,
  contentId?: string | null
): number {
  if (!listData?.length) return -1;
  const key = String(resumeKey || "").trim();
  const id = String(contentId || "").trim();
  const contentFromKey = playbackKeyToContentKey(key);

  if (key) {
    const exact = listData.findIndex(
      (row) => row.rowType === "media" && row.key === key
    );
    if (exact >= 0) return exact;
  }

  return listData.findIndex((row) => {
    if (row.rowType !== "media") return false;
    const itemId = String(row.item?._id || (row.item as any)?.id || "");
    const itemKey = row.key;
    return (
      (!!id && (itemId === id || itemKey.endsWith(`::${id}`))) ||
      (!!contentFromKey &&
        (itemId === contentFromKey ||
          itemKey === contentFromKey ||
          itemKey.endsWith(`::${contentFromKey}`)))
    );
  });
}

export function resolveFeedResumeKey(options: {
  storeFeedKey?: string | null;
  blurFeedKey?: string | null;
  contentId?: string | null;
  listData?: ResumeFeedRow[];
}): string | null {
  const listKeys =
    options.listData
      ?.filter((row) => row.rowType === "media")
      .map((row) => row.key) ?? [];

  const storeKey =
    typeof options.storeFeedKey === "string" && options.storeFeedKey
      ? options.storeFeedKey
      : null;
  const blurKey =
    typeof options.blurFeedKey === "string" && options.blurFeedKey
      ? options.blurFeedKey
      : null;

  if (storeKey && listKeys.includes(storeKey)) return storeKey;

  const byContent = findMediaRowIndex(
    options.listData,
    storeKey,
    options.contentId
  );
  if (byContent >= 0 && options.listData?.[byContent]?.rowType === "media") {
    return options.listData[byContent].key;
  }

  if (blurKey && listKeys.includes(blurKey)) return blurKey;

  // Never restore a key that is not in the live list — viewability would
  // time out and lock onto the first visible row.
  return null;
}
