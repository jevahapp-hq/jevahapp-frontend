import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMediaStore } from "../../../../store/useUploadStore";
import { stampPayloadAuthor } from "../../../../../src/shared/author";
import type { MediaItem } from "../../../../../src/shared/types";
import { normalizeUserData } from "../../../../utils/userValidation";
import { getTimeAgo } from "../../utils";
import { resolveUploadContentType } from "../../utils/resolveUploadContentType";
import type { MediaFile } from "../../types";
import {
  resolveProcessingStatus,
  seedDurationCache,
  type UploadedMedia,
} from "./resolveProcessingStatus";

async function sessionAuthorStamp(): Promise<Partial<MediaItem>> {
  try {
    const raw = await AsyncStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    const n = normalizeUserData(user);
    const id = String(user?._id || user?.id || "").trim();
    const name =
      n.fullName && n.fullName !== "Anonymous User" ? n.fullName : "";
    if (!id && !name) return {};
    return {
      speaker: name || undefined,
      uploadedByName: name || undefined,
      userId: id || undefined,
      uploadedBy: id
        ? {
            _id: id,
            firstName: n.firstName !== "Anonymous" ? n.firstName : undefined,
            lastName: n.lastName !== "User" ? n.lastName : undefined,
            email: n.email,
            avatar: n.avatar || undefined,
            name: name || undefined,
          }
        : name,
      authorInfo: id
        ? {
            _id: id,
            firstName:
              n.firstName !== "Anonymous" ? n.firstName : n.fullName || "",
            lastName: n.lastName !== "User" ? n.lastName : "",
            avatar: n.avatar || undefined,
          }
        : undefined,
    };
  } catch {
    return {};
  }
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
  const author = await sessionAuthorStamp();
  const feedItem = stampPayloadAuthor({
    ...buildFeedMediaItem(params),
    ...author,
  }) as MediaItem;
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
    moderationStatus: feedItem.moderationStatus,
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
