/**
 * Video URL Utilities
 * Handles video URL validation, refresh, and fallback mechanisms
 */

import allMediaAPI from "./allMediaAPI";

export interface VideoUrlValidationResult {
  isValid: boolean;
  url: string;
  error?: string;
  needsRefresh?: boolean;
}

/**
 * Validates if a video URL is accessible
 */
export const validateVideoUrl = async (
  url: string
): Promise<VideoUrlValidationResult> => {
  if (!url || typeof url !== "string" || !url.trim()) {
    return {
      isValid: false,
      url: "",
      error: "Empty or invalid URL",
      needsRefresh: false,
    };
  }

  const trimmedUrl = url.trim();

  // Basic URL format validation
  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
    return {
      isValid: false,
      url: trimmedUrl,
      error: "Invalid URL format",
      needsRefresh: false,
    };
  }

  try {
    // Test if URL is accessible with a HEAD request
    const response = await fetch(trimmedUrl, {
      method: "HEAD",
      timeout: 10000, // 10 second timeout
    });

    if (response.ok) {
      return {
        isValid: true,
        url: trimmedUrl,
        needsRefresh: false,
      };
    } else if (response.status === 404) {
      return {
        isValid: false,
        url: trimmedUrl,
        error: `Video not found (404)`,
        needsRefresh: true,
      };
    } else {
      return {
        isValid: false,
        url: trimmedUrl,
        error: `HTTP ${response.status}: ${response.statusText}`,
        needsRefresh: response.status >= 500, // Server errors might be temporary
      };
    }
  } catch (error) {
    console.warn(`⚠️ Video URL validation failed for ${trimmedUrl}:`, error);
    return {
      isValid: false,
      url: trimmedUrl,
      error: error instanceof Error ? error.message : "Network error",
      needsRefresh: true,
    };
  }
};

/**
 * Attempts to refresh a video URL by fetching fresh data from the API
 */
export const refreshVideoUrl = async (
  contentId: string
): Promise<string | null> => {
  try {
    console.log(`🔄 Attempting to refresh video URL for content: ${contentId}`);

    // Try to get fresh content data from the API
    const response = await allMediaAPI.getDefaultContent({
      page: 1,
      limit: 100, // Get more items to find our content
    });

    if (response.success && response.data.content) {
      // Find the specific content item
      const contentItem = response.data.content.find(
        (item: any) => item._id === contentId
      );

      if (contentItem && contentItem.mediaUrl) {
        console.log(
          `✅ Found refreshed URL for ${contentId}: ${contentItem.mediaUrl}`
        );
        return contentItem.mediaUrl;
      }
    }

    console.warn(`⚠️ Could not refresh URL for content: ${contentId}`);
    return null;
  } catch (error) {
    console.error(`❌ Failed to refresh video URL for ${contentId}:`, error);
    return null;
  }
};

/**
 * Gets a safe video URL with fallback mechanisms
 */
export const getSafeVideoUrl = async (
  originalUrl: string,
  contentId?: string,
  maxRetries: number = 2
): Promise<string> => {
  const fallbackUrl =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  if (!originalUrl || typeof originalUrl !== "string" || !originalUrl.trim()) {
    console.warn("⚠️ Empty or invalid original URL, using fallback");
    return fallbackUrl;
  }

  const trimmedUrl = originalUrl.trim();

  // First, validate the original URL
  const validation = await validateVideoUrl(trimmedUrl);

  if (validation.isValid) {
    console.log(`✅ Video URL is valid: ${trimmedUrl}`);
    return trimmedUrl;
  }

  console.warn(`⚠️ Video URL validation failed: ${validation.error}`);

  // If URL needs refresh and we have a content ID, try to refresh
  if (validation.needsRefresh && contentId && maxRetries > 0) {
    console.log(`🔄 Attempting to refresh URL for content: ${contentId}`);
    const refreshedUrl = await refreshVideoUrl(contentId);

    if (refreshedUrl && refreshedUrl !== trimmedUrl) {
      // Validate the refreshed URL
      const refreshedValidation = await validateVideoUrl(refreshedUrl);
      if (refreshedValidation.isValid) {
        console.log(
          `✅ Successfully refreshed and validated URL: ${refreshedUrl}`
        );
        return refreshedUrl;
      }
    }
  }

  // If all else fails, return fallback
  console.warn(
    `⚠️ Using fallback video URL for content: ${contentId || "unknown"}`
  );
  return fallbackUrl;
};

/**
 * Creates a safe video source object for React Native Video component
 */
export const createSafeVideoSource = async (
  uri: string | null | undefined,
  contentId?: string,
  fallback?: string
): Promise<{ uri: string }> => {
  const defaultFallback =
    fallback ||
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  if (!uri || typeof uri !== "string" || !uri.trim()) {
    return { uri: defaultFallback };
  }

  try {
    const safeUrl = await getSafeVideoUrl(uri, contentId);
    return { uri: safeUrl };
  } catch (error) {
    console.error("❌ Error creating safe video source:", error);
    return { uri: defaultFallback };
  }
};

/**
 * Batch validates multiple video URLs
 */
export const validateMultipleVideoUrls = async (
  urls: string[]
): Promise<VideoUrlValidationResult[]> => {
  const validationPromises = urls.map((url) => validateVideoUrl(url));
  return Promise.all(validationPromises);
};

/**
 * Checks if a URL is a Cloudflare R2 URL (common pattern for this app)
 */
export const isCloudflareR2Url = (url: string): boolean => {
  return url.includes("r2.cloudflarestorage.com") || url.includes("cloudflare");
};

/**
 * Extracts content ID from a Cloudflare R2 URL (if possible)
 */
export const extractContentIdFromUrl = (url: string): string | null => {
  try {
    // This is a basic implementation - adjust based on your URL structure
    const urlParts = url.split("/");
    const fileName = urlParts[urlParts.length - 1];
    if (fileName && fileName.includes(".")) {
      return fileName.split(".")[0];
    }
    return null;
  } catch {
    return null;
  }
};
