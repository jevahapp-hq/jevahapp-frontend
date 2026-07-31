import type { MutableRefObject } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { Router } from "expo-router";
import { useMediaStore } from "../../../../store/useUploadStore";
import type { MediaItem } from "../../../../../src/shared/types";
import {
  prependMediaToFeedCaches,
  refreshFeedAfterUpload,
  patchMediaInFeedCaches,
} from "../../../../../src/shared/utils/prependMediaToFeedCaches";
import { setCachedDurationMs } from "../../../../../src/features/media/components/VideoCard/player/durationCache";
import { buildSuccessResult } from "../../components/UploadResultModal";
import { getTimeAgo } from "../../utils";
import { resolveUploadContentType } from "../../utils/resolveUploadContentType";
import {
  isMediaSeekable,
  pollMediaUntilSeekable,
  type SeekableMediaSnapshot,
} from "../../utils/pollMediaUntilSeekable";
import type { MediaFile, UploadResultState, UploadState } from "../../types";

type UploadedMedia = {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  playbackUrl?: string;
  hlsUrl?: string;
  contentType: string;
  fileMimeType?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  duration?: number;
  genre?: string;
  moderationStatus?: string;
  processingStatus?: string;
  status?: string;
};

function resolveProcessingStatus(
  uploaded: Pick<UploadedMedia, "processingStatus" | "status" | "duration">
): MediaItem["processingStatus"] {
  const raw = String(
    uploaded.processingStatus || uploaded.status || ""
  ).toLowerCase();
  if (raw === "queued") return "pending";
  if (
    raw === "ready" ||
    raw === "processing" ||
    raw === "pending" ||
    raw === "failed"
  ) {
    return raw;
  }
  // Finalize often omits status; if duration already known treat as ready.
  if (Number(uploaded.duration) > 0) return "ready";
  return "processing";
}

function seedDurationCache(mediaId: string | undefined, durationSec?: number) {
  if (!mediaId || !durationSec || durationSec < 0.5) return;
  setCachedDurationMs(mediaId, durationSec * 1000);
}

function snapshotToFeedPatch(
  snapshot: SeekableMediaSnapshot
): Partial<MediaItem> {
  const patch: Partial<MediaItem> = {
    processingStatus: snapshot.processingStatus,
  };
  if (typeof snapshot.duration === "number" && snapshot.duration > 0) {
    patch.duration = snapshot.duration;
  }
  if (snapshot.fileUrl) patch.fileUrl = snapshot.fileUrl;
  if (snapshot.playbackUrl) patch.playbackUrl = snapshot.playbackUrl;
  if (snapshot.hlsUrl) patch.hlsUrl = snapshot.hlsUrl;
  if (snapshot.fileMimeType) {
    patch.fileMimeType = snapshot.fileMimeType;
    patch.mimeType = snapshot.fileMimeType;
  } else if (snapshot.mimeType) {
    patch.mimeType = snapshot.mimeType;
    patch.fileMimeType = snapshot.mimeType;
  }
  if (snapshot.thumbnailUrl) {
    patch.thumbnailUrl = snapshot.thumbnailUrl;
    patch.imageUrl = snapshot.thumbnailUrl;
  } else if (snapshot.imageUrl) {
    patch.imageUrl = snapshot.imageUrl;
  }
  return patch;
}

/** @deprecated Prefer resolveUploadContentType */
export function mapUploadTypeToHomeCategory(selectedType: string): string {
  return resolveUploadContentType({ selectedType }).homeCategory;
}

export function buildFeedMediaItem(params: {
  uploaded: UploadedMedia;
  file: MediaFile;
  isSermonContent: boolean;
  selectedType?: string;
}): MediaItem {
  const { uploaded, file, isSermonContent, selectedType } = params;
  const now = new Date().toISOString();

  // MIME + selection — never title. Video titled "Book of Enoch" → videos.
  const resolved = resolveUploadContentType({
    selectedType: selectedType || uploaded.contentType || "videos",
    file,
    apiContentType: uploaded.contentType,
    isSermonContent,
  });

  const duration =
    typeof uploaded.duration === "number" && uploaded.duration > 0
      ? uploaded.duration
      : file.durationSec;

  const feedItem = {
    _id: uploaded._id,
    title: uploaded.title,
    description: uploaded.description || "",
    contentType: resolved.contentType,
    fileUrl: uploaded.fileUrl,
    playbackUrl: uploaded.playbackUrl,
    hlsUrl: uploaded.hlsUrl,
    thumbnailUrl: uploaded.thumbnailUrl || uploaded.imageUrl || undefined,
    imageUrl: uploaded.thumbnailUrl || uploaded.imageUrl || "",
    duration,
    category: uploaded.genre ? [uploaded.genre] : [],
    createdAt: now,
    updatedAt: now,
    viewCount: 0,
    views: 0,
    likes: 0,
    favorite: 0,
    saves: 0,
    saved: 0,
    shares: 0,
    sheared: 0,
    comments: 0,
    comment: 0,
    moderationStatus:
      (uploaded.moderationStatus as MediaItem["moderationStatus"]) ||
      "approved",
    processingStatus: resolveProcessingStatus({
      ...uploaded,
      duration,
    }),
    ...(file.mimeType
      ? { fileMimeType: file.mimeType, mimeType: file.mimeType }
      : uploaded.fileMimeType
        ? {
            fileMimeType: uploaded.fileMimeType,
            mimeType: uploaded.fileMimeType,
          }
        : {}),
  } as MediaItem;

  seedDurationCache(uploaded._id, duration);
  return feedItem;
}

export async function persistUploadedMedia(params: {
  uploaded: UploadedMedia;
  file: MediaFile;
  isSermonContent: boolean;
  selectedType?: string;
}): Promise<MediaItem> {
  const { uploaded, file } = params;
  const feedItem = buildFeedMediaItem(params);
  const now = new Date();

  await useMediaStore.getState().addMediaWithUserValidation({
    _id: uploaded._id,
    title: uploaded.title,
    description: uploaded.description || "",
    uri: uploaded.fileUrl,
    category: uploaded.genre ? [uploaded.genre] : [],
    type: feedItem.contentType,
    contentType: feedItem.contentType,
    fileUrl: uploaded.fileUrl,
    playbackUrl: uploaded.playbackUrl,
    hlsUrl: uploaded.hlsUrl,
    fileMimeType: uploaded.fileMimeType || file.mimeType,
    thumbnailUrl: uploaded.thumbnailUrl || uploaded.imageUrl || undefined,
    imageUrl: uploaded.thumbnailUrl || uploaded.imageUrl || "",
    duration: feedItem.duration,
    processingStatus: feedItem.processingStatus,
    viewCount: 0,
    listenCount: 0,
    readCount: 0,
    downloadCount: 0,
    isLive: false,
    concurrentViewers: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    topics: [] as string[],
    timeAgo: getTimeAgo(now.toISOString()),
    favorite: 0,
    saved: 0,
    sheared: 0,
    comments: 0,
    shared: 0,
    comment: 0,
    onPress: undefined,
  });

  return feedItem;
}

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
