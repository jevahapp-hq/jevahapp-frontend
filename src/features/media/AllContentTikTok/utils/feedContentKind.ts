/**
 * feedContentKind - single source of truth for "what kind of card does this
 * feed row render as".
 *
 * Must agree with file/MIME reality: a music upload that is actually an mp4
 * (music video) must render as VideoCard, not MusicCard — otherwise users see
 * static cover art (looks like a logo) and hear audio-only playback.
 */
import type { MediaItem } from "../../../../shared/types";
import { detectMediaType } from "../../../../shared/utils/mediaTypeDetection";

export type FeedContentKind = "video" | "audio" | "ebook";

export function getFeedContentKind(item: MediaItem): FeedContentKind {
  const detected = detectMediaType(item);
  const contentType = (item.contentType || "").toLowerCase();

  // File/MIME wins: music videos, video sermons, etc.
  if (detected === "video") return "video";
  if (detected === "audio") return "audio";
  if (detected === "ebook") return "ebook";

  // Fall back to declared contentType when detection is unknown
  switch (contentType) {
    case "video":
    case "videos":
    case "live":
      return "video";

    case "sermon":
    case "devotional":
      // Unknown file shape — prefer video card if a playable URL looks video-like
      return "video";

    case "audio":
    case "music":
      return "audio";

    case "image":
    case "ebook":
    case "books":
    case "e-books":
      return "ebook";

    default:
      // Last resort: if we have a media URL, try video; else ebook shell
      return item.fileUrl || item.streamUrl || (item as any).hlsUrl
        ? "video"
        : "ebook";
  }
}
