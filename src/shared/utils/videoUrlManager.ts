/**
 * Universal Video URL Manager
 * Handles signed URL conversion and error detection
 */

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
 * ⚠️ WARNING: Only use this if your S3 bucket is public. 
 * For private buckets, the signed URL must be used as-is.
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
    
    console.log(`🔗 URL Conversion: ${signedUrl.substring(0, 100)}... → ${publicUrl.substring(0, 100)}...`);
    
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

  // Handle local file URLs - they're valid but don't need URL parsing
  if (url.startsWith('file://') || url.startsWith('/')) {
    result.isValid = true;
    result.convertedUrl = url;
    return result;
  }

  try {
    const urlObj = new URL(url);
    
    // Check if it's a signed URL
    result.isSignedUrl = urlObj.searchParams.has('X-Amz-Algorithm');
    
    if (result.isSignedUrl) {
      result.convertedUrl = convertSignedToPublicUrl(url);
      
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
    result.isValid = url.startsWith('http://') || 
                     url.startsWith('https://') || 
                     url.startsWith('file://') ||
                     url.startsWith('/'); // Support absolute paths
    
    if (!result.isValid) {
      result.error = 'Invalid URL format';
    }

  } catch (error) {
    result.error = `URL parsing error: ${error}`;
  }

  return result;
};

/**
 * Gets video URL from media item with proper fallback priority:
 * fileUrl > playbackUrl > hlsUrl
 * NEVER use thumbnailUrl or imageUrl for video playback!
 */
export const getVideoUrlFromMedia = (media: any): string | null => {
  // Priority order: fileUrl > playbackUrl > hlsUrl
  const videoUrl = media?.fileUrl || media?.playbackUrl || media?.hlsUrl;
  
  if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.trim() === '') {
    return null;
  }
  
  return videoUrl.trim();
};

// ✅ PERFORMANCE HACK: Cache converted URLs to prevent re-processing
const urlCache = new Map<string, string>();
const CACHE_MAX_SIZE = 1000; // Limit cache size to prevent memory issues

/**
 * Gets the best URL to use for video playback
 * ✅ CRITICAL FIX: Preserves signed URLs for private S3 buckets
 * Only converts to public URL if explicitly needed (public bucket)
 */
export const getBestVideoUrl = (originalUrl: string, fallbackUrl?: string): string => {
  const fallback = fallbackUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  
  if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.trim() === '') {
    console.warn("⚠️ Empty original URL, using fallback");
    return fallback;
  }

  // ✅ Check cache first for instant response
  if (urlCache.has(originalUrl)) {
    return urlCache.get(originalUrl)!;
  }

  // Handle local file URLs (downloaded content) - return immediately without validation
  if (originalUrl.startsWith('file://') || originalUrl.startsWith('/')) {
    console.log(`📁 Using local file URL: ${originalUrl.substring(0, 100)}...`);
    urlCache.set(originalUrl, originalUrl);
    return originalUrl;
  }

  const urlInfo = analyzeVideoUrl(originalUrl);
  let bestUrl: string;
  
  // ✅ CRITICAL FIX: For private S3 buckets, use signed URLs as-is
  // Converting signed URLs to public URLs causes "403 Forbidden" or "Too Many Requests"
  // because the bucket requires authentication
  if (urlInfo.isSignedUrl) {
    // Check if URL is expired - if so, we'll still try it but log a warning
    if (urlInfo.isExpired) {
      console.warn(`⚠️ Signed URL may be expired: ${originalUrl.substring(0, 100)}...`);
      console.warn(`💡 Backend should provide fresh signed URLs`);
    }
    // Use the signed URL as-is - don't strip parameters for private buckets
    bestUrl = originalUrl;
  } else if (urlInfo.isValid) {
    // If it's already a public URL, use it
    bestUrl = originalUrl;
  } else {
    // If invalid, use fallback
    console.warn(`⚠️ Invalid URL, using fallback: ${originalUrl}`);
    bestUrl = fallback;
  }

  // ✅ Cache the result for future use (prevents re-processing)
  if (urlCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest entry (simple FIFO)
    const firstKey = urlCache.keys().next().value;
    if (firstKey) {
      urlCache.delete(firstKey);
    }
  }
  urlCache.set(originalUrl, bestUrl);

  return bestUrl;
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
      console.log(`💡 Root cause identified: Expired signed URL`);
      console.log(`🔧 Solution: Use converted URL: ${urlInfo.convertedUrl}`);
      console.log(`📋 Backend fix needed: Provide public URLs instead of signed URLs`);
    } else {
      console.log(`💡 Root cause: Network timeout with public URL`);
      console.log(`🔧 Solution: Check network connectivity or server status`);
    }
  }

  return {
    isRetryable: urlInfo.isSignedUrl && urlInfo.isExpired,
    suggestedUrl: urlInfo.convertedUrl,
    errorType: urlInfo.isSignedUrl ? 'expired_signed_url' : 'network_error'
  };
};


