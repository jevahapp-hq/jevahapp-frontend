import type { MutableRefObject } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { Router } from "expo-router";
import type { MediaItem } from "../../../../../src/shared/types";
import {
  prependMediaToFeedCaches,
  refreshFeedAfterUpload,
  patchMediaInFeedCaches,
} from "../../../../../src/shared/utils/prependMediaToFeedCaches";
import { buildSuccessResult } from "../../components/UploadResultModal";
import { resolveUploadContentType } from "../../utils/resolveUploadContentType";
import {
  isMediaSeekable,
  pollMediaUntilSeekable,
} from "../../utils/pollMediaUntilSeekable";
import type { MediaFile, UploadResultState, UploadState } from "../../types";
import {
  seedDurationCache,
  snapshotToFeedPatch,
} from "./resolveProcessingStatus";

/**
 * Poll media detail until ready + duration, then patch feed caches / session cache.
 * Runs in background so navigation is not blocked; safe to fire-and-forget.
 */
export function scheduleSeekableMediaPoll(params: {
  queryClient: QueryClient;
  mediaId: string;
  isVideo: boolean;
  signal?: AbortSignal;
}): void {
  const { queryClient, mediaId, isVideo, signal } = params;
  if (!isVideo || !mediaId) return;

  void (async () => {
    const snapshot = await pollMediaUntilSeekable(mediaId, {
      signal,
      onUpdate: (partial) => {
        const patch = snapshotToFeedPatch(partial);
        patchMediaInFeedCaches(queryClient, mediaId, patch);
        if (typeof partial.duration === "number") {
          seedDurationCache(mediaId, partial.duration);
        }
      },
    });

    if (!snapshot) return;
    const patch = snapshotToFeedPatch(snapshot);
    patchMediaInFeedCaches(queryClient, mediaId, patch);
    if (typeof snapshot.duration === "number") {
      seedDurationCache(mediaId, snapshot.duration);
    }

    if (__DEV__ && isMediaSeekable(snapshot)) {
      console.log("[upload] media seekable", {
        id: mediaId,
        duration: snapshot.duration,
        processingStatus: snapshot.processingStatus,
        fileUrl: snapshot.fileUrl?.slice(0, 80),
        hlsUrl: snapshot.hlsUrl?.slice(0, 80),
      });
    }
  })();
}

export function scheduleUploadSuccessNavigation(params: {
  router: Router;
  queryClient: QueryClient;
  selectedType: string;
  feedItem: MediaItem;
  file: MediaFile;
  isSermonContent: boolean;
  resetForm: () => void;
  setLoading: (v: boolean) => void;
  setUploadState: (v: UploadState) => void;
  setUploadResult: (v: UploadResultState | null) => void;
  successNavigateTimeoutRef: MutableRefObject<
    ReturnType<typeof setTimeout> | null
  >;
  onReadyNavigate?: (navigateToFeed: () => void) => void;
}) {
  const {
    router,
    queryClient,
    selectedType,
    feedItem,
    file,
    isSermonContent,
    resetForm,
    setLoading,
    setUploadState,
    setUploadResult,
    successNavigateTimeoutRef,
    onReadyNavigate,
  } = params;

  setLoading(false);

  const stillProcessing =
    feedItem.processingStatus !== "ready" || !(Number(feedItem.duration) > 0);

  setUploadState({
    status: "success",
    progress: 100,
    message: stillProcessing
      ? "Uploaded! Processing video for scrubbing…"
      : "Content has been verified and approved!",
  });

  prependMediaToFeedCaches(queryClient, feedItem);
  refreshFeedAfterUpload(queryClient);

  const isVideo =
    (file.mimeType || "").startsWith("video/") ||
    ["video", "videos", "sermon"].includes(
      String(feedItem.contentType || "").toLowerCase()
    );

  if (isVideo && stillProcessing) {
    scheduleSeekableMediaPoll({
      queryClient,
      mediaId: String(feedItem._id || ""),
      isVideo: true,
    });
  } else if (isVideo && Number(feedItem.duration) > 0) {
    seedDurationCache(String(feedItem._id || ""), Number(feedItem.duration));
  }

  const defaultCategory = resolveUploadContentType({
    selectedType,
    file,
    apiContentType: feedItem.contentType,
    isSermonContent,
  }).homeCategory;

  const navigateToFeed = () => {
    if (successNavigateTimeoutRef.current) {
      clearTimeout(successNavigateTimeoutRef.current);
      successNavigateTimeoutRef.current = null;
    }
    setUploadResult(null);
    resetForm();
    router.push({
      pathname: "/categories/HomeScreen",
      params: {
        default: "Home",
        defaultCategory,
      },
    });
  };

  setUploadResult(buildSuccessResult());
  onReadyNavigate?.(navigateToFeed);

  if (successNavigateTimeoutRef.current) {
    clearTimeout(successNavigateTimeoutRef.current);
  }
  successNavigateTimeoutRef.current = setTimeout(navigateToFeed, 2800);
}
