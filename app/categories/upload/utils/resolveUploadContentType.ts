/**
 * Resolve upload / feed content type from file bytes + explicit UI selection.
 * Never infer type from title/description ("Book of Enoch" is still a video).
 */

import { detectFileType, type FileInfo } from "./fileTypeDetection";

export type ResolvedUploadType = {
  /** Value sent to API + stored on MediaItem.contentType */
  contentType: "videos" | "music" | "books" | "sermon" | "gif";
  /** Home chip `defaultCategory` param */
  homeCategory: "videos" | "music" | "e-books" | "sermon" | "ALL";
  /** True when MIME/extension overruled a conflicting selectedType */
  correctedFromSelection: boolean;
};

function isVideoMime(mime?: string) {
  return !!mime && mime.toLowerCase().startsWith("video/");
}
function isAudioMime(mime?: string) {
  return !!mime && mime.toLowerCase().startsWith("audio/");
}

/**
 * Canonical type for an upload.
 * Priority: sermon flag → file MIME/extension → selectedType → API echo.
 */
export function resolveUploadContentType(params: {
  selectedType: string;
  file?: FileInfo | null;
  apiContentType?: string;
  isSermonContent?: boolean;
}): ResolvedUploadType {
  const selected = (params.selectedType || "").toLowerCase().trim();
  const api = (params.apiContentType || "").toLowerCase().trim();
  const mime = params.file?.mimeType;
  const detected = detectFileType(params.file || null);

  if (params.isSermonContent || selected === "sermon") {
    return {
      contentType: "sermon",
      homeCategory: "sermon",
      correctedFromSelection: false,
    };
  }

  if (selected === "gif" || detected === "gif") {
    return {
      contentType: "gif",
      homeCategory: "videos",
      correctedFromSelection: selected !== "gif" && selected !== "",
    };
  }

  // Bytes win — a video file is never an ebook because the title says "Book".
  if (detected === "video" || isVideoMime(mime)) {
    const corrected =
      selected === "books" ||
      selected === "ebook" ||
      selected === "e-books" ||
      selected === "music" ||
      selected === "podcasts";
    return {
      contentType: "videos",
      homeCategory: "videos",
      correctedFromSelection: corrected,
    };
  }

  if (detected === "audio" || isAudioMime(mime)) {
    const corrected =
      selected === "books" ||
      selected === "ebook" ||
      selected === "videos" ||
      selected === "video";
    return {
      contentType: "music",
      homeCategory: "music",
      correctedFromSelection: corrected,
    };
  }

  if (detected === "ebook") {
    return {
      contentType: "books",
      homeCategory: "e-books",
      correctedFromSelection:
        selected === "videos" ||
        selected === "video" ||
        selected === "music",
    };
  }

  // Explicit UI selection when file type is ambiguous
  if (selected === "books" || selected === "ebook" || selected === "e-books") {
    return {
      contentType: "books",
      homeCategory: "e-books",
      correctedFromSelection: false,
    };
  }
  if (selected === "music" || selected === "audio" || selected === "podcasts") {
    return {
      contentType: "music",
      homeCategory: "music",
      correctedFromSelection: false,
    };
  }
  if (selected === "videos" || selected === "video") {
    return {
      contentType: "videos",
      homeCategory: "videos",
      correctedFromSelection: false,
    };
  }

  // Last resort: whatever the API already classified (still not title)
  if (api === "books" || api === "ebook" || api === "e-books") {
    return {
      contentType: "books",
      homeCategory: "e-books",
      correctedFromSelection: false,
    };
  }
  if (api === "music" || api === "audio") {
    return {
      contentType: "music",
      homeCategory: "music",
      correctedFromSelection: false,
    };
  }
  if (api === "sermon") {
    return {
      contentType: "sermon",
      homeCategory: "sermon",
      correctedFromSelection: false,
    };
  }

  return {
    contentType: "videos",
    homeCategory: "videos",
    correctedFromSelection: false,
  };
}

/** Exact contentType tokens that mean ebook — never substring-match "book" in titles. */
export function isEbookContentTypeToken(contentType: string | undefined): boolean {
  const t = (contentType || "").toLowerCase().trim();
  return (
    t === "books" ||
    t === "book" ||
    t === "ebook" ||
    t === "e-books" ||
    t === "ebooks" ||
    t === "pdf"
  );
}
