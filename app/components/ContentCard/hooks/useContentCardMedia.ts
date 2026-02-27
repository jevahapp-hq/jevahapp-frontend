import { useMemo } from "react";
import { convertToPublicUrl, isValidUri } from "../utils";

const FALLBACK_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export function useContentCardMedia(
  contentType: string,
  rawMediaUrl: string,
  thumbnailUrl?: string
) {
  const videoUrl = useMemo(
    () => (contentType === "video" && rawMediaUrl ? convertToPublicUrl(rawMediaUrl) : rawMediaUrl),
    [contentType, rawMediaUrl]
  );

  const safeVideoUri = useMemo(() => {
    if (contentType === "video") {
      return isValidUri(videoUrl) ? String(videoUrl).trim() : rawMediaUrl || FALLBACK_VIDEO;
    }
    return thumbnailUrl || rawMediaUrl || FALLBACK_VIDEO;
  }, [contentType, videoUrl, rawMediaUrl, thumbnailUrl]);

  return { videoUrl, safeVideoUri };
}
