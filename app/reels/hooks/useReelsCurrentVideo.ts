/**
 * useReelsCurrentVideo
 * Derives current video, keys, contentId, and speaker helpers from params and video list.
 * Isolates video metadata logic for easier debugging and testing.
 */
import { useMemo } from "react";
import { getUserDisplayNameFromContent } from "../../utils/userValidation";

export interface UseReelsCurrentVideoParams {
  parsedVideoList: any[];
  currentIndex: number;
  fallbackParams: {
    title: string;
    speaker: string;
    timeAgo: string;
    views: string;
    sheared: string;
    saved: string;
    favorite: string;
    imageUrl: string;
    speakerAvatar: string;
  };
  currentUser: any;
  getFullName: (user: any) => string;
}

export function useReelsCurrentVideo({
  parsedVideoList,
  currentIndex,
  fallbackParams,
  currentUser,
  getFullName,
}: UseReelsCurrentVideoParams) {
  const {
    title,
    speaker,
    timeAgo,
    views,
    sheared,
    saved,
    favorite,
    imageUrl,
    speakerAvatar,
  } = fallbackParams;

  const currentVideo = useMemo(() => {
    try {
      if (
        parsedVideoList.length > 0 &&
        currentIndex < parsedVideoList.length
      ) {
        const video = parsedVideoList[currentIndex];
        if (video && video.title) return video;
      }
      return {
        title: title || "Untitled Video",
        speaker: speaker || "Unknown Speaker",
        timeAgo: timeAgo || "Recently",
        views: parseInt(views) || 0,
        sheared: parseInt(sheared) || 0,
        saved: parseInt(saved) || 0,
        favorite: parseInt(favorite) || 0,
        imageUrl: imageUrl || "",
        speakerAvatar: speakerAvatar || "",
        fileUrl: imageUrl || "",
      };
    } catch {
      return {
        title: "Untitled Video",
        speaker: "Unknown Speaker",
        timeAgo: "Recently",
        views: 0,
        sheared: 0,
        saved: 0,
        favorite: 0,
        imageUrl: "",
        speakerAvatar: "",
        fileUrl: "",
      };
    }
  }, [parsedVideoList, currentIndex, title, speaker, timeAgo, views, sheared, saved, favorite, imageUrl, speakerAvatar]);

  const getSpeakerNameForReel = (video: any): string => {
    const s = video?.speaker;
    if (typeof s === "string") return s;
    if (s && typeof s === "object") {
      return (
        s.fullName ||
        (s.firstName && s.lastName
          ? `${s.firstName} ${s.lastName}`.trim()
          : s.firstName || s.lastName || "Creator")
      );
    }
    return getUserDisplayNameFromContent(video, "Creator");
  };

  const reelKey = `reel-${currentVideo.title}-${getSpeakerNameForReel(currentVideo)}`;
  const modalKey = reelKey;
  const contentId = currentVideo._id || currentVideo.id || null;
  const contentIdForHooks = (contentId || "") as string;
  const canUseBackendLikes = Boolean(contentIdForHooks);
  const activeContentType = (currentVideo.contentType || "video") as string;

  const isObjectId = (s: string) =>
    typeof s === "string" && /^[0-9a-fA-F]{24}$/.test((s || "").trim());

  const getSpeakerName = (videoData: any, fallback = "Creator"): string => {
    const s = videoData?.speaker;
    const isPlaceholder = (x: string) =>
      /^(Unknown|Anonymous User|No Speaker)$/i.test((x || "").trim());
    if (
      typeof s === "string" &&
      s?.trim() &&
      !isObjectId(s) &&
      !isPlaceholder(s)
    ) {
      return s.trim();
    }
    if (s && typeof s === "object") {
      const name =
        s.fullName ||
        (s.firstName && s.lastName
          ? `${s.firstName} ${s.lastName}`.trim()
          : s.firstName || s.lastName || "");
      if (name) return name;
    }
    const contentUploaderId =
      typeof videoData?.uploadedBy === "string"
        ? videoData.uploadedBy?.trim()
        : videoData?.uploadedBy?._id || videoData?.uploadedBy?.id;
    if (currentUser && contentUploaderId) {
      const uid = currentUser._id || currentUser.id;
      if (uid && String(contentUploaderId) === String(uid)) {
        const fullName = getFullName(currentUser);
        if (fullName) return fullName;
      }
    }
    try {
      const name = getUserDisplayNameFromContent(videoData, fallback);
      return /^(Unknown|Anonymous User)$/i.test(name) ? fallback : name;
    } catch {
      return fallback;
    }
  };

  const video = useMemo(
    () => ({
      fileUrl: currentVideo.fileUrl || currentVideo.imageUrl || imageUrl,
      title: currentVideo.title,
      speaker: currentVideo.speaker,
      timeAgo: currentVideo.timeAgo,
      speakerAvatar: currentVideo.speakerAvatar,
      favorite: currentVideo.favorite || 0,
      views: currentVideo.views || 0,
      saved: currentVideo.saved || 0,
      sheared: currentVideo.sheared || 0,
      comment: 0,
    }),
    [currentVideo, imageUrl]
  );

  return {
    currentVideo,
    reelKey,
    modalKey,
    contentId,
    contentIdForHooks,
    canUseBackendLikes,
    activeContentType,
    getSpeakerNameForReel,
    getSpeakerName,
    video,
  };
}
