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
    const url = new URL(signedUrl);

    // Check if it's a signed URL
    const isSignedUrl = url.searchParams.has('X-Amz-Algorithm');

    if (!isSignedUrl) {
      return signedUrl; // Already a public URL
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

export const getVideoUrlFromMedia = (media: any): string | null => {
  const fileUrl =
    typeof media?.fileUrl === "string" ? media.fileUrl.trim() : "";
  const playbackUrl =
    typeof media?.playbackUrl === "string" ? media.playbackUrl.trim() : "";
  const hlsUrl = typeof media?.hlsUrl === "string" ? media.hlsUrl.trim() : "";

  const mime = String(
    media?.fileMimeType || media?.mimeType || media?.contentType || ""
  ).toLowerCase();
  const looksLikeVideoMime =
    mime.startsWith("video/") ||
    mime === "videos" ||
    mime === "video" ||
    mime.includes("sermon");

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
      (looksLikeVideoMime && u === fileUrl));

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
  if (preferHlsLite && !blockHlsPrimary && playbackUrl && isHls(playbackUrl)) {
    return playbackUrl;
  }

  // Prefer progressive faststart MP4 (fileUrl / non-HLS playbackUrl) for seek.
  // HLS is fallback only when no MP4 — and never when duration is still unknown
  // on a ready card (incomplete playlist → player.duration=0 → seek broken).
  if (fileUrl && isProgressive(fileUrl)) return fileUrl;
  if (fileUrl && looksLikeVideoMime && !isHls(fileUrl)) return fileUrl;
  if (playbackUrl && isProgressive(playbackUrl)) return playbackUrl;
  if (playbackUrl && !isHls(playbackUrl)) return playbackUrl;
  if (!blockHlsPrimary && hlsUrl) return hlsUrl;
  if (!blockHlsPrimary && playbackUrl) return playbackUrl;
  if (fileUrl) return fileUrl;
  // Last resort: HLS even without duration (nothing else to play)
  if (hlsUrl) return hlsUrl;
  if (playbackUrl) return playbackUrl;
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


/**
 * Gets the best URL to use for video playback
 */
export const getBestVideoUrl = (originalUrl: string, fallbackUrl?: string): string => {
  const fallback = fallbackUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.trim() === '') {
    console.warn("⚠️ Empty original URL, using fallback");
    return fallback;
  }

  // Handle local file URLs (downloaded content) - return immediately without validation
  if (originalUrl.startsWith('file://') || originalUrl.startsWith('/')) {
    urlLog(`📁 Using local file URL: ${originalUrl.substring(0, 100)}...`);
    return originalUrl;
  }

  const urlInfo = analyzeVideoUrl(originalUrl);

  // If it's a signed URL, use the converted version
  if (urlInfo.isSignedUrl) {
    if (urlInfo.isExpired) {
      console.warn(`⚠️ Signed URL appears expired: ${originalUrl.substring(0, 100)}...`);
      urlLog(`🔧 Using converted URL: ${urlInfo.convertedUrl.substring(0, 100)}...`);
      return urlInfo.convertedUrl;
    }
    // Signed URL is valid and NOT expired - use it as is!
    return originalUrl;
  }

  // If it's already a public URL, use it
  if (urlInfo.isValid) {
    return originalUrl;
  }

  // If invalid, use fallback
  console.warn(`⚠️ Invalid URL, using fallback: ${originalUrl}`);
  return fallback;
};

/**
 * Enhanced error handler for video loading errors
 */
export const handleVideoError = (error: any, videoUrl: string, videoTitle: string) => {
  const urlInfo = analyzeVideoUrl(videoUrl);

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


