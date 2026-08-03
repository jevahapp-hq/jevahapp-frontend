import { useMediaStore } from "../../../../store/useUploadStore";
import type { MediaItem } from "../../../../../src/shared/types";
import { getTimeAgo } from "../../utils";
import { resolveUploadContentType } from "../../utils/resolveUploadContentType";
import type { MediaFile } from "../../types";
import {
  resolveProcessingStatus,
  seedDurationCache,
  type UploadedMedia,
} from "./resolveProcessingStatus";

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
