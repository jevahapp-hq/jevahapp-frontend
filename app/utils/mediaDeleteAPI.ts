// Media Deletion API Service
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiBaseUrl } from "./api";

export interface DeleteMediaResponse {
  success: boolean;
  message: string;
}

export interface DeleteMediaError {
  success: false;
  message: string;
}

// Track successfully deleted media IDs to suppress redundant 404 errors
const successfullyDeletedIds = new Set<string>();

// Clean up old IDs after 5 minutes (media might be re-uploaded with same ID)
setInterval(() => {
  successfullyDeletedIds.clear();
}, 5 * 60 * 1000);

/**
 * Delete a media item
 * @param mediaId - The ID of the media item to delete
 * @returns Promise with deletion result
 * @throws Error if deletion fails or user is not authorized
 */
export const deleteMedia = async (
  mediaId: string
): Promise<DeleteMediaResponse> => {
  // 1. Get authentication token - use same method as upload
  // Check in same order as upload: userToken -> token -> jwt
  let token = await AsyncStorage.getItem("userToken");
  if (!token) {
    token = await AsyncStorage.getItem("token");
  }
  if (!token) {
    try {
      const { default: SecureStore } = await import("expo-secure-store");
      token = await SecureStore.getItemAsync("jwt");
    } catch (secureStoreError) {
      // Silent fallback
    }
  }
  
  if (!token) {
    throw new Error("Please log in to delete media.");
  }

  // 2. Validate mediaId format (MongoDB ObjectId is 24 hex characters)
  if (!mediaId || typeof mediaId !== "string") {
    throw new Error("Invalid media ID");
  }
  
  // Validate ObjectId format
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  if (!objectIdPattern.test(mediaId.trim())) {
    console.error("❌ Invalid media ID format:", {
      mediaId,
      length: mediaId.length,
      pattern: objectIdPattern.test(mediaId.trim()),
    });
    throw new Error("Invalid media ID format. Please try again.");
  }
  
  // Trim the ID to ensure no whitespace
  const trimmedMediaId = mediaId.trim();

  // 3. Get API base URL and construct full URL
  const baseURL = getApiBaseUrl();
  const fullURL = `${baseURL}/api/media/${trimmedMediaId}`;
  
  // Log token info for debugging
  console.log("🗑️ Delete request token info:", {
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token ? `${token.substring(0, 20)}...` : "none",
    mediaId: trimmedMediaId,
    mediaIdLength: trimmedMediaId.length,
    fullURL,
  });
  
  // 4. Make DELETE request - simple and direct (same as upload)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(fullURL, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Log full response for debugging
    console.log("📥 Delete response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });
    
    // Parse response
    let data: any;
    try {
      const text = await response.text();
      console.log("📥 Delete response text:", text);
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("❌ Failed to parse delete response:", parseError);
      throw new Error("Invalid response from server");
    }

    // Check if successful
    if (response.ok && data.success) {
      // Track this as successfully deleted to suppress future 404 errors
      successfullyDeletedIds.add(trimmedMediaId);
      console.log("✅ Delete successful:", data);
      return {
        success: true,
        message: data.message || "Media deleted successfully",
      };
    }
    
    // Handle errors - log full error details
    const errorMessage = data.message || data.error || "Failed to delete media";
    console.error("❌ Delete failed - full error:", {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      fullResponse: data,
      tokenWasSent: !!token,
      tokenLength: token?.length,
    });
    
    if (response.status === 401) {
      // Log what token was sent vs what backend expects
      console.error("❌ 401 Unauthorized - Backend rejected token:", {
        tokenPreview: token ? `${token.substring(0, 30)}...` : "none",
        tokenLength: token?.length,
        backendMessage: errorMessage,
        fullResponse: data,
      });
      throw new Error(errorMessage || "Your session has expired. Please log in again.");
    }
    
    if (response.status === 403) {
      throw new Error(errorMessage || "You don't have permission to delete this media.");
    }
    
    if (response.status === 404) {
      // If we just successfully deleted this media, suppress the error (it's expected)
      if (successfullyDeletedIds.has(trimmedMediaId)) {
        console.log("✅ Media already deleted successfully (suppressing redundant 404)");
        return {
          success: true,
          message: "Media deleted successfully",
        };
      }
      
      // Log detailed info for debugging (only if it's a real error)
      console.error("❌ 404 Media not found:", {
        mediaId: trimmedMediaId,
        originalMediaId: mediaId,
        fullURL,
        backendMessage: errorMessage,
        fullResponse: data,
      });
      throw new Error(errorMessage || "Media not found. It may have already been deleted or the ID is incorrect.");
    }
    
    throw new Error(errorMessage);
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Handle network errors
    if (error.name === 'AbortError') {
      throw new Error("Request timed out. Please try again.");
    }
    
    if (error.message?.includes('Network') || error.message === 'Network request failed') {
      throw new Error("Network error. Please check your connection and try again.");
    }
    
    // Re-throw if it's already a formatted error
    if (error.message) {
    throw error;
    }
    
    throw new Error("Failed to delete media. Please try again.");
  }
};

/**
 * Check if current user is the owner of the media
 * @param uploadedBy - The user ID, user object, or full name who uploaded the media
 * @param mediaItem - Optional media item to check additional fields like authorInfo
 * @returns Promise<boolean> - True if current user is likely the owner (backend will verify)
 */
export const isMediaOwner = async (
  uploadedBy: string | { _id: string } | undefined,
  mediaItem?: any
): Promise<boolean> => {
  try {
    // Get current user ID using all known fields & sources
    const userStr = await AsyncStorage.getItem("user");
    let currentUserId = "";
    let user: any = null;

    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        console.warn("⚠️ isMediaOwner: Failed to parse user from AsyncStorage", e);
      }
    }

    // Try multiple possible user ID fields on the stored user object
    if (user) {
      currentUserId = String(
        user._id ||
          user.id ||
          user.userId ||
          user.userID || // defensive for alternate casing
          (user.profile && (user.profile._id || user.profile.id)) ||
          ""
      ).trim();
    }

    // Fallback: if still no ID but we have a token, try to extract user ID from JWT token
    if (!currentUserId) {
      const token =
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("token")) ||
        null;

      if (!token) {
        console.log("❌ isMediaOwner: No current user ID or auth token found", {
          user,
          userKeys: user ? Object.keys(user) : [],
        });
        return false;
      }

      // Try to extract userId from JWT token
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.userId || payload.user_id || payload.id) {
            currentUserId = String(payload.userId || payload.user_id || payload.id).trim();
            console.log("✅ Extracted user ID from JWT token:", currentUserId);
          }
        }
      } catch (tokenError) {
        console.warn("⚠️ Failed to extract user ID from token:", tokenError);
      }

      // If still no ID, log warning but continue (backend will verify)
      if (!currentUserId) {
        console.log(
          "⚠️ isMediaOwner: No explicit user ID found, but token exists – trusting frontend ownership check and deferring final check to backend.",
          {
            user,
            userKeys: user ? Object.keys(user) : [],
            hasToken: !!token,
          }
        );
        // Return true to show delete option - backend will verify actual ownership
        return true;
      }
    }

    if (
      !uploadedBy &&
      !mediaItem?.authorInfo?._id &&
      !mediaItem?.author?._id &&
      !mediaItem?.uploadedBy
    ) {
      console.log("❌ isMediaOwner: No uploadedBy or author info provided");
      return false;
    }

    // Extract uploadedBy ID - handle multiple formats
    // Priority order matches backend structure:
    // 1. uploadedBy._id (populated object) - for Media content
    // 2. uploadedBy (direct string/ObjectId) - if not populated
    // 3. author._id - for Devotional content
    // 4. authorInfo._id - fallback for other content types
    let uploadedById: string = "";
    
    // Priority 1: uploadedBy object (populated) with _id - BACKEND RETURNS THIS FOR MEDIA
    if (
      mediaItem?.uploadedBy &&
      typeof mediaItem.uploadedBy === "object" &&
      (mediaItem.uploadedBy._id || mediaItem.uploadedBy.id)
    ) {
      uploadedById = String(
        mediaItem.uploadedBy._id || mediaItem.uploadedBy.id
      ).trim();
    }
    // Priority 2: uploadedBy parameter as object with _id
    else if (uploadedBy && typeof uploadedBy === "object" && (uploadedBy._id || uploadedBy.id)) {
      uploadedById = String(uploadedBy._id || uploadedBy.id || uploadedBy.userId || "").trim();
    }
    // Priority 3: uploadedBy as direct ObjectId string
    else if (typeof uploadedBy === "string") {
      const trimmed = String(uploadedBy).trim();
      // ObjectId format: 24 hex characters
      if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        uploadedById = trimmed;
      } else {
        // It's likely a full name, so we can't reliably check ownership
        // But we'll assume ownership if user is logged in (backend will verify)
        console.log("⚠️ isMediaOwner: uploadedBy appears to be a name, not an ID:", trimmed);
        // Return true to show delete button - backend will verify actual ownership
        return true;
      }
    }
    // Priority 4: mediaItem.uploadedBy as direct string (if not populated)
    else if (mediaItem?.uploadedBy && typeof mediaItem.uploadedBy === "string") {
      const trimmed = String(mediaItem.uploadedBy).trim();
      if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
        uploadedById = trimmed;
      }
    }
    // Priority 5: author._id - for Devotional content
    else if (mediaItem?.author?._id) {
      uploadedById = String(mediaItem.author._id).trim();
    }
    // Priority 6: authorInfo._id - fallback for other content types
    else if (mediaItem?.authorInfo?._id) {
      uploadedById = String(mediaItem.authorInfo._id).trim();
    }

    if (!uploadedById) {
      console.log("❌ isMediaOwner: Could not extract uploadedBy ID", { uploadedBy, mediaItem });
      // If we can't determine, assume ownership (backend will verify)
      return true;
    }

    // Compare IDs (convert both to strings for comparison)
    const isOwner = String(currentUserId) === String(uploadedById);
    
    console.log("🔍 isMediaOwner check:", {
      currentUserId,
      uploadedById,
      isOwner,
      currentUserIdType: typeof currentUserId,
      uploadedByIdType: typeof uploadedById,
      uploadedByValue: uploadedBy,
      uploadedByType: typeof uploadedBy,
      hasUploadedByObject: !!(mediaItem?.uploadedBy && typeof mediaItem.uploadedBy === "object"),
      uploadedByObjectId: mediaItem?.uploadedBy?._id,
      hasAuthorInfo: !!mediaItem?.authorInfo,
      hasAuthor: !!mediaItem?.author,
      userObject: user ? {
        keys: Object.keys(user),
        hasId: !!(user._id || user.id || user.userId),
        idValue: user._id || user.id || user.userId,
      } : null,
    });

    return isOwner;
  } catch (error) {
    console.error("❌ Error checking media ownership:", error);
    // On error, assume ownership (backend will verify)
    return true;
  }
};

/**
 * Check if current user is an admin
 * @returns Promise<boolean> - True if current user has admin role
 */
export const isAdmin = async (): Promise<boolean> => {
  try {
    const userStr = await AsyncStorage.getItem("user");
    if (!userStr) {
      return false;
    }

    const user = JSON.parse(userStr);
    const role = user?.role || user?.userRole;
    
    // Check if role is "admin" (case-insensitive)
    return String(role).toLowerCase() === "admin";
  } catch (error) {
    console.error("❌ Error checking admin status:", error);
    return false;
  }
};

/**
 * Admin delete content endpoint - permanently delete content that violates platform rules
 * @param mediaId - The ID of the media item to delete
 * @returns Promise with deletion result
 * @throws Error if deletion fails or user is not authorized
 */
export const adminDeleteContent = async (
  mediaId: string
): Promise<DeleteMediaResponse & { data?: any }> => {
  // 1. Get authentication token
  let token = await AsyncStorage.getItem("userToken");
  if (!token) {
    token = await AsyncStorage.getItem("token");
  }
  if (!token) {
    try {
      const { default: SecureStore } = await import("expo-secure-store");
      token = await SecureStore.getItemAsync("jwt");
    } catch (secureStoreError) {
      // Silent fallback
    }
  }
  
  if (!token) {
    throw new Error("Please log in to delete content.");
  }

  // 2. Validate mediaId format (MongoDB ObjectId is 24 hex characters)
  if (!mediaId || typeof mediaId !== "string") {
    throw new Error("Invalid media ID");
  }
  
  // Validate ObjectId format
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  if (!objectIdPattern.test(mediaId.trim())) {
    console.error("❌ Invalid media ID format:", {
      mediaId,
      length: mediaId.length,
      pattern: objectIdPattern.test(mediaId.trim()),
    });
    throw new Error("Invalid media ID format. Please try again.");
  }
  
  // Trim the ID to ensure no whitespace
  const trimmedMediaId = mediaId.trim();

  // 3. Get API base URL and construct full URL for admin delete endpoint
  const baseURL = getApiBaseUrl();
  const fullURL = `${baseURL}/api/media/reports/${trimmedMediaId}/delete`;
  
  // Log token info for debugging
  console.log("🔨 Admin delete request:", {
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token ? `${token.substring(0, 20)}...` : "none",
    mediaId: trimmedMediaId,
    mediaIdLength: trimmedMediaId.length,
    fullURL,
  });
  
  // 4. Make DELETE request to admin endpoint
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(fullURL, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "expo-platform": Platform.OS,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Log full response for debugging
    console.log("📥 Admin delete response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });
    
    // Parse response
    let data: any;
    try {
      const text = await response.text();
      console.log("📥 Admin delete response text:", text);
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("❌ Failed to parse admin delete response:", parseError);
      throw new Error("Invalid response from server");
    }

    // Check if successful
    if (response.ok && data.success) {
      console.log("✅ Admin delete successful:", data);
      return {
        success: true,
        message: data.message || "Content deleted successfully",
        data: data.data,
      };
    }
    
    // Handle errors - log full error details
    const errorMessage = data.message || data.error || "Failed to delete content";
    console.error("❌ Admin delete failed - full error:", {
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      fullResponse: data,
      tokenWasSent: !!token,
      tokenLength: token?.length,
    });
    
    if (response.status === 401) {
      throw new Error(errorMessage || "Your session has expired. Please log in again.");
    }
    
    if (response.status === 403) {
      throw new Error(errorMessage || "You don't have permission to delete content. Admin access required.");
    }
    
    if (response.status === 404) {
      throw new Error(errorMessage || "Content not found. It may have already been deleted or the ID is incorrect.");
    }
    
    throw new Error(errorMessage);
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Handle network errors
    if (error.name === 'AbortError') {
      throw new Error("Request timed out. Please try again.");
    }
    
    if (error.message?.includes('Network') || error.message === 'Network request failed') {
      throw new Error("Network error. Please check your connection and try again.");
    }
    
    // Re-throw if it's already a formatted error
    if (error.message) {
      throw error;
    }
    
    throw new Error("Failed to delete content. Please try again.");
  }
};

