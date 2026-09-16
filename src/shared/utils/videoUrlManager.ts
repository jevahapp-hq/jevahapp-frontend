/**
 * Universal Video URL Manager
 * Handles signed URL conversion and error detection
 */

const urlLog = (...a: any[]) => {
  if (__DEV__) console.log(...a);
};

export interface VideoUrlInfo {
  originalUrl: string;
  convertedUrl: string;
  isSignedUrl: boolean;
  isExpired: boolean;
  isValid: boolean;
  error?: string;
}

/**
 * Converts signed AWS URLs to public URLs
 */
export const convertSignedToPublicUrl = (signedUrl: string): string => {
  if (!signedUrl || typeof signedUrl !== 'string') {
    return signedUrl;
  }

  try {
    const normalized = fixOverEncodedMediaUrl(signedUrl);
    const url = new URL(normalized);

    // Check if it's a signed URL
    const isSignedUrl = url.searchParams.has('X-Amz-Algorithm');

    if (!isSignedUrl) {
      return normalized;
    }

    // Remove AWS signature parameters
    const paramsToRemove = [
      "X-Amz-Algorithm",
      "X-Amz-Content-Sha256",
      "X-Amz-Credential",
      "X-Amz-Date",
      "X-Amz-Expires",
      "X-Amz-Signature",
      "X-Amz-SignedHeaders",
      "x-amz-checksum-mode",
      "x-id",
    ];

    paramsToRemove.forEach((param) => {
      url.searchParams.delete(param);
    });

    const publicUrl = url.toString();

    urlLog(`🔗 URL Conversion: ${signedUrl.substring(0, 100)}... → ${publicUrl.substring(0, 100)}...`);

    return publicUrl;
  } catch (error) {
    console.warn("⚠️ Error converting signed URL:", error);
    return signedUrl; // Return original if conversion fails
  }
};

/**
 * Analyzes a video URL and provides detailed information
 */
export const analyzeVideoUrl = (url: string): VideoUrlInfo => {
  const result: VideoUrlInfo = {
    originalUrl: url,
    convertedUrl: url,
    isSignedUrl: false,
    isExpired: false,
    isValid: false,
  };

  if (!url || typeof url !== 'string' || url.trim() === '') {
    result.error = 'Empty or invalid URL';
    return result;
  }

  if (url.startsWith('file://') || url.startsWith('/')) {
    result.isValid = true;
    result.convertedUrl = url;
    return result;
  }

  try {
    // Fix for protocol-relative URLs (like //res.cloudinary.com/...)
    const urlToParse = url.startsWith('//') ? `https:${url}` : url;
    const urlObj = new URL(urlToParse);

    // Update the converted URL if it was protocol-relative
    if (url.startsWith('//')) {
      result.convertedUrl = urlToParse;
    }

    // Check if it's a signed URL
    result.isSignedUrl = urlObj.searchParams.has('X-Amz-Algorithm');

    if (result.isSignedUrl) {
      result.convertedUrl = convertSignedToPublicUrl(urlToParse);

      // Check if URL might be expired (rough estimation)
      const expiresParam = urlObj.searchParams.get('X-Amz-Expires');
      const dateParam = urlObj.searchParams.get('X-Amz-Date');

      if (expiresParam && dateParam) {
        try {
          const date = new Date(dateParam);
          const expires = parseInt(expiresParam);
          const expirationTime = new Date(date.getTime() + expires * 1000);
          const now = new Date();

          result.isExpired = expirationTime < now;
        } catch (e) {
          // If we can't parse dates, assume it might be expired
          result.isExpired = true;
        }
      }
    }

    // Basic URL validation - support both network and local file URLs
    result.isValid = urlToParse.startsWith('http://') ||
      urlToParse.startsWith('https://') ||
      urlToParse.startsWith('file://') ||
      urlToParse.startsWith('/'); // Support absolute paths

    if (!result.isValid) {
      result.error = 'Invalid URL format';
    }

  } catch (error) {
    result.error = `URL parsing error: ${error}`;
  }

  return result;
};

/**
 * Backend/R2 keys with spaces are stored as `%20`, then encoded again as
 * `%2520`. iOS requests the double-encoded path, R2 404s, and AVPlayer
 * shows the default play/Q artwork while audio (or a damaged cache) plays.
 *
 * Only the pathname is undoubled — query strings (signed URLs) stay intact.
 * Reconstruct via string concat: `URL.pathname =` re-encodes `%` and leaves
 * `&` unescaped, both of which break these objects.
 */
const OVER_ENCODED_OCTET = /%25[0-9A-Fa-f]{2}/;

export function fixOverEncodedMediaUrl(url: string): string {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("file://") || url.startsWith("/")) return url;

  try {
    const toParse = url.startsWith("//") ? `https:${url}` : url;
    const parsed = new URL(toParse);
    let path = parsed.pathname;
    if (!OVER_ENCODED_OCTET.test(path)) return url;

    let guard = 0;
    while (OVER_ENCODED_OCTET.test(path) && guard < 3) {
      path = path.replace(/%25([0-9A-Fa-f]{2})/g, "%$1");
      guard += 1;
    }

    const next = `${parsed.origin}${path}${parsed.search}${parsed.hash}`;
    return url.startsWith("//") ? next.replace(/^https:/, "") : next;
  } catch {
    return url;
  }
}

export const getVideoUrlFromMedia = (media: any): string | null => {
  const fileUrl = fixOverEncodedMediaUrl(
    typeof media?.fileUrl === "string" ? media.fileUrl.trim() : ""
  );
  const playbackUrl = fixOverEncodedMediaUrl(
    typeof media?.playbackUrl === "string" ? media.playbackUrl.trim() : ""
  );
  const hlsUrl = fixOverEncodedMediaUrl(
    typeof media?.hlsUrl === "string" ? media.hlsUrl.trim() : ""
  );

  const notVideoUrl = (u: string) =>
    !!u && /\.(pdf|epub|mobi|mp3|wav|m4a|aac|ogg|flac|wma)(\?|#|$)/i.test(u);
  const safeFileUrl = notVideoUrl(fileUrl) ? "" : fileUrl;
  const safePlaybackUrl = notVideoUrl(playbackUrl) ? "" : playbackUrl;

  const mime = String(
    media?.fileMimeType || media?.mimeType || ""
  ).toLowerCase();
  const contentType = String(media?.contentType || "").toLowerCase();
  const mediaType = String(media?.mediaType || "").toLowerCase();
  if (
    mediaType === "audio" ||
    contentType === "ebook" ||
    contentType === "ebooks" ||
    contentType === "e-books" ||
    contentType === "books" ||
    contentType === "image"
  ) {
    return null;
  }
  const looksLikeVideoMime =
    mime.startsWith("video/") ||
    mime === "videos" ||
    mime === "video" ||
    (contentType === "sermon" && mediaType !== "audio");

  const durationSec = Number(media?.duration ?? media?.durationSec) || 0;
  const processingStatus = String(
    media?.processingStatus || ""
  ).toLowerCase();
  // Ready (or unknown status) but duration missing: never prefer incomplete HLS.
  const blockHlsPrimary =
    durationSec < 0.5 &&
    processingStatus !== "processing" &&
    processingStatus !== "pending" &&
    processingStatus !== "failed";

  const isHls = (u: string) => /\.m3u8(\?|#|$)/i.test(u);
  const isProgressive = (u: string) =>
    !!u &&
    !isHls(u) &&
    (/\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(u) ||
      // R2 / CDN keys often have no extension — treat fileUrl as progressive for videos
      (looksLikeVideoMime && u === safeFileUrl));

  // Lite / server hint: ABR HLS (~360p) over fat progressive MP4
  let preferHlsLite = media?.lite?.preferHls === true;
  try {
    // Lazy to avoid circular imports at module init
    const { isLiteProfileActive } = require("../lite/liteProfile") as typeof import("../lite/liteProfile");
    if (!preferHlsLite && isLiteProfileActive()) preferHlsLite = true;
  } catch {
    // ignore
  }
  if (preferHlsLite && !blockHlsPrimary && hlsUrl) return hlsUrl;
  if (preferHlsLite && !blockHlsPrimary && safePlaybackUrl && isHls(safePlaybackUrl)) {
    return safePlaybackUrl;
  }

  // Prefer progressive faststart MP4 (fileUrl / non-HLS playbackUrl) for seek.
  // HLS is fallback only when no MP4 — and never when duration is still unknown
  // on a ready card (incomplete playlist → player.duration=0 → seek broken).
  if (safeFileUrl && isProgressive(safeFileUrl)) return safeFileUrl;
  if (safeFileUrl && looksLikeVideoMime && !isHls(safeFileUrl)) return safeFileUrl;
  if (safePlaybackUrl && isProgressive(safePlaybackUrl)) return safePlaybackUrl;
  if (safePlaybackUrl && !isHls(safePlaybackUrl)) return safePlaybackUrl;
  if (!blockHlsPrimary && hlsUrl) return hlsUrl;
  if (!blockHlsPrimary && safePlaybackUrl) return safePlaybackUrl;
  if (safeFileUrl) return safeFileUrl;
  // Last resort: HLS even without duration (nothing else to play)
  if (hlsUrl) return hlsUrl;
  if (safePlaybackUrl) return safePlaybackUrl;
  return null;
};

/** Hint for expo-video VideoSource.contentType */
export const getVideoSourceContentType = (
  url: string | null | undefined,
  mimeHint?: string | null
): "hls" | "progressive" | undefined => {
  if (!url) return undefined;
  if (/\.m3u8(\?|#|$)/i.test(url)) return "hls";
  if (/\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url)) return "progressive";
  const mime = String(mimeHint || "").toLowerCase();
  if (mime.startsWith("video/") || mime === "videos" || mime === "video") {
    return "progressive";
  }
  return undefined;
};

export function isHlsVideoUrl(url: string | null | undefined): boolean {
  return getVideoSourceContentType(url) === "hls";
}

function playerErrorText(error: unknown): string {
  const chunks: string[] = [];
  const walk = (value: unknown, depth: number) => {
    if (value == null || depth > 5) return;
    if (typeof value === "string" || typeof value === "number") {
      chunks.push(String(value));
      return;
    }
    if (typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    for (const key of [
      "message",
      "code",
      "domain",
      "localizedDescription",
      "name",
    ]) {
      if (obj[key] != null) chunks.push(String(obj[key]));
    }
    if ("error" in obj) walk(obj.error, depth + 1);
  };
  walk(error, 0);
  return chunks.join(" ");
}

/**
 * iOS throws ExpoVideo.VideoCacheUnsupported for HLS (and some CDNs) when
 * `useCaching` is true — the player never loads, so the reel stays black.
 */
export function isVideoCacheUnsupportedError(error: unknown): boolean {
  return /VideoCacheUnsupported/i.test(playerErrorText(error));
}

/**
 * 404 / damaged `expo-video-cache` entries: retry without cache (and after
 * undoubling the path) instead of tearing down the VideoView.
 */
export function isRetryableVideoSourceError(error: unknown): boolean {
  if (isVideoCacheUnsupportedError(error)) return true;
  return /requested URL was not found|File Not Found|HTTP 404|Code=-1100|media may be damaged|expo-video-cache/i.test(
    playerErrorText(error)
  );
}

export type ExpoFeedVideoSource = {
  uri: string;
  useCaching: boolean;
  contentType?: "hls" | "progressive";
};

/**
 * Build an expo-video source. Never cache HLS on iOS — that throws
 * VideoCacheUnsupported and the item fails to load.
 */
export function toExpoVideoSource(
  uri: string | null | undefined,
  options?: { useCaching?: boolean; mimeHint?: string | null }
): ExpoFeedVideoSource | null {
  if (!uri) return null;
  const normalized = fixOverEncodedMediaUrl(uri);
  const contentType = getVideoSourceContentType(normalized, options?.mimeHint);
  const wantCache = options?.useCaching !== false;
  const useCaching = wantCache && contentType !== "hls";
  return contentType
    ? { uri: normalized, useCaching, contentType }
    : { uri: normalized, useCaching };
}


/**
 * Gets the best URL to use for video playback
 */
export const getBestVideoUrl = (originalUrl: string, fallbackUrl?: string): string => {
  const fallback = fallbackUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.trim() === '') {
    console.warn("⚠️ Empty original URL, using fallback");
    return fallback;
  }

  const normalizedUrl = fixOverEncodedMediaUrl(originalUrl.trim());

  // Handle local file URLs (downloaded content) - return immediately without validation
  if (normalizedUrl.startsWith('file://') || normalizedUrl.startsWith('/')) {
    urlLog(`📁 Using local file URL: ${normalizedUrl.substring(0, 100)}...`);
    return normalizedUrl;
  }

  const urlInfo = analyzeVideoUrl(normalizedUrl);

  // If it's a signed URL, use the converted version
  if (urlInfo.isSignedUrl) {
    if (urlInfo.isExpired) {
      console.warn(`⚠️ Signed URL appears expired: ${normalizedUrl.substring(0, 100)}...`);
      urlLog(`🔧 Using converted URL: ${urlInfo.convertedUrl.substring(0, 100)}...`);
      return urlInfo.convertedUrl;
    }
    // Signed URL is valid and NOT expired - use it as is!
    return normalizedUrl;
  }

  // If it's already a public URL, use it
  if (urlInfo.isValid) {
    return normalizedUrl;
  }

  // If invalid, use fallback
  console.warn(`⚠️ Invalid URL, using fallback: ${normalizedUrl}`);
  return fallback;
};

/**
 * Enhanced error handler for video loading errors
 */
export const handleVideoError = (error: any, videoUrl: string, videoTitle: string) => {
  const urlInfo = analyzeVideoUrl(videoUrl);

  if (isRetryableVideoSourceError(error)) {
    return {
      isRetryable: true,
      suggestedUrl: fixOverEncodedMediaUrl(videoUrl),
      errorType: isVideoCacheUnsupportedError(error)
        ? "cache_unsupported"
        : "source_unavailable",
    };
  }

  console.error(`❌ Video error for ${videoTitle}:`, {
    error: error,
    errorCode: error?.error?.code,
    errorDomain: error?.error?.domain,
    errorDescription: error?.error?.localizedDescription,
    urlInfo: urlInfo,
    isSignedUrl: urlInfo.isSignedUrl,
    isExpired: urlInfo.isExpired,
    convertedUrl: urlInfo.convertedUrl,
  });

  // Provide specific guidance based on error type
  if (error?.error?.code === -1001 || error?.error?.domain === 'NSURLErrorDomain') {
    if (urlInfo.isSignedUrl) {
      urlLog(`💡 Root cause identified: Expired signed URL`);
      urlLog(`🔧 Solution: Use converted URL: ${urlInfo.convertedUrl}`);
      urlLog(`📋 Backend fix needed: Provide public URLs instead of signed URLs`);
    } else {
      urlLog(`💡 Root cause: Network timeout with public URL`);
      urlLog(`🔧 Solution: Check network connectivity or server status`);
    }
  }

  return {
    isRetryable: urlInfo.isSignedUrl && urlInfo.isExpired,
    suggestedUrl: urlInfo.convertedUrl,
    errorType: urlInfo.isSignedUrl ? 'expired_signed_url' : 'network_error'
  };
};


