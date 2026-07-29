import type { MutableRefObject } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { Router } from "expo-router";
import { useMediaStore } from "../../../../store/useUploadStore";
import type { MediaItem } from "../../../../../src/shared/types";
import {
  prependMediaToFeedCaches,
  refreshFeedAfterUpload,
} from "../../../../../src/shared/utils/prependMediaToFeedCaches";
import { buildSuccessResult } from "../../components/UploadResultModal";
import { getTimeAgo } from "../../utils";
import { resolveUploadContentType } from "../../utils/resolveUploadContentType";
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
};

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

  return {
    _id: uploaded._id,
    title: uploaded.title,
    description: uploaded.description || "",
    contentType: resolved.contentType,
    fileUrl: uploaded.fileUrl,
    playbackUrl: uploaded.playbackUrl,
    hlsUrl: uploaded.hlsUrl,
    thumbnailUrl: uploaded.thumbnailUrl || uploaded.imageUrl || undefined,
    imageUrl: uploaded.thumbnailUrl || uploaded.imageUrl || "",
    duration: uploaded.duration,
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
    ...(file.mimeType
      ? { fileMimeType: file.mimeType, mimeType: file.mimeType }
      : {}),
  } as MediaItem;
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
    duration: uploaded.duration,
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
  setUploadState({
    status: "success",
    progress: 100,
    message: "Content has been verified and approved!",
  });

  prependMediaToFeedCaches(queryClient, feedItem);
  refreshFeedAfterUpload(queryClient);

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
