import { useMemo, useEffect, useRef } from "react";
import { UserProfileCache } from "../../utils/cache/UserProfileCache";

export interface UseReelsVideoListOptions {
  reelsStoreVideoList: any[];
  videoListParam?: string;
  reelsStoreSetVideoList: (videos: any[]) => void;
}

export function useReelsVideoList({
  reelsStoreVideoList,
  videoListParam,
  reelsStoreSetVideoList,
}: UseReelsVideoListOptions) {
  const videoListProcessedRef = useRef(false);
  const lastVideoListRef = useRef<string | undefined>(undefined);
  const lastListKeyRef = useRef<string>("");

  const parsedVideoList = useMemo(() => {
    let rawList: any[] = [];

    if (reelsStoreVideoList.length > 0) {
      rawList = reelsStoreVideoList;
    } else if (videoListParam) {
      try {
        const parsed = JSON.parse(videoListParam);
        rawList = parsed;
      } catch (error) {
        console.error("❌ Failed to parse video list:", error);
        return [];
      }
    } else {
      return [];
    }

    if (rawList.length > 0) {
      return UserProfileCache.enrichContentArray(rawList);
    }
    return rawList;
  }, [reelsStoreVideoList, videoListParam]);

  useEffect(() => {
    if (videoListParam === lastVideoListRef.current && reelsStoreVideoList.length > 0) {
      return;
    }

    if (reelsStoreVideoList.length === 0 && videoListParam) {
      try {
        const parsed = JSON.parse(videoListParam);
        const enrichedList = UserProfileCache.enrichContentArray(parsed);
        reelsStoreSetVideoList(enrichedList);
        lastVideoListRef.current = videoListParam;
        videoListProcessedRef.current = true;
        return;
      } catch (error) {
        console.error("❌ Failed to parse video list:", error);
      }
    }

    if (parsedVideoList.length > 0 && !videoListProcessedRef.current) {
      const currentList = reelsStoreVideoList;
      const listsAreDifferent =
        currentList.length !== parsedVideoList.length ||
        (currentList.length > 0 &&
          parsedVideoList.length > 0 &&
          currentList[0]?._id !== parsedVideoList[0]?._id);
      if (listsAreDifferent) {
        reelsStoreSetVideoList(parsedVideoList);
        videoListProcessedRef.current = true;
      }
    }
  }, [parsedVideoList.length, videoListParam]);

  useEffect(() => {
    const rawList =
      reelsStoreVideoList.length > 0
        ? reelsStoreVideoList
        : videoListParam
          ? (() => {
              try {
                return JSON.parse(videoListParam);
              } catch {
                return [];
              }
            })()
          : [];
    if (rawList.length === 0) return;

    const listKey = `${rawList.length}-${rawList[0]?._id || rawList[0]?.id || ""}`;
    if (lastListKeyRef.current === listKey) return;
    lastListKeyRef.current = listKey;

    const needsEnrichment = rawList.some((item: any) => {
      const ub = item.uploadedBy;
      if (
        typeof ub === "string" &&
        /^[0-9a-fA-F]{24}$/i.test((ub || "").trim())
      )
        return true;
      if (
        ub &&
        typeof ub === "object" &&
        (ub._id || ub.id) &&
        !ub.firstName
      )
        return true;
      return false;
    });

    if (!needsEnrichment) return;
    UserProfileCache.enrichContentArrayBatch(rawList).then((enriched) => {
      reelsStoreSetVideoList(enriched);
    });
  }, [reelsStoreVideoList.length, videoListParam]);

  return parsedVideoList;
}
