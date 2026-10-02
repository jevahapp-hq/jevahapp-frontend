/**
 * Normalize account/profile Video → shared MediaItem shape used by useVideoNavigation / Reels.
 * Profile API uses { url, thumbnail, viewsCount, likesCount, userId };
 * feed uses { fileUrl, imageUrl, views, favorite, uploadedBy }.
 */
import type { Video as AccountVideo } from "../types/account.types";
import type { MediaItem } from "../types/media";

export type AccountVideoOwner = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatar?: string | null;
};

export function mapAccountVideoToMediaItem(
  video: AccountVideo,
  owner?: AccountVideoOwner | null,
  avatarUrl?: string | null
): MediaItem {
  const displayName =
    owner?.fullName ||
    [owner?.firstName, owner?.lastName].filter(Boolean).join(" ").trim() ||
    undefined;
  const raw = video as AccountVideo & {
    fileUrl?: string;
    playbackUrl?: string;
    thumbnailUrl?: string;
    imageUrl?: string;
    moderationStatus?: MediaItem["moderationStatus"];
  };
  const fileUrl = raw.url || raw.fileUrl || raw.playbackUrl || "";
  const thumb = raw.thumbnail || raw.thumbnailUrl || raw.imageUrl || fileUrl;

  return {
    _id: video._id,
    title: video.title || "Untitled Video",
    description: video.description || "",
    contentType: "videos",
    fileUrl,
    imageUrl: thumb,
    thumbnailUrl: thumb,
    moderationStatus: raw.moderationStatus,
    createdAt: video.createdAt,
    views: video.viewsCount || 0,
    favorite: video.likesCount || 0,
    sheared: 0,
    saved: 0,
    speaker: displayName,
    speakerAvatar: avatarUrl || owner?.avatar || undefined,
    uploadedBy: displayName
      ? {
          _id: owner?._id || owner?.id || video.userId,
          firstName: owner?.firstName || "",
          lastName: owner?.lastName || "",
          fullName: displayName,
          avatar: avatarUrl || owner?.avatar || undefined,
        }
      : video.userId,
    authorInfo: displayName
      ? {
          _id: owner?._id || owner?.id || video.userId,
          firstName: owner?.firstName || "",
          lastName: owner?.lastName || "",
          fullName: displayName,
          avatar: avatarUrl || owner?.avatar || undefined,
        }
      : undefined,
  } as MediaItem;
}

export function mapAccountVideosToMediaItems(
  videos: AccountVideo[],
  owner?: AccountVideoOwner | null,
  avatarUrl?: string | null
): MediaItem[] {
  return videos.map((v) => mapAccountVideoToMediaItem(v, owner, avatarUrl));
}
