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

    // Basic URL validation
    result.isValid = url.startsWith('http://') || url.startsWith('https://');
    
    if (!result.isValid) {
      result.error = 'Invalid URL format';
    }

  } catch (error) {
    result.error = `URL parsing error: ${error}`;
  }

  return result;
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

  const urlInfo = analyzeVideoUrl(originalUrl);
  
  // If it's a signed URL, use the converted version
  if (urlInfo.isSignedUrl) {
    if (urlInfo.isExpired) {
      console.warn(`⚠️ Signed URL appears expired: ${originalUrl.substring(0, 100)}...`);
      console.log(`🔧 Using converted URL: ${urlInfo.convertedUrl.substring(0, 100)}...`);
    }
    return urlInfo.convertedUrl;
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

